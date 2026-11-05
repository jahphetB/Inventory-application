import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../db/migrate.js";

const enabled = process.env.INVENTORY_DATABASE_TESTS === "true";
const options = { skip: !enabled };

async function withSchema(callback) {
	assert.ok(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST));
	const client = new pg.Client({ connectionTimeoutMillis: 5000 });
	const schema = `inventory_migration_test_${randomBytes(8).toString("hex")}`;
	const quoted = pg.escapeIdentifier(schema);
	let created = false;
	try {
		await client.connect();
		await client.query(`CREATE SCHEMA ${quoted}`);
		created = true;
		await client.query(`SET search_path TO ${quoted}`);
		await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
		await callback(client);
	} finally {
		if (created) {
			await client.query("ROLLBACK");
			await client.query("SET search_path TO public");
			assert.match(schema, /^inventory_migration_test_[a-f0-9]{16}$/);
			await client.query(`DROP SCHEMA ${quoted} CASCADE`);
		}
		await client.end();
	}
}

test("migrations are repeatable and create exactly five immutable families", options, async () => {
	await withSchema(async (client) => {
		const first = await runMigrations(client);
		assert.ok(first.applied.length >= 1);
		assert.deepEqual((await client.query("SELECT id, name FROM families ORDER BY id")).rows, [
			{ id: 1, name: "Idiophones" }, { id: 2, name: "Membranophones" },
			{ id: 3, name: "Chordophones" }, { id: 4, name: "Aerophones" }, { id: 5, name: "Electrophones" },
		]);
		const second = await runMigrations(client);
		assert.equal(second.applied.length, 0);
		assert.equal(second.skipped.length, first.applied.length);
		for (const sql of ["INSERT INTO families VALUES (6, 'other', 'Other')", "UPDATE families SET name = 'Changed' WHERE id = 1", "DELETE FROM families WHERE id = 1", "TRUNCATE families CASCADE"]) {
			await assert.rejects(client.query(sql), (error) => error.code === "23514" && error.constraint === "fixed_instrument_families");
		}
		assert.equal((await client.query("SELECT COUNT(*)::int AS count FROM families")).rows[0].count, 5);
	});
});

test("category foreign keys reject invalid families while the compatibility bridge permits null", options, async () => {
	await withSchema(async (client) => {
		await runMigrations(client);
		await assert.rejects(client.query("INSERT INTO categories (name, family_id) VALUES ('Invalid family', 99)"), (error) => error.code === "23503");
		await client.query("INSERT INTO categories (name) VALUES ('Legacy form compatibility')");
		assert.equal((await client.query("SELECT family_id FROM categories")).rows[0].family_id, null);
	});
});

test("a failed batch rolls back its DDL and migration records together", options, async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "inventory-migration-fixture-"));
	try {
		await writeFile(path.join(directory, "001_probe.sql"), "CREATE TABLE migration_probe (id INTEGER);\n");
		await writeFile(path.join(directory, "002_failure.sql"), "SELECT * FROM deliberately_missing_migration_table;\n");
		await withSchema(async (client) => {
			await assert.rejects(runMigrations(client, { directory }), (error) => error.code === "42P01");
			assert.equal((await client.query("SELECT to_regclass('migration_probe') AS probe, to_regclass('schema_migrations') AS migrations")).rows[0].probe, null);
			assert.equal((await client.query("SELECT to_regclass('schema_migrations') AS migrations")).rows[0].migrations, null);
		});
	} finally {
		assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
		await rm(directory, { recursive: true });
	}
});

test("Windows line endings do not change checksums, but edited SQL is rejected", options, async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "inventory-migration-fixture-"));
	try {
		const filename = path.join(directory, "001_probe.sql");
		await writeFile(filename, "CREATE TABLE migration_probe (id INTEGER);\n");
		await withSchema(async (client) => {
			await runMigrations(client, { directory });
			await writeFile(filename, "CREATE TABLE migration_probe (id INTEGER);\r\n");
			assert.equal((await runMigrations(client, { directory })).applied.length, 0);
			await writeFile(filename, "CREATE TABLE migration_probe (id INTEGER, changed TEXT);\n");
			await assert.rejects(runMigrations(client, { directory }), /Migration changed after being applied/);
		});
	} finally {
		assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
		await rm(directory, { recursive: true });
	}
});

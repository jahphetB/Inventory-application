import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../db/migrate.js";
import { runWithDatabase } from "../db/pool.js";
import { getFamiliesWithCounts, getFamilyBySlug, getCategoriesByFamilyId, getUnmappedCategories } from "../db/queries.js";

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

test("approved category mapping preserves item records, category IDs, and global Uncategorized", options, async () => {
	await withSchema(async (client) => {
		await client.query("INSERT INTO categories (name, description) VALUES ('Guitars', 'Preserve guitar description'), ('Keyboards', 'Preserve keyboard description'), ('Drums', 'Preserve drum description')");
		await client.query(`INSERT INTO items (name, brand, description, price, stock_quantity, category_id) VALUES
			('Player Stratocaster', 'Fender', 'Keep this', 799.99, 5, 1),
			('F310 Acoustic Guitar', 'Yamaha', NULL, 199.99, 0, 1),
			('P-145 Digital Piano', 'Yamaha', 'Keep this too', 499.99, 3, 2),
			('Student Violin', 'Stentor', NULL, 149.99, 2, NULL)`);
		const originalItems = (await client.query("SELECT * FROM items ORDER BY id")).rows;
		const originalCategories = (await client.query("SELECT * FROM categories ORDER BY id")).rows;
		await runMigrations(client);
		assert.deepEqual((await client.query("SELECT * FROM items ORDER BY id")).rows, originalItems);
		const mapped = (await client.query("SELECT * FROM categories ORDER BY id")).rows;
		assert.deepEqual(mapped.map(({ family_id, ...row }) => row), originalCategories.map((row) => ({ ...row, name: row.name === "Keyboards" ? "Digital pianos" : row.name })));
		assert.deepEqual(mapped.map((row) => row.family_id), [3, 5, 2]);
		await runWithDatabase(client, async () => {
			assert.equal((await getFamilyBySlug("chordophones")).id, 3);
			assert.equal(await getFamilyBySlug("not-a-family"), undefined);
			assert.equal(await getFamilyBySlug("chordophones' OR '1'='1"), undefined);
			assert.deepEqual(await getUnmappedCategories(), []);
			assert.deepEqual((await getCategoriesByFamilyId(3)).map(({ name, item_count }) => ({ name, item_count })), [{ name: "Guitars", item_count: 2 }]);
			const counts = await getFamiliesWithCounts();
			assert.deepEqual(counts.map((row) => row.name), ["Aerophones", "Chordophones", "Electrophones", "Idiophones", "Membranophones"]);
			assert.equal(counts.find((row) => row.id === 3).category_count, 1);
			assert.equal(counts.find((row) => row.id === 3).item_count, 2);
			assert.equal(counts.reduce((sum, row) => sum + row.item_count, 0), 3);
		});
		await runMigrations(client);
		assert.deepEqual((await client.query("SELECT * FROM items ORDER BY id")).rows, originalItems);
	});
});

test("unmapped categories and ambiguous keyboards stop the batch without changing existing data", options, async () => {
	for (const entry of [
		{ name: "Unknown category", item: null, pattern: /Unmapped categories/ },
		{ name: "Keyboards", item: ["Acoustic Piano", "Example"], pattern: /Review the existing Keyboards/ },
	]) {
		await withSchema(async (client) => {
			await client.query("INSERT INTO categories (name) VALUES ($1)", [entry.name]);
			if (entry.item) await client.query("INSERT INTO items (name, brand, price, category_id) VALUES ($1, $2, 10, 1)", entry.item);
			const before = (await client.query("SELECT * FROM categories")).rows;
			await assert.rejects(runMigrations(client), entry.pattern);
			assert.deepEqual((await client.query("SELECT * FROM categories")).rows, before);
			assert.equal((await client.query("SELECT to_regclass('families') AS families")).rows[0].families, null);
		});
	}
});

test("a Digital pianos name collision is reported rather than merged or deleted", options, async () => {
	await withSchema(async (client) => {
		await client.query("INSERT INTO categories (name) VALUES ('Keyboards'), ('Digital pianos')");
		await assert.rejects(runMigrations(client), /both exist/);
		assert.equal((await client.query("SELECT COUNT(*)::int AS count FROM categories")).rows[0].count, 2);
	});
});

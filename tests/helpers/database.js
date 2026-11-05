import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

export async function withSchema(callback) {
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
		await client.query(await readFile(new URL("../../db/schema.sql", import.meta.url), "utf8"));
		await callback(client, schema);
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

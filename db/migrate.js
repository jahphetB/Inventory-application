import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

export async function runMigrations(client, { directory = migrationDirectory } = {}) {
	const filenames = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
	const migrations = [];
	for (const name of filenames) {
		if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(name)) {
			throw new Error(`Invalid migration filename: ${name}`);
		}
		const sql = (await readFile(path.join(directory, name), "utf8")).replace(/\r\n/g, "\n");
		migrations.push({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });
	}

	const result = { applied: [], skipped: [] };
	await client.query("BEGIN");
	try {
		// Serialize migration runners until this transaction commits or rolls back.
		await client.query("SELECT pg_advisory_xact_lock(47291, 1)");
		await client.query(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				name TEXT PRIMARY KEY,
				checksum TEXT NOT NULL CHECK (LENGTH(checksum) = 64),
				applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			);
		`);
		const applied = new Map((await client.query("SELECT name, checksum FROM schema_migrations")).rows.map((row) => [row.name, row.checksum]));
		for (const name of applied.keys()) {
			if (!filenames.includes(name)) throw new Error(`Applied migration is missing from this checkout: ${name}`);
		}
		for (const migration of migrations) {
			if (applied.has(migration.name)) {
				if (applied.get(migration.name) !== migration.checksum) {
					throw new Error(`Migration changed after being applied: ${migration.name}`);
				}
				result.skipped.push(migration.name);
				continue;
			}
			await client.query(migration.sql);
			await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [migration.name, migration.checksum]);
			result.applied.push(migration.name);
		}
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}

import pool from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
let client;

try {
	if (!localHosts.has(process.env.PGHOST || "localhost") && !process.argv.includes("--allow-remote")) {
		throw new Error("Remote migrations require an explicitly approved target and --allow-remote.");
	}
	client = await pool.connect();
	const result = await runMigrations(client);
	for (const name of result.applied) console.log(`Applied: ${name}`);
	console.log(`Migrations complete: ${result.applied.length} applied, ${result.skipped.length} already applied.`);
} catch (error) {
	console.error("Migration failed:", error.message);
	process.exitCode = 1;
} finally {
	client?.release();
	await pool.end();
}

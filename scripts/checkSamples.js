import pool from "../db/pool.js";
import catalog from "../data/sampleCatalog/index.js";
import { inspectSampleCatalog } from "../db/inspectSampleCatalog.js";

let client;
try {
	client = await pool.connect();
	await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
	const report = await inspectSampleCatalog(client, catalog);
	await client.query("COMMIT");
	console.log("Catalog definitions:", report.expected);
	console.table([report.totals]);
	if (process.argv.includes("--details")) console.table(report.categories);
	if (!report.healthy) {
		console.table(report.issues);
		throw new Error("Sample catalog has missing, moved, or changed relationships. Review them; the importer will not undo user changes.");
	}
	console.log("All five families and every approved category have valid relationships and at least five imported samples.");
} catch (error) {
	if (client) await client.query("ROLLBACK");
	console.error("Sample check failed:", error.message);
	process.exitCode = 1;
} finally {
	client?.release();
	await pool.end();
}

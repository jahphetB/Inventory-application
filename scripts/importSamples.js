import { mkdir, writeFile } from "node:fs/promises";
import pool from "../db/pool.js";
import catalog from "../data/sampleCatalog/index.js";
import { validateCatalog } from "../db/sampleCatalogValidation.js";
import { importSampleCatalog } from "../db/importSampleCatalog.js";

let client;
try {
	if (!["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST) && !process.argv.includes("--allow-remote")) throw new Error("Sample imports require an explicit local PGHOST, or separate remote approval and --allow-remote.");
	console.log("Validated sample definitions:", validateCatalog(catalog));
	client = await pool.connect();
	// The archive is local and ignored. It contains inventory, not connection credentials.
	await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
	const archive = {};
	for (const table of ["categories", "items", "sample_catalog_categories", "sample_catalog_items"]) archive[table] = (await client.query(`SELECT * FROM ${table}`)).rows;
	await client.query("COMMIT");
	await mkdir("generated", { recursive: true });
	const archivePath = `generated/sample-import-before-${Date.now()}.json`;
	await writeFile(archivePath, JSON.stringify(archive, null, "\t") + "\n", { flag: "wx" });
	console.log(`Local pre-import archive: ${archivePath}`);
	console.log(await importSampleCatalog(client, catalog, { removeEmptyLegacyDrums: process.argv.includes("--remove-empty-legacy-drums") }));
} catch (error) {
	if (client) await client.query("ROLLBACK");
	console.error("Sample import failed:", error.message);
	process.exitCode = 1;
} finally {
	client?.release();
	await pool.end();
}

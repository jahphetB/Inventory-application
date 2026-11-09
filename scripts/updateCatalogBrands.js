import assert from "node:assert/strict";
import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import catalog from "../data/sampleCatalog/index.js";
import { updateCatalogBrands } from "../db/updateCatalogBrands.js";
import { importSampleCatalog } from "../db/importSampleCatalog.js";

const remote = process.argv.includes("--allow-remote");
let options = { connectionTimeoutMillis: 10000 };
let url;
if (remote) {
	url = new URL(process.env.DATABASE_URL);
	url.searchParams.set("sslmode", "verify-full");
	options.connectionString = url.toString();
} else if (!["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST)) throw new Error("An explicit local PGHOST is required; remote updates require --allow-remote and DATABASE_URL.");
const client = new pg.Client(options);
try {
	await client.connect();
	const before = {};
	for (const table of ["items", "sample_catalog_items"]) before[table] = (await client.query(`SELECT * FROM ${table} ORDER BY ${table === "items" ? "id" : "item_key"}`)).rows;
	await mkdir("generated/brand-updates", { recursive: true });
	const archive = `generated/brand-updates/${remote ? "production" : "local"}-${Date.now()}`;
	await writeFile(archive + ".json", JSON.stringify(before, null, "\t") + "\n", { flag: "wx" });
	if (remote) {
		const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "require" };
		delete env.DATABASE_URL;
		const dump = spawnSync("C:/Program Files/PostgreSQL/18/bin/pg_dump.exe", ["--format=custom", "--no-owner", "--no-acl", "--file=" + archive + ".dump"], { env, encoding: "utf8" });
		if (dump.status !== 0) throw new Error("Production backup failed; no brands were updated.");
		const check = spawnSync("C:/Program Files/PostgreSQL/18/bin/pg_restore.exe", ["--list", archive + ".dump"], { encoding: "utf8" });
		if (check.status !== 0) throw new Error("Backup archive verification failed; no brands were updated.");
	}
	const report = await updateCatalogBrands(client, catalog);
	const after = (await client.query("SELECT * FROM items ORDER BY id")).rows;
	const withoutBrand = (rows) => rows.map(({ brand, ...rest }) => rest);
	assert.deepEqual(withoutBrand(after), withoutBrand(before.items), "Only brands may change");
	const remaining = Number((await client.query("SELECT COUNT(*) FROM items WHERE brand ~* 'fictional|demo|random'")).rows[0].count);
	assert.equal(remaining, 0, "Unexpected placeholder brands remain");
	const rerun = await updateCatalogBrands(client, catalog);
	assert.equal(rerun.updated, 0);
	const imported = await importSampleCatalog(client, catalog);
	assert.equal(imported.items_created, 0);
	console.log(JSON.stringify({ environment: remote ? "production" : "local", ...report, total_items: after.length, placeholder_brands: remaining, idempotent: true, importer_compatible: true, archive }));
} finally { await client.end(); }

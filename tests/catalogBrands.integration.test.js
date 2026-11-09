import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../data/sampleCatalog/index.js";
import { definitionHash } from "../db/sampleCatalogValidation.js";
import { importSampleCatalog } from "../db/importSampleCatalog.js";
import { updateCatalogBrands } from "../db/updateCatalogBrands.js";
import { runMigrations } from "../db/migrate.js";
import { withSchema } from "./helpers/database.js";

test("brand upgrade preserves user edits, deleted items, other fields, and rerun compatibility", { skip: process.env.INVENTORY_DATABASE_TESTS !== "true" }, async () => {
	await withSchema(async (client) => {
		await runMigrations(client);
		await importSampleCatalog(client, catalog);
		const fictional = (await client.query("SELECT * FROM sample_catalog_items WHERE identity_kind='fictional' ORDER BY item_key")).rows;
		for (const row of fictional) {
			const definition = { ...row.definition, brand: "Fictional Demo" };
			await client.query("UPDATE sample_catalog_items SET definition=$1, definition_hash=$2, imported_revision=1 WHERE item_key=$3", [JSON.stringify(definition), definitionHash(definition), row.item_key]);
			await client.query("UPDATE items SET brand='Fictional Demo' WHERE id=$1", [row.item_id]);
		}
		await client.query("UPDATE items SET brand='My own brand', price=123.45 WHERE id=$1", [fictional[0].item_id]);
		await client.query("DELETE FROM items WHERE id=$1", [fictional[1].item_id]);
		const snapshot = async () => (await client.query("SELECT * FROM items ORDER BY id")).rows;
		const before = await snapshot();
		const report = await updateCatalogBrands(client, catalog);
		assert.deepEqual(report, { updated: 327, preserved_edits: 1, deleted: 1, already_current: 0 });
		const after = await snapshot();
		assert.deepEqual(after.map(({ brand, ...rest }) => rest), before.map(({ brand, ...rest }) => rest));
		assert.equal(after.find((row) => row.id === fictional[0].item_id).brand, "My own brand");
		assert.ok(after.every((row) => !/fictional|demo|random/i.test(row.brand)));
		assert.equal((await updateCatalogBrands(client, catalog)).updated, 0);
		assert.equal((await importSampleCatalog(client, catalog)).items_created, 0);
	});
});

test("unexpected previous definitions roll back brand and ledger changes", { skip: process.env.INVENTORY_DATABASE_TESTS !== "true" }, async () => {
	await withSchema(async (client) => {
		await runMigrations(client); await importSampleCatalog(client, catalog);
		await client.query("UPDATE sample_catalog_items SET definition_hash=repeat('0',64) WHERE identity_kind='fictional'");
		await assert.rejects(updateCatalogBrands(client, catalog), /Unexpected previous definition/);
		assert.equal(Number((await client.query("SELECT COUNT(*) FROM items WHERE brand='Fictional Demo'")).rows[0].count), 0);
	});
});

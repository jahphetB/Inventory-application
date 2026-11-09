import { definitionHash, validateCatalog } from "./sampleCatalogValidation.js";

// Explicit revision-one upgrade: ordinary imports continue to reject changed definitions.
export async function updateCatalogBrands(client, catalog) {
	validateCatalog(catalog);
	const report = { updated: 0, preserved_edits: 0, deleted: 0, already_current: 0 };
	await client.query("BEGIN");
	try {
		await client.query("SELECT pg_advisory_xact_lock(47291, 1)");
		await client.query("LOCK TABLE items, sample_catalog_items IN SHARE ROW EXCLUSIVE MODE");
		for (const category of catalog.categories) {
			for (const item of category.items.filter((entry) => entry.identity_kind === "fictional")) {
				const definition = { ...item, category_key: category.key, source_url: null };
				const oldDefinition = { ...definition, brand: "Fictional Demo" };
				const ledger = (await client.query("SELECT * FROM sample_catalog_items WHERE dataset_key=$1 AND item_key=$2", [catalog.id, item.key])).rows[0];
				if (!ledger) throw new Error(`Missing imported item: ${item.key}`);
				if (ledger.definition_hash === definitionHash(definition)) { report.already_current++; continue; }
				if (ledger.definition_hash !== definitionHash(oldDefinition) || definitionHash(ledger.definition) !== definitionHash(oldDefinition)) throw new Error(`Unexpected previous definition: ${item.key}`);
				if (ledger.item_id === null) report.deleted++;
				else {
					const current = (await client.query("SELECT brand FROM items WHERE id=$1", [ledger.item_id])).rows[0];
					if (!current) throw new Error(`Missing inventory record: ${item.key}`);
					if (current.brand === oldDefinition.brand) {
						const collision = await client.query("SELECT id FROM items WHERE id<>$1 AND LOWER(BTRIM(brand))=LOWER($2) AND LOWER(BTRIM(name))=(SELECT LOWER(BTRIM(name)) FROM items WHERE id=$1)", [ledger.item_id, item.brand]);
						if (collision.rowCount) throw new Error(`Brand/model collision: ${item.key}`);
						await client.query("UPDATE items SET brand=$1 WHERE id=$2", [item.brand, ledger.item_id]);
						report.updated++;
					} else report.preserved_edits++;
				}
				await client.query("UPDATE sample_catalog_items SET definition=$1, definition_hash=$2, imported_revision=$3 WHERE dataset_key=$4 AND item_key=$5", [JSON.stringify(definition), definitionHash(definition), catalog.revision, catalog.id, item.key]);
			}
		}
		await client.query("COMMIT");
		return report;
	} catch (error) { await client.query("ROLLBACK"); throw error; }
}

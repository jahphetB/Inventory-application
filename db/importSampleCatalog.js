import { validateCatalog, definitionHash, normalizeIdentity } from "./sampleCatalogValidation.js";

export async function importSampleCatalog(client, catalog, { removeEmptyLegacyDrums = false } = {}) {
	validateCatalog(catalog);
	const result = { categories_created: 0, categories_reused: 0, categories_skipped: 0, items_created: 0, items_skipped: 0, removed_empty_drums: 0 };
	await client.query("BEGIN");
	try {
		await client.query("SELECT pg_advisory_xact_lock(47291, 1)");
		await client.query("LOCK TABLE categories, items, sample_catalog_categories, sample_catalog_items IN SHARE ROW EXCLUSIVE MODE");
		const families = (await client.query("SELECT id FROM families ORDER BY id")).rows.map((row) => row.id);
		if (JSON.stringify(families) !== "[1,2,3,4,5]") throw new Error("Expected exactly five fixed families.");
		const categoryLedger = new Map((await client.query("SELECT * FROM sample_catalog_categories WHERE dataset_key = $1", [catalog.id])).rows.map((row) => [row.category_key, row]));
		const itemLedger = new Map((await client.query("SELECT * FROM sample_catalog_items WHERE dataset_key = $1", [catalog.id])).rows.map((row) => [row.item_key, row]));

		// Cleanup is an explicit first-import operation, never a rerun repair.
		if (categoryLedger.size === 0 && itemLedger.size === 0) {
			const legacy = (await client.query("SELECT id, family_id FROM categories WHERE LOWER(BTRIM(name)) = 'drums'")).rows[0];
			if (legacy) {
				if (!removeEmptyLegacyDrums) throw new Error("Legacy Drums requires explicit --remove-empty-legacy-drums approval.");
				if (legacy.family_id !== 2 || (await client.query("SELECT id FROM items WHERE category_id = $1 LIMIT 1", [legacy.id])).rowCount) {
					throw new Error("Drums is populated or has an unexpected family; nothing was imported or removed.");
				}
				await client.query("DELETE FROM categories WHERE id = $1", [legacy.id]);
				result.removed_empty_drums = 1;
			}
		}

		for (const category of catalog.categories) {
			const { items, ...categoryDefinition } = category;
			const categoryHash = definitionHash(categoryDefinition);
			let categoryId;
			const registered = categoryLedger.get(category.key);
			if (registered) {
				if (registered.definition_hash !== categoryHash) throw new Error(`Catalog definition changed for existing category key: ${category.key}`);
				categoryId = registered.category_id;
				result.categories_skipped += 1;
			} else {
				const existing = (await client.query("SELECT id, family_id FROM categories WHERE LOWER(BTRIM(name)) = $1", [normalizeIdentity(category.name)])).rows[0];
				if (existing) {
					if (existing.family_id !== category.family_id) throw new Error(`Existing category has a conflicting family: ${category.name}`);
					categoryId = existing.id;
					result.categories_reused += 1;
				} else {
					categoryId = (await client.query("INSERT INTO categories (name, description, family_id) VALUES ($1, $2, $3) RETURNING id", [category.name, category.description, category.family_id])).rows[0].id;
					result.categories_created += 1;
				}
				await client.query(`INSERT INTO sample_catalog_categories
					(dataset_key, category_key, category_id, definition_hash, definition, imported_revision)
					VALUES ($1, $2, $3, $4, $5, $6)`, [catalog.id, category.key, categoryId, categoryHash, JSON.stringify(categoryDefinition), catalog.revision]);
			}

			for (const item of items) {
				const sourceUrl = item.source ? catalog.sources[item.source].url : null;
				const itemDefinition = { ...item, category_key: category.key, source_url: sourceUrl };
				const itemHash = definitionHash(itemDefinition);
				const imported = itemLedger.get(item.key);
				if (imported) {
					if (imported.definition_hash !== itemHash) throw new Error(`Catalog definition changed for existing item key: ${item.key}`);
					result.items_skipped += 1;
					continue;
				}
				if (categoryId === null) throw new Error(`Category was deliberately deleted; review new additions for ${category.key}`);
				const current = (await client.query("SELECT name, family_id FROM categories WHERE id = $1", [categoryId])).rows[0];
				if (!current || current.family_id !== category.family_id || normalizeIdentity(current.name) !== normalizeIdentity(category.name)) {
					throw new Error(`Category was modified; review new additions for ${category.key}`);
				}
				const collision = await client.query("SELECT id FROM items WHERE LOWER(BTRIM(brand)) = $1 AND LOWER(BTRIM(name)) = $2 LIMIT 1", [normalizeIdentity(item.brand), normalizeIdentity(item.name)]);
				if (collision.rowCount) throw new Error(`Existing instrument identity requires review: ${item.brand} ${item.name}`);
				const itemId = (await client.query(`INSERT INTO items (name, brand, description, price, stock_quantity, category_id)
					VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [item.name, item.brand, item.description, item.price, item.stock_quantity, categoryId])).rows[0].id;
				await client.query(`INSERT INTO sample_catalog_items
					(dataset_key, item_key, category_key, item_id, identity_kind, source_url, definition_hash, definition, imported_revision)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [catalog.id, item.key, category.key, itemId, item.identity_kind, sourceUrl, itemHash, JSON.stringify(itemDefinition), catalog.revision]);
				result.items_created += 1;
			}
		}
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}

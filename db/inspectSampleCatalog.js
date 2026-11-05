import { validateCatalog, normalizeIdentity } from "./sampleCatalogValidation.js";

export async function inspectSampleCatalog(client, catalog) {
	const expected = validateCatalog(catalog);
	const rows = (await client.query(`SELECT ledger.category_key, c.id, c.name, c.family_id,
		COUNT(i.id) FILTER (WHERE i.category_id = c.id)::INTEGER AS sample_count
		FROM sample_catalog_categories ledger
		LEFT JOIN categories c ON c.id = ledger.category_id
		LEFT JOIN sample_catalog_items entries ON entries.dataset_key = ledger.dataset_key AND entries.category_key = ledger.category_key
		LEFT JOIN items i ON i.id = entries.item_id
		WHERE ledger.dataset_key = $1
		GROUP BY ledger.category_key, c.id
		ORDER BY LOWER(c.name), ledger.category_key`, [catalog.id])).rows;
	const byKey = new Map(rows.map((row) => [row.category_key, row]));
	const issues = [];
	for (const category of catalog.categories) {
		const row = byKey.get(category.key);
		if (!row || !row.id || row.family_id !== category.family_id || normalizeIdentity(row.name) !== normalizeIdentity(category.name) || row.sample_count < catalog.items_per_category) {
			issues.push({ category: category.name, present_samples: row?.sample_count ?? 0, issue: !row?.id ? "missing category/import" : "category identity/family changed or samples were moved/deleted" });
		}
	}
	const totals = (await client.query(`SELECT
		(SELECT COUNT(*)::INTEGER FROM families) AS families,
		(SELECT COUNT(*)::INTEGER FROM categories) AS categories,
		(SELECT COUNT(*)::INTEGER FROM items) AS items,
		(SELECT COUNT(*)::INTEGER FROM items WHERE category_id IS NULL) AS uncategorized,
		(SELECT COUNT(*)::INTEGER FROM sample_catalog_items WHERE dataset_key = $1) AS imported_keys,
		(SELECT COUNT(*)::INTEGER FROM sample_catalog_items WHERE dataset_key = $1 AND item_id IS NULL) AS deleted_samples`, [catalog.id])).rows[0];
	return { healthy: totals.families === 5 && issues.length === 0, expected, totals, categories: rows, issues };
}

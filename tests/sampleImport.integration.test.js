import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import catalog from "../data/sampleCatalog/index.js";
import { category } from "../data/sampleCatalog/builders.js";
import { withSchema } from "./helpers/database.js";
import { runMigrations } from "../db/migrate.js";
import { seedInitialInventory } from "../db/seedInitialInventory.js";
import { importSampleCatalog } from "../db/importSampleCatalog.js";
import { inspectSampleCatalog } from "../db/inspectSampleCatalog.js";
import { runWithDatabase } from "../db/pool.js";
import { getCategoriesByFamilyId, getFamiliesWithCounts } from "../db/queries.js";

const options = { skip: process.env.INVENTORY_DATABASE_TESTS !== "true" };
const cleanup = { removeEmptyLegacyDrums: true };
const setup = async (client) => { await runMigrations(client); await seedInitialInventory(client); };
const snapshot = async (client) => {
	const result = {};
	for (const [table, order] of [["categories", "id"], ["items", "id"], ["sample_catalog_categories", "category_key"], ["sample_catalog_items", "item_key"]]) {
		result[table] = (await client.query(`SELECT * FROM ${table} ORDER BY ${order}`)).rows;
	}
	return result;
};

test("catalog can initialize a migrated empty inventory without the optional initial seed", options, async () => {
	await withSchema(async (client) => {
		await runMigrations(client);
		const result = await importSampleCatalog(client, catalog);
		assert.equal(result.categories_created, 70);
		assert.equal(result.items_created, 350);
		const report = await inspectSampleCatalog(client, catalog);
		assert.equal(report.healthy, true);
		assert.equal(report.totals.items, 350);
	});
});

test("case-insensitive matching reuses existing category names and descriptions without overwriting them", options, async () => {
	await withSchema(async (client) => {
		await setup(client);
		await client.query("UPDATE categories SET name='  gUiTaRs  ', description='Keep my description' WHERE id=1");
		await importSampleCatalog(client, catalog, cleanup);
		assert.deepEqual((await client.query("SELECT name, description FROM categories WHERE id=1")).rows[0], { name: "  gUiTaRs  ", description: "Keep my description" });
		assert.equal((await inspectSampleCatalog(client, catalog)).healthy, true);
	});
});

test("first import creates the approved counts, preserves existing records, and reruns without changes", options, async () => {
	await withSchema(async (client) => {
		await setup(client);
		const before = await snapshot(client);
		assert.deepEqual(await importSampleCatalog(client, catalog, cleanup), { categories_created: 68, categories_reused: 2, categories_skipped: 0, items_created: 350, items_skipped: 0, removed_empty_drums: 1 });
		const after = await snapshot(client);
		assert.equal(after.categories.length, 70);
		assert.equal(after.items.length, 354);
		assert.deepEqual(after.items.filter((row) => row.id <= 4), before.items);
		assert.deepEqual(after.categories.filter((row) => row.id <= 2), before.categories.filter((row) => row.id <= 2));
		const report = await inspectSampleCatalog(client, catalog);
		assert.equal(report.healthy, true);
		assert.equal(report.categories.length, 70);
		assert.ok(report.categories.every((row) => row.sample_count === 5));
		assert.deepEqual(report.totals, { families: 5, categories: 70, items: 354, uncategorized: 1, imported_keys: 350, deleted_samples: 0 });
		await runWithDatabase(client, async () => {
			const families = await getFamiliesWithCounts();
			assert.deepEqual(families.map((row) => row.category_count), [17, 17, 8, 16, 12]);
			for (const family of families) {
				const actual = (await getCategoriesByFamilyId(family.id)).map((row) => row.name);
				const expected = catalog.categories.filter((row) => row.family_id === family.id).map((row) => row.name).sort((a, b) => a.localeCompare(b, "en"));
				assert.deepEqual(actual, expected);
			}
		});
		assert.deepEqual(await importSampleCatalog(client, catalog, cleanup), { categories_created: 0, categories_reused: 0, categories_skipped: 70, items_created: 0, items_skipped: 350, removed_empty_drums: 0 });
		assert.deepEqual(await snapshot(client), after);
	});
});

test("reruns preserve item/category edits, deletions, transfers, and newly added user data", options, async () => {
	await withSchema(async (client) => {
		await setup(client); await importSampleCatalog(client, catalog, cleanup);
		const itemRows = (await client.query("SELECT item_id FROM sample_catalog_items ORDER BY item_key LIMIT 2")).rows;
		await client.query("UPDATE items SET name='User edited sample', price=3.21, stock_quantity=77, category_id=NULL WHERE id=$1", [itemRows[0].item_id]);
		await client.query("DELETE FROM items WHERE id=$1", [itemRows[1].item_id]);
		const editedCategory = (await client.query("SELECT category_id FROM sample_catalog_categories WHERE category_key='theremins'")).rows[0].category_id;
		await client.query("UPDATE categories SET name='User renamed category', family_id=1 WHERE id=$1", [editedCategory]);
		const deletedCategory = (await client.query("SELECT category_id FROM sample_catalog_categories WHERE category_key='gongs'")).rows[0].category_id;
		await client.query("UPDATE items SET category_id=NULL WHERE category_id=$1", [deletedCategory]);
		await client.query("DELETE FROM categories WHERE id=$1", [deletedCategory]);
		const manual = (await client.query("INSERT INTO categories (name, family_id) VALUES ('Drums', 2) RETURNING id")).rows[0].id;
		await client.query("INSERT INTO items (name,brand,price,category_id) VALUES ('User instrument','User brand',8.50,$1)", [manual]);
		const modified = await snapshot(client);
		await importSampleCatalog(client, catalog, cleanup);
		assert.deepEqual(await snapshot(client), modified);
		const report = await inspectSampleCatalog(client, catalog);
		assert.equal(report.healthy, false);
		assert.equal(report.totals.deleted_samples, 1);
		assert.ok(report.issues.some((row) => row.category === "Gongs"));
	});
});

test("populated Drums, wrong-family names, unowned identity collisions, and missing cleanup approval roll back everything", options, async () => {
	for (const conflict of ["populated", "family", "identity", "approval"]) {
		await withSchema(async (client) => {
			await setup(client);
			if (conflict === "populated") await client.query("INSERT INTO items (name,brand,price,category_id) VALUES ('Keep this drum','User',1,3)");
			if (conflict === "family") await client.query("UPDATE categories SET family_id=4 WHERE name='Guitars'");
			if (conflict === "identity") await client.query("INSERT INTO items (name,brand,price) VALUES ('Etherwave Theremin','Moog',1)");
			const before = await snapshot(client);
			await assert.rejects(importSampleCatalog(client, catalog, conflict === "approval" ? {} : cleanup), /Drums|conflicting family|identity requires review/);
			assert.deepEqual(await snapshot(client), before, conflict);
		});
	}
});

test("changing a registered definition is rejected without undoing user edits", options, async () => {
	await withSchema(async (client) => {
		await setup(client); await importSampleCatalog(client, catalog, cleanup);
		await client.query("UPDATE items SET stock_quantity=99 WHERE id=1");
		const before = await snapshot(client);
		const changed = structuredClone(catalog);
		changed.categories[0].items[0].price = "1.23";
		await assert.rejects(importSampleCatalog(client, changed, cleanup), /definition changed/);
		assert.deepEqual(await snapshot(client), before);
	});
});

test("concurrent imports serialize and do not duplicate records", options, async () => {
	await withSchema(async (client, schema) => {
		await setup(client);
		const second = new pg.Client({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
		try {
			await second.connect();
			const results = await Promise.all([importSampleCatalog(client, catalog, cleanup), importSampleCatalog(second, catalog, cleanup)]);
			assert.equal(results.reduce((sum, row) => sum + row.items_created, 0), 350);
			assert.equal((await inspectSampleCatalog(client, catalog)).totals.items, 354);
		} finally { await second.end(); }
	});
});

test("a later additive revision creates only its new keys and preserves original data and provenance", options, async () => {
	await withSchema(async (client) => {
		await setup(client); await importSampleCatalog(client, catalog, cleanup);
		const before = await snapshot(client);
		const extended = structuredClone(catalog);
		extended.revision = 2; extended.expected_categories += 1; extended.family_counts[1] += 1;
		extended.categories.push(category(1, "Singing bowls", "Resonating bowls played by rubbing or striking.", 5000, ["Small bronze singing bowl", "Large meditation bowl", "Hand-hammered singing bowl", "Crystal singing bowl", "Compact travel singing bowl"]));
		const result = await importSampleCatalog(client, extended, cleanup);
		assert.equal(result.categories_created, 1); assert.equal(result.items_created, 5); assert.equal(result.items_skipped, 350);
		const after = await snapshot(client);
		assert.deepEqual(after.items.slice(0, before.items.length), before.items);
		assert.deepEqual(after.sample_catalog_items.filter((row) => row.imported_revision === 1), before.sample_catalog_items);
		assert.equal((await inspectSampleCatalog(client, extended)).healthy, true);
	});
});

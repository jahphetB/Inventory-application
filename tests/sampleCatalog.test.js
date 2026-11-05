import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../data/sampleCatalog/index.js";
import { validateCatalog, definitionHash } from "../db/sampleCatalogValidation.js";

test("approved catalog has 70 categories, five distinct items each, and verified/fictional identities", () => {
	assert.deepEqual(validateCatalog(catalog), { categories: 70, items: 350, real: 21, fictional: 329 });
	assert.deepEqual(catalog.family_counts, { 1: 16, 2: 12, 3: 17, 4: 17, 5: 8 });
	assert.ok(!catalog.categories.some((category) => category.name === "Drums"));
});

test("catalog rejects invalid counts, families, duplicate keys/names/identities, prices, and stock", () => {
	for (const change of [
		(copy) => { copy.categories.pop(); },
		(copy) => { copy.categories[0].family_id = 99; },
		(copy) => { copy.categories[1].key = copy.categories[0].key; },
		(copy) => { copy.categories[1].name = copy.categories[0].name.toUpperCase(); },
		(copy) => { copy.categories[0].items.pop(); },
		(copy) => { copy.categories[0].items[1].key = copy.categories[0].items[0].key; },
		(copy) => { copy.categories[0].items[1].name = copy.categories[0].items[0].name; },
		(copy) => { copy.categories[0].items[0].price = "-1.00"; },
		(copy) => { copy.categories[0].items[0].price = "1.001"; },
		(copy) => { copy.categories[0].items[0].stock_quantity = 1.5; },
		(copy) => { copy.categories[0].items[0].stock_quantity = -1; },
	]) {
		const copy = structuredClone(catalog); change(copy);
		assert.throws(() => validateCatalog(copy), /Invalid sample catalog/);
	}
});

test("invented models cannot use real brands or unrelated source references", () => {
	const copy = structuredClone(catalog);
	Object.assign(copy.categories[0].items[0], { brand: "Fender", name: "Invented Real Model", identity_kind: "real", source: "fender-player-ii" });
	assert.throws(() => validateCatalog(copy), /matching primary source/);
	copy.categories[0].items[0].identity_kind = "fictional";
	assert.throws(() => validateCatalog(copy), /explicit fictional brand/);
});

test("definition hashes ignore object key order and detect meaningful dataset edits", () => {
	assert.equal(definitionHash({ a: 1, b: 2 }), definitionHash({ b: 2, a: 1 }));
	assert.notEqual(definitionHash({ a: 1 }), definitionHash({ a: 2 }));
});

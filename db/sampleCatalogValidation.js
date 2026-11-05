import { createHash } from "node:crypto";
import { fictionalBrand } from "../data/sampleCatalog/builders.js";

export const normalizeIdentity = (value) => value.trim().toLowerCase();

export function definitionHash(value) {
	const ordered = (entry) => Array.isArray(entry) ? entry.map(ordered)
		: entry !== null && typeof entry === "object"
			? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, ordered(entry[key])])) : entry;
	return createHash("sha256").update(JSON.stringify(ordered(value))).digest("hex");
}

export function validateCatalog(catalog) {
	const fail = (message) => { throw new Error(`Invalid sample catalog: ${message}`); };
	const text = (value) => typeof value === "string" && value.trim().length > 0;
	if (!/^[a-z0-9-]+$/.test(catalog.id || "")) fail("invalid dataset key");
	if (!Number.isInteger(catalog.revision) || catalog.revision < 1) fail("invalid revision");
	if (!Number.isInteger(catalog.expected_categories) || catalog.expected_categories < 1 || catalog.items_per_category !== 5) fail("invalid expected counts");
	if (catalog.categories.length !== catalog.expected_categories) fail("category count mismatch");
	const keys = new Set();
	const names = new Set();
	const itemKeys = new Set();
	const identities = new Set();
	const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	let real = 0;
	for (const category of catalog.categories) {
		if (!/^[a-z0-9-]+$/.test(category.key || "") || keys.has(category.key)) fail("duplicate or invalid category key");
		if (!text(category.name) || names.has(normalizeIdentity(category.name)) || !text(category.description)) fail("duplicate or empty category name/description");
		if (!Number.isInteger(category.family_id) || !Object.hasOwn(counts, category.family_id)) fail("invalid family");
		keys.add(category.key); names.add(normalizeIdentity(category.name)); counts[category.family_id] += 1;
		if (category.items.length !== catalog.items_per_category) fail(`expected five items in ${category.key}`);
		for (const item of category.items) {
			if (!text(item.key) || !item.key.startsWith(category.key + "/") || itemKeys.has(item.key)) fail("duplicate or invalid item key");
			if (![item.name, item.brand, item.description].every(text)) fail("empty item information");
			const identity = JSON.stringify([normalizeIdentity(item.brand), normalizeIdentity(item.name)]);
			if (identities.has(identity)) fail("duplicate brand/model identity");
			if (typeof item.price !== "string" || !/^\d+\.\d{2}$/.test(item.price) || Number(item.price) >= 100000000) fail("invalid price");
			if (!Number.isInteger(item.stock_quantity) || item.stock_quantity < 0 || item.stock_quantity > 2147483647) fail("invalid stock");
			if (item.identity_kind === "real") {
				const source = catalog.sources[item.source];
				if (!source?.url?.startsWith("https://") || !source.identities.some((entry) => entry.brand === item.brand && entry.name === item.name)) fail("real identity lacks a matching primary source");
				real += 1;
			} else if (item.identity_kind !== "fictional" || item.brand !== fictionalBrand || item.source !== null) {
				fail("fictional identity must use the explicit fictional brand");
			}
			itemKeys.add(item.key); identities.add(identity);
		}
	}
	if (definitionHash(counts) !== definitionHash(catalog.family_counts)) fail("family category counts mismatch");
	return { categories: keys.size, items: itemKeys.size, real, fictional: itemKeys.size - real };
}

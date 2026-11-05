import assert from "node:assert/strict";
import test from "node:test";
import { withInventoryApp, testPassword } from "./helpers/inventoryApp.js";

const options = { skip: process.env.INVENTORY_DATABASE_TESTS !== "true" };

for (const compiled of [false, true]) {
	test(`${compiled ? "compiled" : "native"} templates preserve family/category/item browsing and fixed-family boundaries`, options, async () => {
		await withInventoryApp(async ({ base, client }) => {
			const get = async (path) => {
				const response = await fetch(base + path);
				assert.equal(response.status, 200, path);
				return response.text();
			};
			const home = await get("/");
			assert.equal((home.match(/class="family-card category-card"/g) || []).length, 5);
			assert.ok(home.includes('href="/items/uncategorized"'));
			assert.ok(home.includes('href="/items"'));
			for (const slug of ["aerophones", "chordophones", "electrophones", "idiophones", "membranophones"]) {
				const html = await get("/families/" + slug);
				assert.ok(html.includes('aria-label="Breadcrumb"'));
				assert.ok(!html.includes("Edit family") && !html.includes("Delete family"));
			}
			assert.ok((await get("/families/chordophones")).includes('href="/categories/1"'));
			assert.ok(!(await get("/families/chordophones")).includes("Digital pianos"));
			assert.ok((await get("/families/aerophones")).includes("No categories in this family yet."));
			assert.ok((await get("/categories/1")).includes('href="/families/chordophones"'));
			assert.ok((await get("/items/1")).includes('href="/families/chordophones"'));
			assert.ok((await get("/items/4")).includes('href="/items/uncategorized"'));
			assert.ok((await get("/items")).includes("Player Stratocaster"));
			for (const path of ["/families/unknown", "/families/123", "/families/new", "/families/chordophones/edit", "/families/chordophones/delete", "/categories/0", "/categories/999999", "/items/invalid", "/items/999999"]) {
				assert.equal((await fetch(base + path)).status, 404, path);
			}
			const before = (await client.query("SELECT * FROM families ORDER BY id")).rows;
			for (const path of ["/families", "/families/new", "/families/chordophones/edit", "/families/chordophones/delete"]) {
				for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
					assert.equal((await fetch(base + path, { method, body: new URLSearchParams({ admin_password: testPassword, name: "Changed" }), redirect: "manual" })).status, 404);
				}
			}
			assert.deepEqual((await client.query("SELECT * FROM families ORDER BY id")).rows, before);
		}, { compiled });
	});
}

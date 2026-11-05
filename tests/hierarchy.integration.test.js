import assert from "node:assert/strict";
import test from "node:test";
import { withInventoryApp, testPassword } from "./helpers/inventoryApp.js";
import { withSchema } from "./helpers/database.js";
import { runMigrations } from "../db/migrate.js";
import { seedInitialInventory } from "../db/seedInitialInventory.js";
import { runWithDatabase } from "../db/pool.js";
import { deleteCategory } from "../db/queries.js";

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

	test(`${compiled ? "compiled" : "native"} admin operations enforce families, preserve data on rejection, and transfer atomically`, options, async () => {
		await withInventoryApp(async ({ base, client, databasePool }) => {
			const snapshot = async () => ({ categories: (await client.query("SELECT * FROM categories ORDER BY id")).rows, items: (await client.query("SELECT * FROM items ORDER BY id")).rows });
			const initial = await snapshot();
			const post = async (path, fields, status = 303, password = testPassword) => {
				const body = fields instanceof URLSearchParams ? fields : new URLSearchParams(fields);
				body.set("admin_password", password);
				const response = await fetch(base + path, { method: "POST", body, redirect: "manual" });
				assert.equal(response.status, status, path);
				const html = await response.text();
				assert.ok(!html.includes(testPassword), "Password must never be echoed");
				return { location: response.headers.get("location"), html };
			};
			for (const path of ["/categories/new", "/categories/1/edit", "/categories/1/delete", "/items/new", "/items/1/edit", "/items/1/delete"]) {
				await post(path, { name: "Unauthorized", family_id: "3" }, 403, "wrong-password");
			}
			for (const family_id of ["", "0", "6", "-1", "3.5", "chordophones", "3 OR 1=1"]) {
				await post("/categories/new", { name: "Rejected", family_id }, 400);
				await post("/categories/1/edit", { name: "Rejected", family_id }, 400);
			}
			const repeated = new URLSearchParams([['name', 'Rejected'], ['family_id', '3'], ['family_id', '4']]);
			await post("/categories/new", repeated, 400);
			assert.deepEqual(await snapshot(), initial);
			const selected = await (await fetch(base + "/categories/new?family=chordophones")).text();
			assert.match(selected, /value="3"\s+selected/);
			const selectedItem = await (await fetch(base + "/items/new?category=1")).text();
			assert.match(selectedItem, /value="1"\s+selected/);
			assert.ok(selectedItem.includes("Chordophones / Guitars"));
			for (const path of ["/categories/new?family=unknown", "/items/new?category=0", "/items/new?category=99999"]) assert.equal((await fetch(base + path)).status, 404);

			const create = async (name, family_id) => Number((await post("/categories/new", { name, family_id })).location.split("/").at(-1));
			const source = await create("Transfer source", "3");
			const destination = await create("Transfer destination", "4");
			const empty = await create("Empty test category", "2");
			await post("/categories/new", { name: "TRANSFER SOURCE", family_id: "2" }, 409);
			const item = { name: "Temporary instrument", brand: "Test", description: "Temporary", price: "12.34", stock_quantity: "2", category_id: String(source) };
			for (const category_id of ["0", "999999", "1 OR 1=1"]) await post("/items/new", { ...item, category_id }, 400);
			const itemPath = (await post("/items/new", item)).location;
			const itemId = Number(itemPath.split("/").at(-1));
			await post(`/categories/${source}/edit`, { name: "Moved category", family_id: "1", description: "Moved" });
			assert.equal((await client.query("SELECT c.family_id FROM items i JOIN categories c ON c.id=i.category_id WHERE i.id=$1", [itemId])).rows[0].family_id, 1);
			assert.ok((await (await fetch(base + itemPath)).text()).includes('href="/families/idiophones"'));
			await post(itemPath + "/edit", { ...item, price: "45.67", stock_quantity: "3" });
			await post(itemPath + "/edit", { ...item, price: "-1" }, 400);
			assert.equal((await client.query("SELECT price FROM items WHERE id=$1", [itemId])).rows[0].price, "45.67");
			const deletionForm = await (await fetch(base + `/categories/${source}/delete`)).text();
			assert.ok(deletionForm.includes("Aerophones / Transfer destination"));
			for (const fields of [{}, { destination_id: String(source) }, { destination_id: "999999" }]) await post(`/categories/${source}/delete`, fields, 400);
			await post(`/categories/${source}/delete`, new URLSearchParams([['destination_id', String(destination)], ['destination_id', 'uncategorized']]), 400);

			await client.query(`CREATE FUNCTION reject_test_category_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Forced deletion failure'; END; $$;
				CREATE TRIGGER test_delete_failure BEFORE DELETE ON categories FOR EACH ROW EXECUTE FUNCTION reject_test_category_delete();`);
			await assert.rejects(runWithDatabase(databasePool, () => deleteCategory(source, destination)), /Forced deletion failure/);
			assert.equal((await client.query("SELECT category_id FROM items WHERE id=$1", [itemId])).rows[0].category_id, source);
			assert.equal((await client.query("SELECT id FROM categories WHERE id=$1", [source])).rowCount, 1);
			await client.query("DROP TRIGGER test_delete_failure ON categories; DROP FUNCTION reject_test_category_delete()");

			await post(`/categories/${source}/delete`, { destination_id: String(destination) });
			assert.equal((await client.query("SELECT category_id FROM items WHERE id=$1", [itemId])).rows[0].category_id, destination);
			assert.ok((await (await fetch(base + itemPath)).text()).includes('href="/families/aerophones"'));
			await post(`/categories/${destination}/delete`, { destination_id: "uncategorized" });
			assert.equal((await client.query("SELECT category_id FROM items WHERE id=$1", [itemId])).rows[0].category_id, null);
			await post(itemPath + "/delete", {});
			await post(`/categories/${empty}/delete`, {});
			assert.deepEqual(await snapshot(), initial);
		}, { compiled });
	});
}

test("initial seed works after migrations and still refuses a populated database", options, async () => {
	await withSchema(async (client) => {
		await runMigrations(client);
		assert.deepEqual(await seedInitialInventory(client), { categories: 3, items: 4 });
		const categories = (await client.query("SELECT * FROM categories ORDER BY id")).rows;
		const items = (await client.query("SELECT * FROM items ORDER BY id")).rows;
		assert.deepEqual(categories.map(({ name, family_id }) => ({ name, family_id })), [{ name: "Guitars", family_id: 3 }, { name: "Digital pianos", family_id: 5 }, { name: "Drums", family_id: 2 }]);
		await assert.rejects(seedInitialInventory(client), /already contains records/);
		assert.deepEqual((await client.query("SELECT * FROM categories ORDER BY id")).rows, categories);
		assert.deepEqual((await client.query("SELECT * FROM items ORDER BY id")).rows, items);
	});
});

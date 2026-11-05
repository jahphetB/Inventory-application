import express from "express";
import pg from "pg";
import app from "../../app.js";
import { runMigrations } from "../../db/migrate.js";
import { runWithDatabase } from "../../db/pool.js";
import { runWithAdminPassword } from "../../security/adminPassword.js";
import { configureCompiledViews } from "../../rendering/compiledViews.js";
import { withSchema } from "./database.js";

export const testPassword = "hierarchy-test-only-password";

export async function withInventoryApp(callback, { compiled = false } = {}) {
	await withSchema(async (client, schema) => {
		await client.query("INSERT INTO categories (name) VALUES ('Guitars'), ('Keyboards'), ('Drums')");
		await client.query(`INSERT INTO items (name, brand, price, stock_quantity, category_id) VALUES
			('Player Stratocaster', 'Fender', 799.99, 5, 1),
			('F310 Acoustic Guitar', 'Yamaha', 199.99, 0, 1),
			('P-145 Digital Piano', 'Yamaha', 499.99, 3, 2),
			('Student Violin', 'Stentor', 149.99, 2, NULL)`);
		await runMigrations(client);
		const databasePool = new pg.Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
		const originalRender = app.render;
		let server;
		try {
			if (compiled) configureCompiledViews(app, (await import("../../generated/views.js")).default);
			const wrapper = express();
			wrapper.use((req, res, next) => runWithDatabase(databasePool, () => runWithAdminPassword(testPassword, next)));
			wrapper.use(app);
			server = await new Promise((resolve) => {
				const listener = wrapper.listen(0, "127.0.0.1", () => resolve(listener));
			});
			await callback({ base: `http://127.0.0.1:${server.address().port}`, client, databasePool });
		} finally {
			if (server) await new Promise((resolve) => server.close(resolve));
			app.render = originalRender;
			await databasePool.end();
		}
	});
}

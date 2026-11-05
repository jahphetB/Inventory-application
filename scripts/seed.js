import pool from "../db/pool.js";
import { seedInitialInventory } from "../db/seedInitialInventory.js";

let client;
try {
	client = await pool.connect();
	const result = await seedInitialInventory(client);
	console.log(`Seed complete: ${result.categories} categories and ${result.items} instruments created.`);
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
} finally {
	client?.release();
	await pool.end();
}

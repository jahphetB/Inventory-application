import pool from "../db/pool.js";

try {
	const connection = await pool.query(`
		SELECT current_database() AS database, current_user AS username;
	`);

	const inventory = await pool.query(`
		SELECT
			(SELECT COUNT(*) FROM categories) AS category_count,
			(SELECT COUNT(*) FROM items) AS item_count;
	`);

	console.table(connection.rows);
	console.table(inventory.rows);
	console.log("Database connection and table access verified.");
} catch (error) {
	console.error("Database check failed:", error.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}
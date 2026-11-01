import pool from "./pool.js";

export async function getCategoriesWithCounts() {
	const { rows } = await pool.query(`
		SELECT
			categories.id,
			categories.name,
			categories.description,
			COUNT(items.id) AS item_count
		FROM categories
		LEFT JOIN items ON items.category_id = categories.id
		GROUP BY categories.id
		ORDER BY LOWER(categories.name), categories.id;
	`);

	return rows;
}

export async function getUncategorizedItemCount() {
	const { rows } = await pool.query(`
		SELECT COUNT(*) AS item_count
		FROM items
		WHERE category_id IS NULL;
	`);

	return rows[0].item_count;
}

export async function getAllItems() {
	const { rows } = await pool.query(`
		SELECT id, name, brand, price, stock_quantity
		FROM items
		ORDER BY LOWER(name), id;
	`);

	return rows;
}

export async function getUncategorizedItems() {
	const { rows } = await pool.query(`
		SELECT id, name, brand, price, stock_quantity
		FROM items
		WHERE category_id IS NULL
		ORDER BY LOWER(name), id;
	`);

	return rows;
}
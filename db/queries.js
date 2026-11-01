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

export async function getItemById(id) {
	const { rows } = await pool.query(`
		SELECT
			items.id,
			items.name,
			items.brand,
			items.description,
			items.price,
			items.stock_quantity,
			items.category_id,
			categories.name AS category_name
		FROM items
		LEFT JOIN categories ON categories.id = items.category_id
		WHERE items.id = $1;
	`, [id]);

	return rows[0];
}

export async function getCategoryById(id) {
	const { rows } = await pool.query(`
		SELECT id, name, description
		FROM categories
		WHERE id = $1;
	`, [id]);

	return rows[0];
}

export async function getItemsByCategoryId(categoryId) {
	const { rows } = await pool.query(`
		SELECT id, name, brand, price, stock_quantity
		FROM items
		WHERE category_id = $1
		ORDER BY LOWER(name), id;
	`, [categoryId]);

	return rows;
}

export async function createCategory({ name, description }) {
	const { rows } = await pool.query(`
		INSERT INTO categories (name, description)
		VALUES ($1, $2)
		RETURNING id;
	`, [name, description || null]);

	return rows[0];
}

export async function createItem(item) {
	const { rows } = await pool.query(`
		INSERT INTO items (
			name,
			brand,
			description,
			price,
			stock_quantity,
			category_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id;
	`, [
		item.name,
		item.brand,
		item.description || null,
		item.price,
		item.stock_quantity,
		item.category_id,
	]);

	return rows[0];
}

export async function updateCategory(id, { name, description }) {
	const { rows } = await pool.query(`
		UPDATE categories
		SET name = $1, description = $2
		WHERE id = $3
		RETURNING id;
	`, [name, description || null, id]);

	return rows[0];
}
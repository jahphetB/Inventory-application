import pool from "../db/pool.js";

const categories = [
	{ name: "Guitars", description: "Acoustic and electric guitars." },
	{ name: "Keyboards", description: "Digital pianos and keyboards." },
	{ name: "Drums", description: "Drum kits and percussion instruments." },
];

const items = [
	{
		name: "Player Stratocaster",
		brand: "Fender",
		description: "An electric guitar for a variety of musical styles.",
		price: "799.99",
		stock: 5,
		category: "Guitars",
	},
	{
		name: "F310 Acoustic Guitar",
		brand: "Yamaha",
		description: "An acoustic guitar suitable for beginners.",
		price: "199.99",
		stock: 0,
		category: "Guitars",
	},
	{
		name: "P-145 Digital Piano",
		brand: "Yamaha",
		description: "A compact digital piano with weighted keys.",
		price: "499.99",
		stock: 3,
		category: "Keyboards",
	},
	{
		name: "Student Violin",
		brand: "Stentor",
		description: "A violin for students beginning their musical journey.",
		price: "149.99",
		stock: 2,
		category: null,
	},
];

async function seedDatabase() {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		await client.query(`
			LOCK TABLE categories, items IN SHARE ROW EXCLUSIVE MODE;
		`);

		const { rows } = await client.query(`
			SELECT
				EXISTS (SELECT 1 FROM categories)
				OR EXISTS (SELECT 1 FROM items) AS has_data;
		`);

		if (rows[0].has_data) {
			throw new Error("Seed stopped: the database already contains records.");
		}

		const categoryIds = new Map();

		for (const category of categories) {
			const result = await client.query(`
				INSERT INTO categories (name, description)
				VALUES ($1, $2)
				RETURNING id;
			`, [category.name, category.description]);

			categoryIds.set(category.name, result.rows[0].id);
		}

		for (const item of items) {
			const categoryId = item.category === null
				? null
				: categoryIds.get(item.category);

			await client.query(`
				INSERT INTO items (
					name,
					brand,
					description,
					price,
					stock_quantity,
					category_id
				)
				VALUES ($1, $2, $3, $4, $5, $6);
			`, [
				item.name,
				item.brand,
				item.description,
				item.price,
				item.stock,
				categoryId,
			]);
		}

		await client.query("COMMIT");
		console.log("Seed complete: 3 categories and 4 instruments created.");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

try {
	await seedDatabase();
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}
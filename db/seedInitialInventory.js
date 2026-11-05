const categories = [
	{ name: "Guitars", family_id: 3, description: "Acoustic and electric guitars." },
	{ name: "Digital pianos", family_id: 5, description: "Digital pianos and keyboards." },
	{ name: "Drums", family_id: 2, description: "Drum kits and percussion instruments." },
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
		category: "Digital pianos",
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

export async function seedInitialInventory(client) {

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
				INSERT INTO categories (name, description, family_id)
				VALUES ($1, $2, $3)
				RETURNING id;
			`, [category.name, category.description, category.family_id]);

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
		return { categories: categories.length, items: items.length };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}


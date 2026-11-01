BEGIN;

CREATE TABLE categories (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
	description TEXT
);

CREATE UNIQUE INDEX categories_name_unique
	ON categories (LOWER(BTRIM(name)));

CREATE TABLE items (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
	brand TEXT NOT NULL CHECK (BTRIM(brand) <> ''),
	description TEXT,
	price NUMERIC(10, 2) NOT NULL CHECK (
		price >= 0 AND price <> 'NaN'::NUMERIC
	),
	stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
	category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT
);

COMMIT;
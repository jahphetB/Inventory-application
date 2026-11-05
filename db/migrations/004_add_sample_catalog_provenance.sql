CREATE TABLE sample_catalog_categories (
	dataset_key TEXT NOT NULL,
	category_key TEXT NOT NULL,
	category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
	definition_hash TEXT NOT NULL CHECK (LENGTH(definition_hash) = 64),
	definition JSONB NOT NULL,
	imported_revision INTEGER NOT NULL CHECK (imported_revision > 0),
	imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (dataset_key, category_key),
	UNIQUE (dataset_key, category_id)
);

CREATE TABLE sample_catalog_items (
	dataset_key TEXT NOT NULL,
	item_key TEXT NOT NULL,
	category_key TEXT NOT NULL,
	item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
	identity_kind TEXT NOT NULL CHECK (identity_kind IN ('real', 'fictional')),
	source_url TEXT,
	definition_hash TEXT NOT NULL CHECK (LENGTH(definition_hash) = 64),
	definition JSONB NOT NULL,
	imported_revision INTEGER NOT NULL CHECK (imported_revision > 0),
	imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (dataset_key, item_key),
	UNIQUE (dataset_key, item_id),
	FOREIGN KEY (dataset_key, category_key)
		REFERENCES sample_catalog_categories(dataset_key, category_key) ON DELETE RESTRICT,
	CHECK ((identity_kind = 'real' AND source_url IS NOT NULL) OR (identity_kind = 'fictional' AND source_url IS NULL))
);

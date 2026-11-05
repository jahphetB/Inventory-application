LOCK TABLE categories, items IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM categories
		WHERE family_id IS NULL
		AND LOWER(BTRIM(name)) NOT IN ('guitars', 'drums', 'keyboards', 'digital pianos')
	) THEN
		RAISE EXCEPTION 'Unmapped categories require an explicit family decision before migration.';
	END IF;

	IF EXISTS (SELECT 1 FROM categories WHERE LOWER(BTRIM(name)) = 'keyboards')
	AND EXISTS (SELECT 1 FROM categories WHERE LOWER(BTRIM(name)) = 'digital pianos') THEN
		RAISE EXCEPTION 'Keyboards and Digital pianos both exist; review this naming conflict before migration.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM categories c JOIN items i ON i.category_id = c.id
		WHERE LOWER(BTRIM(c.name)) = 'keyboards'
		AND (i.name <> 'P-145 Digital Piano' OR i.brand <> 'Yamaha')
	) THEN
		RAISE EXCEPTION 'Review the existing Keyboards instruments before mapping that category to Digital pianos.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM categories
		WHERE family_id IS NOT NULL AND (
			(LOWER(BTRIM(name)) = 'guitars' AND family_id <> 3) OR
			(LOWER(BTRIM(name)) = 'drums' AND family_id <> 2) OR
			(LOWER(BTRIM(name)) IN ('keyboards', 'digital pianos') AND family_id <> 5)
		)
	) THEN
		RAISE EXCEPTION 'An existing family assignment conflicts with the approved category mapping.';
	END IF;
END;
$$;

UPDATE categories SET family_id = 3
	WHERE LOWER(BTRIM(name)) = 'guitars' AND family_id IS NULL;

UPDATE categories SET family_id = 2
	WHERE LOWER(BTRIM(name)) = 'drums' AND family_id IS NULL;

UPDATE categories SET family_id = 5
	WHERE LOWER(BTRIM(name)) = 'digital pianos' AND family_id IS NULL;

UPDATE categories SET name = 'Digital pianos', family_id = 5
	WHERE LOWER(BTRIM(name)) = 'keyboards';

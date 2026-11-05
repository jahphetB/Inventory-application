CREATE TABLE families (
	id SMALLINT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL UNIQUE,
	CONSTRAINT fixed_family_identity CHECK (
		(id = 1 AND slug = 'idiophones' AND name = 'Idiophones') OR
		(id = 2 AND slug = 'membranophones' AND name = 'Membranophones') OR
		(id = 3 AND slug = 'chordophones' AND name = 'Chordophones') OR
		(id = 4 AND slug = 'aerophones' AND name = 'Aerophones') OR
		(id = 5 AND slug = 'electrophones' AND name = 'Electrophones')
	)
);

INSERT INTO families (id, slug, name) VALUES
	(1, 'idiophones', 'Idiophones'),
	(2, 'membranophones', 'Membranophones'),
	(3, 'chordophones', 'Chordophones'),
	(4, 'aerophones', 'Aerophones'),
	(5, 'electrophones', 'Electrophones');

CREATE FUNCTION reject_family_mutation() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'The five instrument families are fixed.'
		USING ERRCODE = '23514', CONSTRAINT = 'fixed_instrument_families';
END;
$$;

CREATE TRIGGER protect_fixed_families
	BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON families
	FOR EACH STATEMENT EXECUTE FUNCTION reject_family_mutation();

-- Nullable only during the Step 1 / Step 2 compatibility transition.
ALTER TABLE categories ADD COLUMN family_id SMALLINT
	REFERENCES families(id) ON DELETE RESTRICT;

CREATE INDEX categories_family_id_index ON categories (family_id);

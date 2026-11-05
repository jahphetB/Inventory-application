LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM categories WHERE family_id IS NULL) THEN
		RAISE EXCEPTION 'Assign a family to every existing category before finalizing the hierarchy; run db:families:check.'
			USING ERRCODE = '23502';
	END IF;
END;
$$;

ALTER TABLE categories ALTER COLUMN family_id SET NOT NULL;

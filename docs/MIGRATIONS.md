# Instrument-family migrations

`db/schema.sql` creates the original category/item tables for a new database. Versioned SQL files in `db/migrations/` extend that schema without recreating its populated tables. Never rerun `db/schema.sql` against existing tables.

## Running locally

```powershell
npm run db:migrate
npm run test:db
```

The migration command reads the ignored `.env`. Remote hosts are refused unless `--allow-remote` is explicitly supplied. That flag is an operator safeguard, not permission to change production. Production migration and deployment remain separate, approval-required actions.

The runner takes a transaction-scoped PostgreSQL advisory lock, applies all pending migrations in one transaction, and records each filename and SHA-256 checksum in `schema_migrations`. A failure rolls back the entire pending batch. Applied files must not be edited or removed; add a new migration instead. CRLF and LF line endings produce the same checksum.

## Fixed families and compatibility

Migration `001_add_instrument_families.sql` creates exactly these fixed identities:

| ID | Slug | Name |
| --- | --- | --- |
| 1 | `idiophones` | Idiophones |
| 2 | `membranophones` | Membranophones |
| 3 | `chordophones` | Chordophones |
| 4 | `aerophones` | Aerophones |
| 5 | `electrophones` | Electrophones |

A database trigger rejects family inserts, updates, deletes, and truncation. There are no application endpoints for family mutations. This protects ordinary database writes; a database owner who deliberately alters the schema can still remove database protections.

`categories.family_id` references those identities. It temporarily accepts `NULL` while the Step 1 schema coexists with the old category forms. Step 2 will require a valid family in write requests and add the final `NOT NULL` migration after checking for unmapped categories. No family is stored independently on an item: an assigned item's family always comes from its category. Items with `category_id IS NULL` remain globally Uncategorized.

Global case-insensitive category-name uniqueness and existing item fields, identity values, foreign keys, and transactional transfers remain unchanged.

## Tests

`npm test` runs database-free authorization tests and skips the opt-in migration integration tests. `npm run test:db` requires an explicit local `PGHOST` and runs the integration tests in newly created, randomly named schemas. Only those test schemas are dropped during cleanup; application tables are not dropped or recreated.

See [the before and planned-after diagrams](PROJECT_STRUCTURE.md) for the complete architecture target. Only the work described as implemented for the current step should be treated as complete.

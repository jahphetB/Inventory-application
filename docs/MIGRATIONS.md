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

`categories.family_id` references those identities. Migration 001 initially allowed `NULL` for the Step 1 compatibility bridge. Migration `003_require_category_family.sql` finalizes `NOT NULL` in Step 2 and refuses unresolved categories without deleting or guessing their classification. The category forms and server validation now require one of the five fixed IDs. No family is stored independently on an item: an assigned item's family always comes from its category. Items with `category_id IS NULL` remain globally Uncategorized.

Global case-insensitive category-name uniqueness and existing item fields, identity values, foreign keys, and transactional transfers remain unchanged.

## Existing category mapping

Migration `002_map_existing_categories.sql` implements the approved mapping:

| Existing category | Result | Family |
| --- | --- | --- |
| Guitars | Same name and ID | Chordophones |
| Drums | Same name and ID | Membranophones |
| Keyboards | Renamed to Digital pianos; same ID | Electrophones |
| Digital pianos, if already present without Keyboards | Same name and ID | Electrophones |

The migration refuses unmapped categories, conflicting family assignments, a Keyboards/Digital pianos name collision, or unexpected instruments in Keyboards. It does not guess, merge categories, move unknown items, or delete records. The approved Keyboards mapping is limited to the inspected Yamaha P-145 Digital Piano. Each pending batch rolls back on these conflicts.

The local-only cleanup preceding the migration removed the explicitly approved nonsensical `Bothing` category and its `My botheing` item. The legitimate Guitars, Drums, digital piano, guitars, and Uncategorized violin were preserved. A complete local snapshot is retained in ignored `generated/pre-hierarchy-local-data.json`. That cleanup is not part of the migrations and will never run automatically against another database.

```powershell
npm run db:families:check
```

This read-only check reports all five families, category/item counts, unresolved categories, and global Uncategorized items. If an older Step 1 checkout created unresolved categories during the compatibility transition, explicitly classify them before applying migration 003. Do not choose a default family just to bypass the check.

For a fresh database, create the core tables, configure the local environment, run the migrations, and then optionally run `npm run db:seed`. The initial seed now supplies valid family IDs and uses Digital pianos rather than Keyboards. Its existing lock, transaction, and refusal to change populated tables remain intact. For a populated database, skip initial seeding and migrate existing records. The separate additive sample-data workflow belongs to Step 3.

## Production boundary

No production database was inspected or migrated for this local step, and the feature branch was not deployed. Before production migration, obtain approval, inspect its actual category/item mappings, take a backup, and rehearse the migration against a separate copy. Resolve unexpected categories without modifying already applied migration files. The final release must coordinate schema enforcement with the family-aware forms from Step 2; do not apply the final constraint while the old application is still accepting category writes.

## Tests

`npm test` runs database-free authorization tests and skips the opt-in database integration tests. `npm run test:db` requires an explicit local `PGHOST`, builds the templates, and runs migration and HTTP application tests in newly created, randomly named schemas. It checks both native and compiled EJS rendering, authorized/rejected writes, category moves, cross-family and Uncategorized transfers, and rollback when category deletion fails after a transfer update. Only those test schemas are dropped during cleanup; application tables are not dropped or recreated.

See [the before and planned-after diagrams](PROJECT_STRUCTURE.md) for the complete architecture target. Only the work described as implemented for the current step should be treated as complete.

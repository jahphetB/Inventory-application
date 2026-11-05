# Sample catalog import

The approved catalog has 70 categories and 350 new instruments: five per category. There are 21 primary-source-verified real identities and 329 explicitly fictional identities using the brand **Fictional Demo**. See [the dataset](../data/sampleCatalog/README.md), [the source registry](../data/sampleCatalog/sources.js), and [the approved taxonomy](TAXONOMY_PROPOSAL.md).

**All new prices and stock quantities are fictional demonstration data.** Product sources verify identities only, not seeded prices, stock, availability, or current retail listings. This notice belongs here rather than being repeated throughout the interface.

## Local commands in Windows PowerShell

Create the core schema only for a new database, configure `.env`, then run migrations. Never recreate populated tables:

```powershell
npm run db:migrate
npm.cmd run db:samples:import -- --remove-empty-legacy-drums
npm run db:samples:check
```

Use `npm.cmd` for commands forwarding `--` arguments in Windows PowerShell; the `npm.ps1` wrapper can omit the forwarded flag. The explicit cleanup flag is required only when the initial import encounters the legacy Drums category. Cleanup refuses a populated Drums category or an unexpected family. A transaction rolls back both the cleanup and every inserted record on any conflict.

The import command writes a consistent local pre-import archive to ignored `generated/sample-import-before-<timestamp>.json`. It contains inventory/provenance records, not database connection credentials. Preserve those archives if you need the original data for recovery. Recovery is a separate reviewed operation, not an automatic reset command.

After the catalog has been imported, rerun it without a cleanup flag:

```powershell
npm run db:samples:import
npm run db:samples:check
```

For a per-category report:

```powershell
npm.cmd run db:samples:check -- --details
```

## Coexistence with initial seeding and user inventory

`npm run db:seed` remains the small, optional initial seed and still refuses any populated inventory. It is not the large catalog importer. A fresh migrated database can use the catalog directly for 350 items, or run the small initial seed first and then the catalog for 354 items.

The existing Guitars and Digital pianos category IDs, descriptions, and instrument records are reused without modification. The approved empty legacy Drums category is removed only on the first import with the explicit flag. The existing Stentor violin remains globally Uncategorized. Existing real instruments are not counted among the five new samples per category.

No unrelated category or instrument is deleted. Matching category names are case-insensitive, but their family must match. A conflicting family or a preexisting unowned brand/model identity stops the entire transaction for review; the importer will not silently merge records or claim existing items as samples.

## Rerun behavior and provenance

Migration 004 adds `sample_catalog_categories` and `sample_catalog_items`. They record stable dataset/category/item keys, original definitions and hashes, revision, import time, and real/fictional source provenance. They are metadata tables, not another category level.

- Repeated imports skip registered keys, creating no duplicates and updating no existing inventory or provenance.
- User changes to names, descriptions, prices, stock, family placement, or item placement remain intact.
- Deleting an imported item or category sets its provenance reference to `NULL`. The stable key remains as a tombstone, so reruns do not recreate deliberately deleted records.
- A newly created user Drums category after the first import is not removed by reruns, even if the old cleanup flag is supplied.
- Editing an already registered dataset definition under the same stable key is rejected. Do not use source-data edits to silently change user inventory.
- Later approved additive revisions may append new category/item keys while retaining previous definitions. Tests cover adding a new revision without changing old rows. This does not authorize extra live categories beyond the approved 70.

The read-only check reports missing/deleted categories, changed family relationships, or fewer than five remaining samples in their original category. Such a report can reflect legitimate user edits or transfers. The importer will not undo them to make a check green.

## Verification performed locally

- Five fixed families, 70 categories, 350 imported sample keys, and 354 total instruments.
- Exactly five imported samples per approved category, with valid relationships and alphabetical category queries.
- All four original item records and the retained original category records preserved exactly; the original violin stays Uncategorized.
- Twenty-one verified real identities and 329 fictional identities, each with complete fields, valid prices, and whole-number stock.
- Actual import rerun created zero records and left all inventory/provenance records identical.
- Isolated-schema tests cover fresh databases, matching names, conflicting data, populated Drums, rollback after late failures, user edits/deletions/transfers, concurrent imports, and additive revisions.

## Production boundary

This step migrated and imported **only the local database**. The production database and deployed Worker remain unchanged. Before any production import, obtain separate approval, inspect its actual data, back it up, apply the reviewed migrations, resolve conflicts, and rehearse on a copy.

The CLI refuses a non-local `PGHOST` unless `--allow-remote` is explicitly supplied. That flag is a safeguard, not permission to perform a production operation. Never substitute Neon credentials into local `.env` to bypass the boundary.

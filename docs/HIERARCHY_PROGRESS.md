# Approved hierarchy work

Work proceeds one meaningful step at a time. After a step is verified, make at least two coherent implementation commits, push the approved feature branch, and wait for the user's `done`, `works`, or `next` before the following step. The separate baseline commit preserves the previous deployed application and does not count toward those implementation commits.

## Step 1: family model and local migration

- Added five immutable database-backed families, transactional versioned migrations, checksum protection, and isolated database tests.
- Preserved original category and item tables and all legitimate instrument records, with no identity changes.
- Mapped Guitars to Chordophones and Drums to Membranophones. Renamed Keyboards to Digital pianos under Electrophones, preserving its ID.
- Removed only the user-approved local Bothing category and its nonsensical item after archiving the complete local pre-migration data.
- Added family read/query helpers and a read-only mapping check; existing routes and forms remain compatible.
- Added [current-before and final-target Mermaid diagrams](PROJECT_STRUCTURE.md).
- Kept category family assignment nullable only for the Step 1 / Step 2 transition. No family mutation routes were added.

## Step 2: navigation and family-aware operations

- Home lists exactly five fixed families. `/families/:slug` lists only that family's categories; category pages lead to instruments and details through shared breadcrumbs. All items and global Uncategorized remain accessible.
- Family routing is read-only. Even a valid admin password cannot reach family create/edit/delete endpoints; database mutation protection remains in place.
- Category create/edit forms require a fixed family. A family-page Add category link preselects it. Moving a category updates one relationship, so all its instruments follow automatically.
- Instrument forms submit only a category ID and display family/category labels. The selected category's family is the source of truth; invalid or nonexistent category relationships are rejected. Category pages offer a preselected Add instrument link.
- Category deletion shows family/category transfer destinations and permits explicit cross-family or Uncategorized transfers. Tests force a failure after the item update and verify that both the transfer and deletion roll back together.
- Applied migration 003 locally after confirming no unresolved categories. All existing family, category, and item records match the local pre-step snapshot exactly. The ignored snapshot is `generated/pre-step-two-local-data.json`.
- The guarded initial seed now runs after migrations and supplies valid families. It still refuses populated inventory and never overwrites existing records.
- Regression checks cover six authorization tests and thirteen database/application integration tests, including native and compiled EJS paths. Production remains unchanged.
- Browser checks passed 48 page/runtime/viewport combinations across Node and Wrangler at desktop and mobile widths. Temporary test servers and browser sessions were stopped; existing inventory was compared with the local pre-step snapshot and remained unchanged.

## Step 3: approved taxonomy and sample inventory

- Implemented the approved 70-category catalog with five distinct new samples per category, organized in five family data files. Primary-source metadata verifies 21 real brand/model identities; 329 use the explicit Fictional Demo brand. Every seeded price and stock value is fictional demonstration data.
- Preserved the small initial seed and its populated-inventory safeguard. Added separate validation, import, and read-only check commands.
- Migration 004 adds provenance tables with stable keys, canonical definition hashes, revision/source metadata, and nullable references that preserve deletion tombstones.
- The importer serializes concurrent runs and uses one transaction. Name/family conflicts, unowned identity collisions, modified dataset definitions, or a populated Drums category stop and roll back the whole operation.
- Removed only the approved empty local Drums category. The original four instruments and the retained original category IDs/descriptions remain unchanged, including the globally Uncategorized Stentor violin.
- The local catalog now has five families, 70 categories, and 354 instruments. Each approved category contains five new samples. An actual rerun skipped all 350 imported keys and changed no inventory or provenance rows.
- Tests cover fresh/initially seeded databases, case-insensitive reuse, user edits/deletions/transfers, concurrent reruns, conflict rollback, and later additive revisions. See [sample-data documentation](SAMPLE_DATA.md) for commands, source identities, archives, and production boundaries.
- Verification passed ten database-free authorization/catalog tests and twenty-one database/application integration tests. Both Node and Wrangler rendered all five families, all seventy category pages, representative sample details, the 354-item list, category selectors, and the original Uncategorized violin.

## Approved decisions for the remaining steps

- Keep one global Uncategorized view outside the five families, using nullable `items.category_id`.
- Use practical catalog classification: acoustic/electric strings stay in Chordophones; digital pianos and electronic instruments belong in Electrophones. This follows the user's Stratocaster example rather than claiming strict expanded MIMO classification.
- Admins may move a category between families; items follow their category. Transfers may cross families, with explicit family/category labels. Keep transfer and deletion atomic.
- Retain global, case-insensitive category-name uniqueness.
- Require the existing admin password for all category/item create, edit, and delete requests. No user accounts or registration.
- Steps 2 and 3 are implemented; Step 4 still requires its separate checkpoint.
- The user approved the final Step 3 option: 70 catalog categories, 350 new samples, and removal of the still-empty legacy Drums category. Existing inventory remains additional. Product identities are verified where practical and explicitly fictional otherwise; prices and stock are fictional demonstration data.
- Preserve the legacy seed's populated-database safeguard. Add a separate, transactional, rerunnable import workflow with stable sample keys; do not overwrite user inventory.
- Step 4: remove filler, add an original SVG favicon through a shared head mechanism, preserve the dark studio theme, and complete local/runtime/data/production-build verification.

## Release and Git boundaries

The approved branch is `feat/instrument-hierarchy`, pushed to `origin`. No force pushes. Include no credentials, generated templates, local archives, or unrelated changes.

Permission to push is not permission to migrate production or deploy. Prepare those actions and request separate authorization. The two diagrams are architectural documentation; the final-target diagram does not imply that future steps are implemented.

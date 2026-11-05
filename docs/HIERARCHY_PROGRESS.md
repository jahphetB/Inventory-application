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

## Approved decisions for the remaining steps

- Keep one global Uncategorized view outside the five families, using nullable `items.category_id`.
- Use practical catalog classification: acoustic/electric strings stay in Chordophones; digital pianos and electronic instruments belong in Electrophones. This follows the user's Stratocaster example rather than claiming strict expanded MIMO classification.
- Admins may move a category between families; items follow their category. Transfers may cross families, with explicit family/category labels. Keep transfer and deletion atomic.
- Retain global, case-insensitive category-name uniqueness.
- Require the existing admin password for all category/item create, edit, and delete requests. No user accounts or registration.
- Step 2 is implemented below; Steps 3 and 4 still require their separate checkpoints.
- Step 3: reconfirm the complete taxonomy and exact counts before creating sample inventory. The initial proposal has 70 catalog categories and at least 350 new sample entries, plus retained existing inventory. The legitimate legacy Drums category is retained and must be accounted for in the final count. Use verified real products where practical and explicitly fictional identities otherwise; prices and stock are fictional demonstration data.
- Preserve the legacy seed's populated-database safeguard. Add a separate, transactional, rerunnable import workflow with stable sample keys; do not overwrite user inventory.
- Step 4: remove filler, add an original SVG favicon through a shared head mechanism, preserve the dark studio theme, and complete local/runtime/data/production-build verification.

## Release and Git boundaries

The approved branch is `feat/instrument-hierarchy`, pushed to `origin`. No force pushes. Include no credentials, generated templates, local archives, or unrelated changes.

Permission to push is not permission to migrate production or deploy. Prepare those actions and request separate authorization. The two diagrams are architectural documentation; the final-target diagram does not imply that future steps are implemented.

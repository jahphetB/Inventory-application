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

## Approved decisions for the remaining steps

- Keep one global Uncategorized view outside the five families, using nullable `items.category_id`.
- Use practical catalog classification: acoustic/electric strings stay in Chordophones; digital pianos and electronic instruments belong in Electrophones. This follows the user's Stratocaster example rather than claiming strict expanded MIMO classification.
- Admins may move a category between families; items follow their category. Transfers may cross families, with explicit family/category labels. Keep transfer and deletion atomic.
- Retain global, case-insensitive category-name uniqueness.
- Require the existing admin password for all category/item create, edit, and delete requests. No user accounts or registration.
- Step 2: family-aware navigation, forms, validation, and final required-family constraint. Check for any categories created during the compatibility transition before enforcing it.
- Step 3: reconfirm the complete taxonomy and exact counts before creating sample inventory. The initial proposal has 70 catalog categories and at least 350 new sample entries, plus retained existing inventory. The legitimate legacy Drums category is retained and must be accounted for in the final count. Use verified real products where practical and explicitly fictional identities otherwise; prices and stock are fictional demonstration data.
- Preserve the legacy seed's populated-database safeguard. Add a separate, transactional, rerunnable import workflow with stable sample keys; do not overwrite user inventory.
- Step 4: remove filler, add an original SVG favicon through a shared head mechanism, preserve the dark studio theme, and complete local/runtime/data/production-build verification.

## Release and Git boundaries

The approved branch is `feat/instrument-hierarchy`, pushed to `origin`. No force pushes. Include no credentials, generated templates, local archives, or unrelated changes.

Permission to push is not permission to migrate production or deploy. Prepare those actions and request separate authorization. The two diagrams are architectural documentation; the final-target diagram does not imply that future steps are implemented.

# Production release — November 5, 2026

The user approved releasing the completed hierarchy, catalog, interface cleanup, favicon, and instrument description alignment correction.

Live application: https://inventory-application.jahphet.workers.dev/

- Application source commit: `5ad9a98` on `feat/instrument-hierarchy`.
- Active Cloudflare Worker version: `eb17c749-2dec-44bc-9546-e3bf90a7dcf6` (100% traffic).
- Production database: 5 families, 70 categories, 355 instruments.
- All 5 pre-release instruments were preserved unchanged. Production already contained Kirar in addition to the 4 original instruments present locally, so local and production totals intentionally differ.

## Release procedure

1. Corrected description whitespace in the detail template and stylesheet; verified alignment locally at desktop and mobile widths.
2. Inspected the existing production data and mappings, saved a PostgreSQL custom-format backup, and checked its archive contents.
3. Restored that backup into a separate temporary local database. Rehearsed all four migrations and the sample import, checked preservation of the five originals, and checked rerun behavior. Removed the temporary rehearsal database afterward.
4. Published a temporary maintenance response to prevent writes through the old application during schema enforcement.
5. Confirmed production still matched the reviewed snapshot and took a second backup during maintenance.
6. Applied migrations 001–004, removed only the empty legacy Drums category, reused two existing categories, created 68 categories, and imported 350 sample instruments. Verified the resulting catalog and original records.
7. Rebuilt the 13 EJS templates and deployed the application, CSS, favicon, and production Hyperdrive binding through Wrangler. Restored normal public traffic.
8. Verified 27 live HTTP checks: representative pages/forms, all five families, 355 item cards, exact local/live CSS and favicon matches, rejection of all six unauthenticated write routes, and valid-password validation without a database write. Browser measurements at 1280px and 390px confirmed matching Brand/Description/Price alignment and no horizontal overflow.

Ignored local release evidence and both database backups are in `generated/production-release/`. Credentials and backups are not committed. PostgreSQL migration and import changes affect data independently of Worker deployment; rolling back only the Worker is not a complete database rollback procedure.

Earlier local-step notes describe their historical state. This release supersedes their statements that production had not yet been updated. Future production changes still require authorization; deploying the Worker and pushing Git commits remain separate operations.

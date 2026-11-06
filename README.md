# Studio Inventory

A musical instrument inventory application. Browse collections, inspect instrument details, and manage prices and stock in a dark studio interface.

[Live application](https://inventory-application.jahphet.workers.dev/)

## Features

- Five fixed instrument families with Home → Family → Category → Instrument navigation, breadcrumbs, All items, and global Uncategorized views.
- Category and instrument creation, editing, and deletion.
- Optional categories, with unassigned instruments listed under Uncategorized.
- Category deletion transfers its instruments to another collection or Uncategorized in one database transaction.
- Case-insensitive unique category names, required instrument names and brands, nonnegative prices with at most two decimal places, and nonnegative whole-number stock.
- Public browsing, with an admin password required for **every** create, edit, and delete request.
- Categories require a fixed family; administrators can move categories between families, with their instruments following automatically.
- Responsive forms, validation messages, shared navigation, and instrument lists.

## Stack

Express 5, EJS, PostgreSQL through `pg`, parameterized SQL, `express-validator`, ES modules, and plain CSS. Production runs on Cloudflare Workers, with Neon PostgreSQL accessed through Hyperdrive.

Use Node.js **22 or newer**. This Windows setup was verified with Node 22.13.0, npm 10.9.2, and PostgreSQL 18.6. PostgreSQL must include the server, not just the command-line client.

## Local setup in PowerShell

Run commands from the repository root. For a fresh checkout, install the locked dependencies:

```powershell
npm ci
```

If the dependencies are already installed and working, a reinstall is unnecessary.

### PostgreSQL

Ensure your local PostgreSQL service is running. The PostgreSQL 18 Windows installer normally registers `postgresql-x64-18`; starting a stopped service may require an administrator PowerShell:

```powershell
Get-Service postgresql-x64-18
Start-Service postgresql-x64-18
```

For a **new local database**, connect as the PostgreSQL administrator:

```powershell
psql -h localhost -U postgres -d postgres
```

Run these commands inside `psql`. `\password` prompts for the application-role password without placing it in a SQL command:

```sql
CREATE ROLE inventory_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password inventory_app
CREATE DATABASE inventory_db OWNER inventory_app;
\q
```

If the role or database already exists, inspect and reuse it. Do not drop existing data or reset an existing password as part of routine setup.

Apply the schema **once**, only when the expected tables do not already exist:

```powershell
psql -h localhost -U inventory_app -d inventory_db -f .\db\schema.sql
```

The application role owns its local database and the tables and identity sequences it creates. It does not need PostgreSQL administrator privileges for CRUD or category transfers.

### Local configuration

For a fresh checkout, copy the examples. Preserve existing local configuration files if you already have them:

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

Edit the local files in your editor:

| Setting | Local value |
| --- | --- |
| `PORT` | `3000` in `.env` |
| `LOCAL_DEVELOPMENT` | `"true"` in `.dev.vars` |
| `PGHOST` | `localhost` |
| `PGPORT` | `5432` |
| `PGDATABASE` | `inventory_db` |
| `PGUSER` | `inventory_app` |
| `PGPASSWORD` | Your local application-role password |
| `ADMIN_PASSWORD` | Your chosen inventory admin password |

Set the same `ADMIN_PASSWORD` in both local files. It is independent of the database password. Quote password values with a quote character that does not occur inside the password. Keep credentials out of source files, screenshots, and shell commands.

`.env`, `.dev.vars`, their secret variants, `.wrangler/`, and generated templates are ignored by Git. The example files intentionally contain empty passwords. Local development uses the local PostgreSQL connection without production SSL or Neon credentials.

### Check and seed

Apply migrations before using the current category forms or initial seed:

```powershell
npm run db:migrate
npm run db:check
npm run db:families:check
```

If both tables are empty, load the sample inventory:

```powershell
npm run db:seed
```

The seed creates Guitars under Chordophones, Digital pianos under Electrophones, and Drums under Membranophones, with Fender Player Stratocaster, Yamaha F310 Acoustic Guitar, Yamaha P-145 Digital Piano, and an Uncategorized Stentor Student Violin. Drums starts empty. The seed refuses to change a database that already contains records.

The migrations preserve existing instrument records and add five fixed instrument families. They map Guitars to Chordophones, Drums to Membranophones, and rename the inspected Keyboards category to Digital pianos under Electrophones. Unexpected categories or conflicting mappings stop the transaction for review. On a populated database, skip initial seeding; do not recreate its tables.

The Step 2 constraint requires a valid family for every category. Existing items retain their fields and category IDs. An item's family is derived from its category; the item form submits only the category, labelled with its family. Global Uncategorized remains available outside the five families. See [migration details](docs/MIGRATIONS.md) and the [before and planned-after Mermaid diagrams](docs/PROJECT_STRUCTURE.md).

For the full approved demonstration catalog, use the separate additive importer:

```powershell
npm.cmd run db:samples:import -- --remove-empty-legacy-drums
npm run db:samples:check
```

This adds 70 catalog categories with five new samples each, reusing matching existing categories. It removes the legacy Drums category only if it is still empty and the explicit first-import flag is supplied. The current local database has 354 instruments, including its four preserved originals. Later reruns with `npm run db:samples:import` preserve user edits and deletions without duplicating records. All new prices and stock values are fictional; identities are source-verified or explicitly fictional. Read [the sample-data documentation](docs/SAMPLE_DATA.md) before importing.

### Run development

Normal Node development:

```powershell
npm run dev
```

Open <http://localhost:3000>. Node watches source changes; restart after changing environment settings.

Local Workers development:

```powershell
npx wrangler dev --local
```

Open the local address Wrangler prints, normally <http://localhost:8787>. `.dev.vars` enables the local database connection. The configured build compiles EJS templates before starting Workers development.

Stop either development server with `Ctrl+C`.

## Admin password

Each form for creating, editing, or deleting an instrument or category requires the configured admin password. Password checks happen on the server before input validation or database access. Missing or incorrect passwords return a themed HTTP 403 page. An unconfigured admin password blocks changes with HTTP 503.

The password field is never populated from a submitted value. The server compares password hashes using a timing-safe comparison. Workers configuration is scoped to each request; local Node reads `ADMIN_PASSWORD` from its environment. This is a shared-password workflow rather than individual user accounts or login sessions.

## Checks

```powershell
npm test
npm run build:views
npm run db:check
npm run test:db
```

The automated tests use Node's built-in test runner. `npm test` checks authorization and catalog definitions without a database and skips the opt-in integration tests. `npm run test:db` rebuilds templates and verifies migrations, native/compiled browsing, protected CRUD, transfers, the guarded initial seed, and additive sample imports in isolated local schemas. Import tests cover reruns, edits/deletions, conflicts, rollback, concurrency, and later additions. `db:check` separately verifies the configured database and table access.

## Production deployment

The hierarchy and catalog were released to production with approval on November 5, 2026. See the [release record](docs/PRODUCTION_RELEASE.md) for the backup, rehearsal, migration, deployment, and live verification details.

Local migrations do not update production. Future schema changes require an approved production backup, mapping review, migration, and coordinated deployment before deploying code that reads the changed schema. Follow the standard commands below only as part of an approved release. See [the production boundary](docs/MIGRATIONS.md#production-boundary).

The existing production Worker uses the `production` environment in `wrangler.jsonc`, including its Hyperdrive binding and static assets. Local PostgreSQL settings are not production configuration.

Authenticate, set the production admin password through Wrangler's hidden input prompt, and deploy:

```powershell
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD --env production
npx wrangler deploy --env production
```

The deployment command rebuilds the EJS templates and uploads the Worker and static assets. If deploying your own copy, configure your own Hyperdrive connection and update the binding ID first. Keep Neon credentials in Hyperdrive, not in the repository or local application configuration.

After deployment, verify the live homepage, stylesheet, forms, and password rejection behavior. Deploying a Worker and pushing Git commits are separate actions.

The `pg-cloudflare` override remains pinned to **1.4.0** because 1.4.1 previously caused socket-close errors during connection cleanup. Keep the verified compatibility date unless a runtime requirement calls for a change.

## Project layout

| Path | Responsibility |
| --- | --- |
| `app.js`, `server.js` | Shared Express application and local Node entry point |
| `worker.js` | Workers HTTP adapter and per-request database/password configuration |
| `routes/`, `controllers/` | Route definitions, request handling, and rendered responses |
| `middleware/`, `security/` | Admin authorization and password comparison |
| `validators/` | Instrument input validation |
| `db/` | Database pool, parameterized queries, and initial schema |
| `views/`, `public/styles/` | EJS pages, shared partials, and theme |
| `rendering/`, `scripts/buildViews.js` | Compiled EJS rendering for Workers |
| `scripts/` | Database checks, guarded seed, and template utilities |
| `tests/` | Authorization regression tests |

## Troubleshooting

- **`.env: not found`:** create local configuration from the example before running Node scripts.
- **Connection refused on port 5432:** check the PostgreSQL server service and the configured host/port.
- **Password authentication failed:** verify the local role password and `PGPASSWORD`; do not substitute production credentials.
- **Relation does not exist:** check the selected database and whether its initial schema was applied.
- **Changes temporarily unavailable:** configure `ADMIN_PASSWORD` for the runtime you are using, then restart local development or update the production secret.
- **Wrangler is not authenticated:** run `npx wrangler login` before production commands. Local development does not need production database access.

# Project structure: before and planned after

The first diagram records the working application at baseline commit `a33c5e2`, before the instrument-family reorganization. The second is the approved final target, not a claim that all four steps are implemented. Both diagrams use the existing Express/EJS/PostgreSQL architecture.

## Before the hierarchy changes

```mermaid
flowchart TD
	subgraph entries[Runtime entry points]
		Node["server.js · local Node"]
		Worker["worker.js · Cloudflare Workers"]
		App["app.js · shared Express application"]
		Node --> App
		Worker --> App
	end
	subgraph requests[Request handling]
		Routes["routes/ · home, categories, items"]
		Guard["middleware/requireAdminPassword.js"]
		Password["security/adminPassword.js · environment / request context"]
		Validation["validators/ + category validation"]
		Controllers["controllers/ · category and instrument CRUD"]
		App --> Routes
		Routes -->|all writes| Guard
		Guard --> Password
		Guard --> Validation --> Controllers
		Routes -->|public reads| Controllers
	end
	subgraph storage[Data access and existing model]
		Queries["db/queries.js · parameterized SQL"]
		Pool["db/pool.js · local / request-scoped pool"]
		Database["Local PostgreSQL / production Neon through Hyperdrive"]
		Categories["categories · id, name, description"]
		Items["items · instrument details, price, stock, nullable category_id"]
		Controllers --> Queries --> Pool --> Database
		Database --- Categories
		Categories -->|zero or many| Items
		Seed["scripts/seed.js · empty-database safeguard"] --> Pool
	end
	subgraph rendering[Rendering and assets]
		Views["views/ · home, lists, forms, details, delete, admin error"]
		Partials["views/partials/ · navigation and admin password"]
		Build["scripts/buildViews.js"]
		Compiled["generated/views.js · ignored build output"]
		Adapter["rendering/compiledViews.js"]
		CSS["public/styles/main.css · dark studio theme"]
		Controllers --> Views --> Partials
		Views --> Build --> Compiled --> Adapter
		Adapter --> Worker
		App --> CSS
	end
	Tests["tests/ · password and protected-route tests"] -.-> requests
	Config["wrangler.jsonc · production assets + Hyperdrive; ignored local env files"] -.-> entries
```

## Approved final target after all four steps

```mermaid
flowchart TD
	Node["server.js · local Node"] --> App["app.js · shared Express application"]
	Worker["worker.js · Workers + Hyperdrive + request-scoped admin secret"] --> App
	App --> Routes["routes/ · home, families, categories, items"]
	Routes -->|public browsing| Controllers["controllers/ · family/category/item browsing and CRUD"]
	Routes -->|category/item writes only| Guard["existing admin-password middleware + relationship validation"]
	Guard --> Controllers
	Controllers --> Queries["db/queries.js · family-aware parameterized queries"]
	Queries --> Pool["existing local / request-scoped database pool"]
	Pool --> Database["Local PostgreSQL / Neon through Hyperdrive"]
	subgraph model[Exactly three inventory levels]
		Families["families · five fixed records; no mutation endpoints"]
		Categories["categories · required family_id after Step 2"]
		Items["items · existing fields and optional category_id"]
		Families -->|one to many| Categories -->|one to many| Items
		Uncategorized["Global Uncategorized view · items with no category; not a sixth family"] -.-> Items
	end
	Database --- model
	Migrate["scripts/migrate.js + db/migrate.js + db/migrations/ · transactional, recorded migrations"] --> Database
	LegacySeed["existing guarded seed · adapted to families"] --> Pool
	SampleData["separate taxonomy/sample data · approved categories + at least five samples each"] --> Import["additive importer + stable import keys / provenance"] --> Pool
	Controllers --> Views["views/ · home → family → category → items → details; All items retained"]
	Views --> Partials["shared head, navigation, password field"]
	Partials --> Assets["public/ · existing theme + original SVG favicon"]
	Views --> Build["existing EJS build → ignored generated templates → compiled rendering adapter"] --> Worker
	Tests["tests/ · authorization, migrations, relationships, transfer safeguards, data integrity"] -.-> Controllers
	Tests -.-> Migrate
	Checks["Node + Wrangler + responsive browser checks + production dry run"] -.-> App
	Docs["README + migration/seed documentation + release instructions"] -.-> Checks
```

The planned importer filenames and provenance storage will be finalized in Step 3. No additional item-category table, user-account system, or framework is planned. Production migration and deployment require separate approval; pushing this feature branch does not authorize either action.

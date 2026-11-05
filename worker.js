import { handleAsNodeRequest } from "cloudflare:node";
import app from "./app.js";
import templates from "./generated/views.js";
import { configureCompiledViews } from "./rendering/compiledViews.js";
import { createDatabasePool, runWithDatabase } from "./db/pool.js";
import { runWithAdminPassword } from "./security/adminPassword.js";

configureCompiledViews(app, templates);

// In Workers, this port identifies the internal HTTP server.
app.listen(8080);

function getDatabaseOptions(env) {
	if (env.HYPERDRIVE?.connectionString) {
		return {
			connectionString: env.HYPERDRIVE.connectionString,
		};
	}

	if (env.LOCAL_DEVELOPMENT === "true") {
		if (
			!env.PGHOST ||
			!env.PGDATABASE ||
			!env.PGUSER ||
			typeof env.PGPASSWORD !== "string"
		) {
			throw new Error("Local database configuration is incomplete.");
		}

		return {
			host: env.PGHOST,
			port: Number(env.PGPORT || 5432),
			database: env.PGDATABASE,
			user: env.PGUSER,
			password: env.PGPASSWORD,
		};
	}

	throw new Error("The production Hyperdrive binding is missing.");
}

export default {
	async fetch(request, env, ctx) {
		const databasePool = createDatabasePool(getDatabaseOptions(env));

		try {
			return await runWithAdminPassword(
				env.ADMIN_PASSWORD,
				() => runWithDatabase(
					databasePool,
					() => handleAsNodeRequest(8080, request),
				),
			);
		} finally {
			ctx.waitUntil(
				databasePool.end().catch((error) => {
					console.error("Database cleanup failed:", error.message);
				}),
			);
		}
	},
};

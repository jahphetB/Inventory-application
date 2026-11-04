import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";

const { Pool } = pg;

const databaseContext = new AsyncLocalStorage();

let localPool;

export function createDatabasePool(options = {}) {
	const databasePool = new Pool({
		connectionTimeoutMillis: 5000,
		...options,
	});

	databasePool.on("error", (error) => {
		console.error(
			"Unexpected error on an idle database connection:",
			error.message,
		);
	});

	return databasePool;
}

export function runWithDatabase(databasePool, callback) {
	return databaseContext.run(databasePool, callback);
}

function getActivePool() {
	const requestPool = databaseContext.getStore();

	if (requestPool) {
		return requestPool;
	}

	if (!localPool) {
		localPool = createDatabasePool();
	}

	return localPool;
}

const pool = {
	query(...args) {
		return getActivePool().query(...args);
	},

	connect(...args) {
		return getActivePool().connect(...args);
	},

	async end() {
		const requestPool = databaseContext.getStore();

		if (requestPool) {
			await requestPool.end();
			return;
		}

		if (localPool) {
			await localPool.end();
			localPool = undefined;
		}
	},
};

export default pool;
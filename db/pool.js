import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
	connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
	console.error("Unexpected error on an idle database connection:", error.message);
});

export default pool;
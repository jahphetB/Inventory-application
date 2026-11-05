import { spawn } from "node:child_process";

if (!["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST)) {
	throw new Error("Database integration tests require an explicit local PGHOST.");
}

const child = spawn(process.execPath, ["--test", "tests/migrations.integration.test.js"], {
	stdio: "inherit",
	env: { ...process.env, INVENTORY_DATABASE_TESTS: "true" },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });

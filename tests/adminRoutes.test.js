import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../app.js";
import pool from "../db/pool.js";

let server;
let base;
let databaseQueries = 0;
const originalQuery = pool.query;
const originalPassword = process.env.ADMIN_PASSWORD;
const routes = ["/items/new", "/items/1/edit", "/items/1/delete", "/categories/new", "/categories/1/edit", "/categories/1/delete"];

before(async () => {
	pool.query = async () => {
		databaseQueries += 1;
		throw new Error("Unauthorized requests must never query the database.");
	};
	server = await new Promise((resolve) => {
		const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
	});
	base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
	pool.query = originalQuery;
	if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
	else process.env.ADMIN_PASSWORD = originalPassword;
	await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("every mutation rejects missing, incorrect, and repeated password fields before querying", async () => {
	process.env.ADMIN_PASSWORD = "test-only-password";
	const repeated = new URLSearchParams();
	repeated.append("admin_password", "test-only-password");
	repeated.append("admin_password", "test-only-password");
	for (const route of routes) {
		for (const body of [new URLSearchParams(), new URLSearchParams({ admin_password: "invalid-no-echo" }), repeated]) {
			const response = await fetch(base + route, { method: "POST", body, redirect: "manual" });
			assert.equal(response.status, 403, route);
			assert.equal(response.headers.get("cache-control"), "no-store");
			const html = await response.text();
			assert.ok(html.includes("Admin access required"));
			assert.ok(!html.includes("invalid-no-echo"));
		}
	}
	assert.equal(databaseQueries, 0);
});

test("every mutation is unavailable when the admin password is unconfigured", async () => {
	delete process.env.ADMIN_PASSWORD;
	for (const route of routes) {
		const response = await fetch(base + route, { method: "POST", body: new URLSearchParams(), redirect: "manual" });
		assert.equal(response.status, 503, route);
	}
	assert.equal(databaseQueries, 0);
});

test("correct password reaches normal validation and is never echoed", async () => {
	process.env.ADMIN_PASSWORD = "test-only-password";
	const response = await fetch(base + "/categories/new", {
		method: "POST",
		body: new URLSearchParams({ name: "", admin_password: "test-only-password" }),
	});
	assert.equal(response.status, 400);
	const html = await response.text();
	assert.ok(html.includes("Category name is required."));
	assert.ok(!html.includes("test-only-password"));
	assert.ok(html.includes('type="password"'));
	assert.equal(databaseQueries, 0);
});

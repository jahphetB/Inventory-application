import assert from "node:assert/strict";
import test from "node:test";
import { checkAdminPassword, runWithAdminPassword } from "../security/adminPassword.js";

test("missing configuration fails closed", () => {
	assert.equal(runWithAdminPassword(undefined, () => checkAdminPassword("anything")), "unconfigured");
	assert.equal(runWithAdminPassword("", () => checkAdminPassword("")), "unconfigured");
});

test("only the exact string password is accepted", () => {
	runWithAdminPassword("test-only-password", () => {
		assert.equal(checkAdminPassword("test-only-password"), "valid");
		for (const value of [undefined, null, [], {}, "", "wrong", "test-only-password ", "x".repeat(1025)]) {
			assert.equal(checkAdminPassword(value), "invalid");
		}
	});
});

test("concurrent Worker requests keep their password bindings isolated", async () => {
	await Promise.all(["first-test-password", "second-test-password"].map((password) =>
		runWithAdminPassword(password, async () => {
			await new Promise((resolve) => setImmediate(resolve));
			assert.equal(checkAdminPassword(password), "valid");
			assert.equal(checkAdminPassword("different-password"), "invalid");
		}),
	));
});

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, timingSafeEqual } from "node:crypto";

const passwordContext = new AsyncLocalStorage();

export function runWithAdminPassword(password, callback) {
	return passwordContext.run({ password }, callback);
}

export function checkAdminPassword(submitted) {
	const context = passwordContext.getStore();
	const expected = context ? context.password : process.env.ADMIN_PASSWORD;

	if (typeof expected !== "string" || expected.length === 0) {
		return "unconfigured";
	}

	if (typeof submitted !== "string" || submitted.length > 1024) {
		return "invalid";
	}

	const hash = (value) => createHash("sha256").update(value).digest();
	return timingSafeEqual(hash(submitted), hash(expected)) ? "valid" : "invalid";
}

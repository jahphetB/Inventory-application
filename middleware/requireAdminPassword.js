import { checkAdminPassword } from "../security/adminPassword.js";

export function requireAdminPassword(req, res, next) {
	const result = checkAdminPassword(req.body?.admin_password);

	if (result === "valid") {
		return next();
	}

	const unavailable = result === "unconfigured";
	res.set("Cache-Control", "no-store");
	return res.status(unavailable ? 503 : 403).render("admin/required", {
		title: unavailable ? "Changes temporarily unavailable" : "Admin access required",
		message: unavailable
			? "Changes are temporarily unavailable. Please try again later."
			: "The admin password was missing or incorrect. Return to the form and enter the correct password to make this change.",
		cancelUrl: req.baseUrl + req.path,
	});
}

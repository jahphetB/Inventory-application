import path from "node:path";

function normalizeViewName(view) {
	const name = path.posix.normalize(view.replace(/\\/g, "/"))
		.replace(/\.ejs$/, "");

	if (name.startsWith("../") || path.posix.isAbsolute(name)) {
		throw new Error("Invalid compiled view name.");
	}

	return name;
}

export function configureCompiledViews(app, templates) {
	function renderTemplate(view, data) {
		const name = normalizeViewName(view);

		if (!Object.hasOwn(templates, name)) {
			throw new Error(`Compiled view not found: ${name}`);
		}

		const locals = Object.assign(Object.create(null), data);

		function include(includePath, includeData = {}) {
			const includedView = includePath.startsWith("/")
				? includePath.slice(1)
				: path.posix.join(path.posix.dirname(name), includePath);

			return renderTemplate(
				includedView,
				Object.assign(Object.create(null), locals, includeData),
			);
		}

		return templates[name](locals, undefined, include);
	}

	app.render = function render(view, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}

		let html;

		try {
			const data = Object.assign(
				Object.create(null),
				app.locals,
				options?._locals,
				options,
			);

			html = renderTemplate(view, data);
		} catch (error) {
			return callback(error);
		}

		return callback(null, html);
	};
}
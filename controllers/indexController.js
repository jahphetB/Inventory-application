import {
	getCategoriesWithCounts,
	getUncategorizedItemCount,
} from "../db/queries.js";

export async function getHome(req, res, next) {
	try {
		const [categories, uncategorizedCount] = await Promise.all([
			getCategoriesWithCounts(),
			getUncategorizedItemCount(),
		]);

		res.render("index", {
			title: "Musical Instrument Inventory",
			categories,
			uncategorizedCount,
		});
	} catch (error) {
		next(error);
	}
}

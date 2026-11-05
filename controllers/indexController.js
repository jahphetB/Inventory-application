import {
	getFamiliesWithCounts,
	getUncategorizedItemCount,
} from "../db/queries.js";

export async function getHome(req, res, next) {
	try {
		const [families, uncategorizedCount] = await Promise.all([
			getFamiliesWithCounts(),
			getUncategorizedItemCount(),
		]);

		res.render("index", {
			title: "Musical Instrument Inventory",
			families,
			uncategorizedCount,
		});
	} catch (error) {
		next(error);
	}
}

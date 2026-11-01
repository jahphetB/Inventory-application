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

import {
	getAllItems,
	getUncategorizedItems,
} from "../db/queries.js";

const priceFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export async function getItemList(req, res, next) {
	try {
		const items = await getAllItems();

		res.render("items/list", {
			title: "All instruments",
			items,
			priceFormatter,
		});
	} catch (error) {
		next(error);
	}
}

export async function getUncategorizedItemList(req, res, next) {
	try {
		const items = await getUncategorizedItems();

		res.render("items/list", {
			title: "Uncategorized instruments",
			items,
			priceFormatter,
		});
	} catch (error) {
		next(error);
	}
}
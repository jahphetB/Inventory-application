import {
	getAllItems,
	getUncategorizedItems,
    getItemById,
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

export async function getItemDetail(req, res, next) {
	const { id } = req.params;
	const numericId = Number(id);

	if (
		!/^\d+$/.test(id) ||
		!Number.isInteger(numericId) ||
		numericId < 1 ||
		numericId > 2147483647
	) {
		return res.status(404).send("Instrument not found.");
	}

	try {
		const item = await getItemById(numericId);

		if (!item) {
			return res.status(404).send("Instrument not found.");
		}

		res.render("items/detail", {
			title: item.name,
			item,
			priceFormatter,
		});
	} catch (error) {
		next(error);
	}
}
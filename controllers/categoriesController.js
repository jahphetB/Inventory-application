import {
	getCategoryById,
	getItemsByCategoryId,
} from "../db/queries.js";

const priceFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export async function getCategoryDetail(req, res, next) {
	const { id } = req.params;
	const numericId = Number(id);

	if (
		!/^\d+$/.test(id) ||
		!Number.isInteger(numericId) ||
		numericId < 1 ||
		numericId > 2147483647
	) {
		return res.status(404).send("Category not found.");
	}

	try {
		const category = await getCategoryById(numericId);

		if (!category) {
			return res.status(404).send("Category not found.");
		}

		const items = await getItemsByCategoryId(numericId);

		res.render("items/list", {
			title: category.name,
			category,
			items,
			priceFormatter,
		});
	} catch (error) {
		next(error);
	}
}
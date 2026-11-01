import {
	getAllItems,
	getUncategorizedItems,
    getItemById,
    createItem,
    getCategoriesWithCounts,
} from "../db/queries.js";

import { validationResult } from "express-validator";

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

async function renderItemCreateForm(res, item, errors = [], status = 200) {
	const categories = await getCategoriesWithCounts();

	return res.status(status).render("items/form", {
		title: "Create instrument",
		action: "/items/new",
		submitLabel: "Create instrument",
		cancelUrl: "/items",
		item,
		categories,
		errors,
	});
}

export async function getItemCreate(req, res, next) {
	try {
		await renderItemCreateForm(res, {
			name: "",
			brand: "",
			description: "",
			price: "",
			stock_quantity: "0",
			category_id: "",
		});
	} catch (error) {
		next(error);
	}
}

export async function postItemCreate(req, res, next) {
	const fields = [
		"name",
		"brand",
		"description",
		"price",
		"stock_quantity",
		"category_id",
	];

	const item = Object.fromEntries(
		fields.map((field) => [
			field,
			typeof req.body?.[field] === "string" ? req.body[field] : "",
		]),
	);

	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return await renderItemCreateForm(
				res,
				item,
				errors.array().map((error) => error.msg),
				400,
			);
		}

		const createdItem = await createItem({
			...item,
			category_id: item.category_id === "uncategorized"
				? null
				: Number(item.category_id),
		});

		return res.redirect(303, `/items/${createdItem.id}`);
	} catch (error) {
		if (
			error.code === "23503" &&
			error.constraint === "items_category_id_fkey"
		) {
			try {
				return await renderItemCreateForm(
					res,
					item,
					["The selected category no longer exists. Choose another."],
					400,
				);
			} catch (renderError) {
				return next(renderError);
			}
		}

		next(error);
	}
}
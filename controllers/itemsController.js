import {
	getAllItems,
	getUncategorizedItems,
    getItemById,
    createItem,
    getCategoriesWithCounts,
    updateItem,
    deleteItem,
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

function parseItemId(value) {
	const id = Number(value);

	if (
		!/^\d+$/.test(value) ||
		!Number.isInteger(id) ||
		id < 1 ||
		id > 2147483647
	) {
		return null;
	}

	return id;
}

async function renderItemEditForm(res, item, errors = [], status = 200) {
	const categories = await getCategoriesWithCounts();

	return res.status(status).render("items/form", {
		title: "Edit instrument",
		action: `/items/${item.id}/edit`,
		submitLabel: "Save changes",
		cancelUrl: `/items/${item.id}`,
		item,
		categories,
		errors,
	});
}

export async function getItemEdit(req, res, next) {
	const id = parseItemId(req.params.id);

	if (id === null) {
		return res.status(404).send("Instrument not found.");
	}

	try {
		const item = await getItemById(id);

		if (!item) {
			return res.status(404).send("Instrument not found.");
		}

		return await renderItemEditForm(res, {
			...item,
			description: item.description ?? "",
			category_id: item.category_id === null
				? "uncategorized"
				: String(item.category_id),
		});
	} catch (error) {
		next(error);
	}
}

export async function postItemEdit(req, res, next) {
	const id = parseItemId(req.params.id);

	if (id === null) {
		return res.status(404).send("Instrument not found.");
	}

	const fields = [
		"name",
		"brand",
		"description",
		"price",
		"stock_quantity",
		"category_id",
	];

	const item = {
		...Object.fromEntries(
			fields.map((field) => [
				field,
				typeof req.body?.[field] === "string" ? req.body[field] : "",
			]),
		),
		id,
	};

	try {
		const existingItem = await getItemById(id);

		if (!existingItem) {
			return res.status(404).send("Instrument not found.");
		}

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return await renderItemEditForm(
				res,
				item,
				errors.array().map((error) => error.msg),
				400,
			);
		}

		const updatedItem = await updateItem(id, {
			...item,
			category_id: item.category_id === "uncategorized"
				? null
				: Number(item.category_id),
		});

		if (!updatedItem) {
			return res.status(404).send("Instrument not found.");
		}

		return res.redirect(303, `/items/${updatedItem.id}`);
	} catch (error) {
		if (
			error.code === "23503" &&
			error.constraint === "items_category_id_fkey"
		) {
			try {
				return await renderItemEditForm(
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

export async function getItemDelete(req, res, next) {
	const id = parseItemId(req.params.id);

	if (id === null) {
		return res.status(404).send("Instrument not found.");
	}

	try {
		const item = await getItemById(id);

		if (!item) {
			return res.status(404).send("Instrument not found.");
		}

		return res.render("items/delete", {
			title: "Delete instrument",
			item,
		});
	} catch (error) {
		next(error);
	}
}

export async function postItemDelete(req, res, next) {
	const id = parseItemId(req.params.id);

	if (id === null) {
		return res.status(404).send("Instrument not found.");
	}

	try {
		const deletedItem = await deleteItem(id);

		if (!deletedItem) {
			return res.status(404).send("Instrument not found.");
		}

		const destination = deletedItem.category_id === null
			? "/items/uncategorized"
			: `/categories/${deletedItem.category_id}`;

		return res.redirect(303, destination);
	} catch (error) {
		next(error);
	}
}
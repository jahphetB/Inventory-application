import {
	getCategoryById,
	getItemsByCategoryId,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesWithCounts,
} from "../db/queries.js";

import { validationResult } from "express-validator";

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

function renderCreateForm(
	res,
	category = { name: "", description: "" },
	errors = [],
	status = 200,
) {
	return res.status(status).render("categories/form", {
		title: "Create category",
		action: "/categories/new",
		submitLabel: "Create category",
		cancelUrl: "/",
		category,
		errors,
	});
}

export function getCategoryCreate(req, res) {
	return renderCreateForm(res);
}

export async function postCategoryCreate(req, res, next) {
	const category = {
		name: typeof req.body?.name === "string" ? req.body.name : "",
		description: typeof req.body?.description === "string"
			? req.body.description
			: "",
	};

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return renderCreateForm(
			res,
			category,
			errors.array().map((error) => error.msg),
			400,
		);
	}

	try {
		const createdCategory = await createCategory(category);

		return res.redirect(303, `/categories/${createdCategory.id}`);
	} catch (error) {
		if (
			error.code === "23505" &&
			error.constraint === "categories_name_unique"
		) {
			return renderCreateForm(
				res,
				category,
				["A category with this name already exists."],
				409,
			);
		}

		next(error);
	}
}

function parseCategoryId(value) {
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

function renderCategoryEditForm(res, category, errors = [], status = 200) {
	return res.status(status).render("categories/form", {
		title: "Edit category",
		action: `/categories/${category.id}/edit`,
		submitLabel: "Save changes",
		cancelUrl: `/categories/${category.id}`,
		category,
		errors,
	});
}

export async function getCategoryEdit(req, res, next) {
	const id = parseCategoryId(req.params.id);

	if (id === null) {
		return res.status(404).send("Category not found.");
	}

	try {
		const category = await getCategoryById(id);

		if (!category) {
			return res.status(404).send("Category not found.");
		}

		return renderCategoryEditForm(res, {
			...category,
			description: category.description ?? "",
		});
	} catch (error) {
		next(error);
	}
}

export async function postCategoryEdit(req, res, next) {
	const id = parseCategoryId(req.params.id);

	if (id === null) {
		return res.status(404).send("Category not found.");
	}

	const category = {
		id,
		name: typeof req.body?.name === "string" ? req.body.name : "",
		description: typeof req.body?.description === "string"
			? req.body.description
			: "",
	};

	try {
		const existingCategory = await getCategoryById(id);

		if (!existingCategory) {
			return res.status(404).send("Category not found.");
		}

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return renderCategoryEditForm(
				res,
				category,
				errors.array().map((error) => error.msg),
				400,
			);
		}

		const updatedCategory = await updateCategory(id, category);

		if (!updatedCategory) {
			return res.status(404).send("Category not found.");
		}

		return res.redirect(303, `/categories/${updatedCategory.id}`);
	} catch (error) {
		if (
			error.code === "23505" &&
			error.constraint === "categories_name_unique"
		) {
			return renderCategoryEditForm(
				res,
				category,
				["A category with this name already exists."],
				409,
			);
		}

		next(error);
	}
}

async function renderCategoryDeleteForm(
	res,
	id,
	errors = [],
	selectedDestination = "",
	status = 200,
) {
	const categories = await getCategoriesWithCounts();
	const category = categories.find((category) => category.id === id);

	if (!category) {
		return res.status(404).send("Category not found.");
	}

	const destinations = categories.filter((category) => category.id !== id);

	return res.status(status).render("categories/delete", {
		title: "Delete category",
		category,
		destinations,
		hasItems: Number(category.item_count) > 0,
		selectedDestination,
		errors,
	});
}

export async function getCategoryDelete(req, res, next) {
	const id = parseCategoryId(req.params.id);

	if (id === null) {
		return res.status(404).send("Category not found.");
	}

	try {
		return await renderCategoryDeleteForm(res, id);
	} catch (error) {
		next(error);
	}
}

export async function postCategoryDelete(req, res, next) {
	const id = parseCategoryId(req.params.id);

	if (id === null) {
		return res.status(404).send("Category not found.");
	}

	try {
		const rawDestination = req.body?.destination_id;

		if (
			rawDestination !== undefined &&
			typeof rawDestination !== "string"
		) {
			return await renderCategoryDeleteForm(
				res,
				id,
				["Choose a valid destination."],
				"",
				400,
			);
		}

		const selection = (rawDestination ?? "").trim();
		let destinationId;

		if (selection === "uncategorized") {
			destinationId = null;
		} else if (selection !== "") {
			destinationId = parseCategoryId(selection);

			if (destinationId === null) {
				return await renderCategoryDeleteForm(
					res,
					id,
					["Choose a valid destination."],
					"",
					400,
				);
			}
		}

		const result = await deleteCategory(id, destinationId);

		if (result.status === "not_found") {
			return res.status(404).send("Category not found.");
		}

		if (result.status === "destination_required") {
			return await renderCategoryDeleteForm(
				res,
				id,
				["This category contains instruments. Choose where to move them."],
				selection,
				400,
			);
		}

		if (result.status === "invalid_destination") {
			return await renderCategoryDeleteForm(
				res,
				id,
				["Choose another existing category or Uncategorized."],
				"",
				400,
			);
		}

		return res.redirect(303, "/");
	} catch (error) {
		next(error);
	}
}
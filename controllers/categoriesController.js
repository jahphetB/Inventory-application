import {
	getCategoryById,
	getItemsByCategoryId,
    createCategory,
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
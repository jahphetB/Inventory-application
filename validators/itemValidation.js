import { body } from "express-validator";
import { getCategoryById } from "../db/queries.js";

export const validateItem = [
	body("name")
		.isString()
		.withMessage("Instrument name must be text.")
		.bail()
		.trim()
		.notEmpty()
		.withMessage("Instrument name is required."),

	body("brand")
		.isString()
		.withMessage("Brand must be text.")
		.bail()
		.trim()
		.notEmpty()
		.withMessage("Brand is required."),

	body("description")
		.optional()
		.isString()
		.withMessage("Description must be text.")
		.bail()
		.trim(),

	body("price")
		.isString()
		.withMessage("Price must be a valid amount.")
		.bail()
		.trim()
		.matches(/^\d+(?:\.\d{1,2})?$/)
		.withMessage("Enter a nonnegative price with at most two decimal places.")
		.bail()
		.custom((value) => Number(value) < 100000000)
		.withMessage("Price cannot exceed $99,999,999.99."),

	body("stock_quantity")
		.isString()
		.withMessage("Stock quantity must be a whole number.")
		.bail()
		.trim()
		.matches(/^\d+$/)
		.withMessage("Stock quantity must be a nonnegative whole number.")
		.bail()
		.custom((value) => Number(value) <= 2147483647)
		.withMessage("Stock quantity cannot exceed 2,147,483,647."),

	body("category_id")
		.isString()
		.withMessage("Choose a category or Uncategorized.")
		.bail()
		.trim()
		.notEmpty()
		.withMessage("Choose a category or Uncategorized.")
		.bail()
		.custom(async (value) => {
			if (value === "uncategorized") {
				return true;
			}

			const id = Number(value);

			if (
				!/^\d+$/.test(value) ||
				!Number.isInteger(id) ||
				id < 1 ||
				id > 2147483647
			) {
				throw new Error("Choose a valid category.");
			}

			const category = await getCategoryById(id);

			if (!category || category.family_id === null) {
				throw new Error("This category no longer exists. Choose another.");
			}

			return true;
		}),
];

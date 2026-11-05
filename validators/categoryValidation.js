import { body } from "express-validator";

export const validateCategory = [
	body("name").isString().withMessage("Category name must be text.").bail()
		.trim().notEmpty().withMessage("Category name is required."),
	body("description").optional().isString().withMessage("Description must be text.").bail().trim(),
	// These IDs are the immutable identities enforced by migration 001.
	body("family_id").isString().withMessage("Choose a valid instrument family.").bail()
		.trim().matches(/^[1-5]$/).withMessage("Choose a valid instrument family."),
];

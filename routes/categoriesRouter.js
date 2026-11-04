import { Router } from "express";
import {
	getCategoryDetail,
	getCategoryCreate,
	postCategoryCreate,
    getCategoryEdit,
    postCategoryEdit,
    getCategoryDelete,
    postCategoryDelete,
} from "../controllers/categoriesController.js";
import { body } from "express-validator";

const categoriesRouter = Router();

const validateCategory = [
	body("name")
		.isString()
		.withMessage("Category name must be text.")
		.bail()
		.trim()
		.notEmpty()
		.withMessage("Category name is required."),
	body("description")
		.optional()
		.isString()
		.withMessage("Description must be text.")
		.bail()
		.trim(),
];

categoriesRouter.get("/new", getCategoryCreate);
categoriesRouter.post("/new", validateCategory, postCategoryCreate);

categoriesRouter.get("/:id/edit", getCategoryEdit);
categoriesRouter.post("/:id/edit", validateCategory, postCategoryEdit);

categoriesRouter.get("/:id/delete", getCategoryDelete);
categoriesRouter.post("/:id/delete", postCategoryDelete);

categoriesRouter.get("/:id", getCategoryDetail);

export default categoriesRouter;
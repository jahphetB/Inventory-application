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
import { validateCategory } from "../validators/categoryValidation.js";
import { requireAdminPassword } from "../middleware/requireAdminPassword.js";

const categoriesRouter = Router();

categoriesRouter.get("/new", getCategoryCreate);
categoriesRouter.post("/new", requireAdminPassword, validateCategory, postCategoryCreate);

categoriesRouter.get("/:id/edit", getCategoryEdit);
categoriesRouter.post("/:id/edit", requireAdminPassword, validateCategory, postCategoryEdit);

categoriesRouter.get("/:id/delete", getCategoryDelete);
categoriesRouter.post("/:id/delete", requireAdminPassword, postCategoryDelete);

categoriesRouter.get("/:id", getCategoryDetail);

export default categoriesRouter;

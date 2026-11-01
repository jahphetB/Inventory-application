import { Router } from "express";
import { getCategoryDetail } from "../controllers/categoriesController.js";

const categoriesRouter = Router();

categoriesRouter.get("/:id", getCategoryDetail);

export default categoriesRouter;
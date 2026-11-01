import { Router } from "express";
import {
	getItemList,
	getUncategorizedItemList,
    getItemDetail,
    getItemCreate,
    postItemCreate,
} from "../controllers/itemsController.js";

import { validateItem } from "../validators/itemValidation.js";

const itemsRouter = Router();

itemsRouter.get("/new", getItemCreate);
itemsRouter.post("/new", validateItem, postItemCreate);
itemsRouter.get("/", getItemList);
itemsRouter.get("/uncategorized", getUncategorizedItemList);
itemsRouter.get("/:id", getItemDetail);

export default itemsRouter;
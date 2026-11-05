import { Router } from "express";
import {
	getItemList,
	getUncategorizedItemList,
    getItemDetail,
    getItemCreate,
    postItemCreate,
    getItemEdit,
    postItemEdit,
    getItemDelete, 
    postItemDelete,
} from "../controllers/itemsController.js";

import { validateItem } from "../validators/itemValidation.js";
import { requireAdminPassword } from "../middleware/requireAdminPassword.js";

const itemsRouter = Router();

itemsRouter.get("/new", getItemCreate);
itemsRouter.post("/new", requireAdminPassword, validateItem, postItemCreate);
itemsRouter.get("/", getItemList);
itemsRouter.get("/uncategorized", getUncategorizedItemList);
itemsRouter.get("/:id/edit", getItemEdit);
itemsRouter.post("/:id/edit", requireAdminPassword, validateItem, postItemEdit);
itemsRouter.get("/:id/delete", getItemDelete);
itemsRouter.post("/:id/delete", requireAdminPassword, postItemDelete);
itemsRouter.get("/:id", getItemDetail);

export default itemsRouter;

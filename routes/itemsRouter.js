import { Router } from "express";
import {
	getItemList,
	getUncategorizedItemList,
    getItemDetail,
} from "../controllers/itemsController.js";

const itemsRouter = Router();

itemsRouter.get("/", getItemList);
itemsRouter.get("/uncategorized", getUncategorizedItemList);
itemsRouter.get("/:id", getItemDetail);

export default itemsRouter;
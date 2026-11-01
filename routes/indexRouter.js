import { Router } from "express";
import { getHome } from "../controllers/indexController.js";

const indexRouter = Router();

indexRouter.get("/", getHome);

export default indexRouter;
import { Router } from "express";
import { getFamilyDetail } from "../controllers/familiesController.js";

const familiesRouter = Router();

// Families are fixed: intentionally expose only this read endpoint.
familiesRouter.get("/:slug", getFamilyDetail);

export default familiesRouter;

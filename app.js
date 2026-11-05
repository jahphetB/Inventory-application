import express from "express";
import path from "node:path";
import process from "node:process";
import indexRouter from "./routes/indexRouter.js";
import itemsRouter from "./routes/itemsRouter.js";
import categoriesRouter from "./routes/categoriesRouter.js";
import familiesRouter from "./routes/familiesRouter.js";

const app = express();
const projectDirectory = process.cwd();

app.set("views", path.join(projectDirectory, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(projectDirectory, "public")));

app.use("/", indexRouter);
app.use("/items", itemsRouter);
app.use("/categories", categoriesRouter);
app.use("/families", familiesRouter);

export default app;

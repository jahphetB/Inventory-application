import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import indexRouter from "./routes/indexRouter.js";

const app = express();
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

app.set("views", path.join(projectDirectory, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(projectDirectory, "public")));

app.use("/", indexRouter);

export default app;
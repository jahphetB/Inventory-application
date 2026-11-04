import app from "../app.js";
import templates from "../generated/views.js";
import { configureCompiledViews } from "../rendering/compiledViews.js";

configureCompiledViews(app, templates);

const port = 3001;

app.listen(port, () => {
	console.log(`Compiled-view preview running at http://localhost:${port}`);
});
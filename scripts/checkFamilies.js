import pool from "../db/pool.js";
import { getFamiliesWithCounts, getUnmappedCategories, getUncategorizedItemCount } from "../db/queries.js";

try {
	const families = await getFamiliesWithCounts();
	if (families.length !== 5) throw new Error("Expected exactly five fixed families.");
	console.table(families);
	const unmapped = await getUnmappedCategories();
	if (unmapped.length) {
		console.table(unmapped);
		throw new Error("Categories created during the compatibility transition need an explicit family assignment before Step 2 finalizes the constraint.");
	}
	console.log(`All categories have valid families. Global Uncategorized items: ${await getUncategorizedItemCount()}.`);
} catch (error) {
	console.error("Family check failed:", error.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}

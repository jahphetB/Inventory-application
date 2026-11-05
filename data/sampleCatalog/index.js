import idiophones from "./idiophones.js";
import membranophones from "./membranophones.js";
import chordophones from "./chordophones.js";
import aerophones from "./aerophones.js";
import electrophones from "./electrophones.js";
import sources from "./sources.js";

export default {
	id: "studio-catalog",
	revision: 1,
	expected_categories: 70,
	items_per_category: 5,
	family_counts: { 1: 16, 2: 12, 3: 17, 4: 17, 5: 8 },
	sources,
	categories: [...idiophones, ...membranophones, ...chordophones, ...aerophones, ...electrophones],
};

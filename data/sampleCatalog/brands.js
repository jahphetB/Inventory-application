// Stable assignment keeps brands consistent between imports and environments.
export const catalogBrands = [
	"Alder & Reed", "Northvale", "Bellmere", "Crestwood", "Solvara", "Ashbourne",
	"Mariston", "Larkwell", "Cedarline", "Vespera", "Stonebridge", "Elmsworth",
	"Silverfen", "Oakmere", "Riverton", "Bracken", "Halcyon", "Westhaven",
	"Aurelis", "Thornfield", "Windmere", "Rosendale", "Evermont", "Kestrel",
];

export function catalogBrand(categoryKey, index) {
	let hash = 0;
	for (const character of categoryKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	return catalogBrands[(hash + index * 7) % catalogBrands.length];
}

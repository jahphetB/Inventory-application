import { getFamilyBySlug, getCategoriesByFamilyId } from "../db/queries.js";

export async function getFamilyDetail(req, res, next) {
	if (!/^[a-z]+$/.test(req.params.slug)) return res.status(404).send("Family not found.");
	try {
		const family = await getFamilyBySlug(req.params.slug);
		if (!family) return res.status(404).send("Family not found.");
		const categories = await getCategoriesByFamilyId(family.id);
		return res.render("families/detail", { title: family.name, family, categories });
	} catch (error) {
		next(error);
	}
}

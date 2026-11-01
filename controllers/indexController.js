export function getHome(req, res) {
	res.render("index", {
		title: "Musical Instrument Inventory",
	});
}
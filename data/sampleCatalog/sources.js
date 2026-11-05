// Primary sources verify identities only, never the fictional seeded prices or stock.
export default {
	"fender-player-ii": {
		url: "https://www.fender.com/newsroom/270318-fender-releases-the-player-ii-series-a-catalyst-to-unite-the-next-generation-of-players/",
		title: "Fender Player II announcement", verified_on: "2026-11-04",
		identities: ["Player II Stratocaster", "Player II Telecaster", "Player II Jazzmaster", "Player II Jaguar", "Player II Mustang", "Player II Precision Bass", "Player II Jazz Bass", "Player II Mustang Bass"].map((name) => ({ brand: "Fender", name })),
	},
	"yamaha-portables": {
		url: "https://usa.yamaha.com/products/musical_instruments/pianos/p_series/",
		title: "Yamaha portable digital pianos", verified_on: "2026-11-04",
		identities: ["P-225", "P-525", "P-125a", "P-45", "DGX-670"].map((name) => ({ brand: "Yamaha", name })),
	},
	"yamaha-student-winds": {
		url: "https://usa.yamaha.com/products/musical_instruments/winds/band-rentals.html",
		title: "Yamaha student band instruments", verified_on: "2026-11-04",
		identities: ["YFL-222", "YCL-255", "YTR-2330"].map((name) => ({ brand: "Yamaha", name })),
	},
	"roland-tr-8s": {
		url: "https://www.roland.com/us/products/tr-8s/", title: "Roland TR-8S", verified_on: "2026-11-04",
		identities: [{ brand: "Roland", name: "TR-8S" }],
	},
	"roland-sp-404mkii": {
		url: "https://www.roland.com/us/products/sp-404mk2/", title: "Roland SP-404MKII", verified_on: "2026-11-04",
		identities: [{ brand: "Roland", name: "SP-404MKII" }],
	},
	"yamaha-montage-m6": {
		url: "https://shop.usa.yamaha.com/en/p/instruments/keyboards-synthesizers/synthesizers/montage-m6-61-key-synthesizer",
		title: "Yamaha MONTAGE M6", verified_on: "2026-11-04",
		identities: [{ brand: "Yamaha", name: "MONTAGE M6" }],
	},
	"rhodes-mk8": {
		url: "https://rhodesmusic.com/rhodes-mk8/", title: "Rhodes MK8", verified_on: "2026-11-04",
		identities: [{ brand: "Rhodes", name: "MK8" }],
	},
	"moog-etherwave": {
		url: "https://api.moogmusic.com/sites/default/files/2022-04/Etherwave-Theremin_Manual_2022.pdf",
		title: "Moog Etherwave Theremin manual", verified_on: "2026-11-04",
		identities: [{ brand: "Moog", name: "Etherwave Theremin" }],
	},
};

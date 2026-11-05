export const fictionalBrand = "Fictional Demo";

export function slug(value) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function real(brand, name, source, description) {
	return { brand, name, source, description, identity_kind: "real" };
}

export function category(family_id, name, description, baseCents, variants) {
	const key = slug(name);
	return {
		key, family_id, name, description,
		items: variants.map((variant, index) => {
			const identity = typeof variant === "string"
				? { name: variant, brand: fictionalBrand, identity_kind: "fictional", source: null, description: `${variant}. ${description}` }
				: variant;
			return {
				...identity,
				key: `${key}/${slug(identity.brand + " " + identity.name)}`,
				price: ((baseCents + index * 1375) / 100).toFixed(2),
				stock_quantity: [3, 0, 5, 2, 1][index],
			};
		}),
	};
}

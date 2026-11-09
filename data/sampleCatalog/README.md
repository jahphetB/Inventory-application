# Approved demonstration catalog

This dataset contains 70 practical instrument categories and five new sample instruments per category: 350 entries in total. Family counts are 16 Idiophones, 12 Membranophones, 17 Chordophones, 17 Aerophones, and 8 Electrophones.

**Every new price and stock quantity is fictional demonstration data.** No seeded value is a verified retail price, availability statement, valuation, or manufacturer recommendation.

There are 21 real product identities supported by primary sources in `sources.js`. The other 329 instruments are invented identities assigned varied brand names from `brands.js`. Revision 2 removes the shared placeholder brand from displayed inventory while retaining accurate internal `identity_kind` metadata. These names are catalog labels, not verified manufacturer/model claims. Entries vary instrument type, construction, size, tuning, or playing configuration. Descriptions are brief original descriptions rather than copied marketing text.

The five family files contain the human-readable category and variant definitions. `builders.js` expands those definitions deterministically into full records, assigning stable keys, price strings, and whole-number stock values. `brands.js` exports `catalogBrands` and `catalogBrand(categoryKey, index)` for consistent varied brand assignment. The internal `legacyKeyBrand` in `builders.js` preserves persisted revision-one keys; it is not a displayed brand. `index.js` supplies the approved count manifest. `db/sampleCatalogValidation.js` validates the entire catalog, including matching real brand/model pairs against the source registry, before database writes. Existing installations use the explicit `db/updateCatalogBrands.js` upgrade; see [upgrade instructions](../../docs/SAMPLE_DATA.md#upgrading-existing-brand-values).

Real product identities do not imply current availability. The source registry records the verification date and primary URLs. Its Fender announcement supports eight guitar/bass identities; Yamaha's portable-piano and student-band pages support eight more; the remaining five come from Roland, Yamaha, Rhodes, and Moog documentation.

The approved practical classification keeps electric strings in Chordophones. Digital and electromechanical pianos are separate Electrophone categories; acoustic pianos remain Chordophones. Vibraphones remain Idiophones because their bars generate the sound. Kazoos are Membranophones. See [the approved proposal](../../docs/TAXONOMY_PROPOSAL.md) for museum/classification references and the legacy-category decision.

The existing four instruments are outside this dataset. The importer must not claim, duplicate, edit, or reclassify them. In particular, the existing Uncategorized violin stays Uncategorized even though the new catalog includes a Violins category.

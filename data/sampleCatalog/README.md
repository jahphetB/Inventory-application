# Approved demonstration catalog

This dataset contains 70 practical instrument categories and five new sample instruments per category: 350 entries in total. Family counts are 16 Idiophones, 12 Membranophones, 17 Chordophones, 17 Aerophones, and 8 Electrophones.

**Every new price and stock quantity is fictional demonstration data.** No seeded value is a verified retail price, availability statement, valuation, or manufacturer recommendation.

There are 21 real product identities supported by primary sources in `sources.js`. The other 329 instruments are explicitly fictional identities under the brand **Fictional Demo**. Fictional entries vary instrument type, construction, size, tuning, or playing configuration; they are not invented models attributed to real manufacturers. Descriptions are brief original descriptions rather than copied marketing text.

The five family files contain the human-readable category and variant definitions. `builders.js` expands those definitions deterministically into full records, assigning stable keys, price strings, and whole-number stock values. `index.js` supplies the approved count manifest. `db/sampleCatalogValidation.js` validates the entire catalog, including matching real brand/model pairs against the source registry, before database writes.

Real product identities do not imply current availability. The source registry records the verification date and primary URLs. Its Fender announcement supports eight guitar/bass identities; Yamaha's portable-piano and student-band pages support eight more; the remaining five come from Roland, Yamaha, Rhodes, and Moog documentation.

The approved practical classification keeps electric strings in Chordophones. Digital and electromechanical pianos are separate Electrophone categories; acoustic pianos remain Chordophones. Vibraphones remain Idiophones because their bars generate the sound. Kazoos are Membranophones. See [the approved proposal](../../docs/TAXONOMY_PROPOSAL.md) for museum/classification references and the legacy-category decision.

The existing four instruments are outside this dataset. The importer must not claim, duplicate, edit, or reclassify them. In particular, the existing Uncategorized violin stays Uncategorized even though the new catalog includes a Violins category.

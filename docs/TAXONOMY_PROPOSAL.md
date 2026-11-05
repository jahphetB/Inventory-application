# Step 3 taxonomy and sample-data proposal

Status: the user approved the recommended 70-category option and completion of Step 3. Remove the legacy Drums category only while it remains empty. The approved catalog contains 350 new samples; the four existing instruments remain additional. Production changes are not authorized.

Step 3 is now implemented locally: 70 categories, 350 imported samples, and 354 total instruments. See [the import/verification handoff](SAMPLE_DATA.md) for the completed workflow and its safeguards.

## Proposed catalog

The original 70-category proposal remains the recommended catalog. Every approved category will receive five new, distinct sample instruments. Existing instruments do not count toward those five and will remain untouched.

| Family | Categories | New sample items | Category names |
| --- | ---: | ---: | --- |
| Idiophones | 16 | 80 | Bells, Cabasas, Castanets, Claves, Cymbals, Glockenspiels, Gongs, Güiros, Kalimbas, Maracas, Marimbas, Steelpans, Triangles, Vibraphones, Wood blocks, Xylophones |
| Membranophones | 12 | 60 | Bass drums, Bongos, Congas, Darbukas, Djembes, Frame drums, Friction drums, Kazoos, Snare drums, Tablas, Timpani, Tom-toms |
| Chordophones | 17 | 85 | Banjos, Bass guitars, Bouzoukis, Cellos, Concert zithers, Double basses, Guitars, Hammered dulcimers, Harps, Kotos, Lutes, Mandolins, Pianos, Sitars, Ukuleles, Violas, Violins |
| Aerophones | 17 | 85 | Accordions, Bagpipes, Bassoons, Clarinets, Cornets, Didgeridoos, Euphoniums, Flutes, Harmonicas, Oboes, Ocarinas, Pipe organs, Recorders, Saxophones, Trombones, Trumpets, Tubas |
| Electrophones | 8 | 40 | Digital pianos, Drum machines, Electric pianos, Electronic drum kits, Electronic organs, Samplers, Synthesizers, Theremins |
| Total | 70 | 350 | Existing inventory is additional. |

These are practical catalog groups, not every subdivision of Hornbostel–Sachs. Instruments remain rows in `items`; there is no third category table.

## Final legacy-category decision

At proposal time, the local database had three categories and four legitimate instruments. Guitars and Digital pianos were already in the proposed catalog. The remaining category, Drums, was empty and broader than the proposed drum categories.

- **Recommended: remove only the empty Drums category after approval.** The final catalog has 70 categories, 350 new sample instruments, and 354 total instruments based on the current local inventory. Reuse the existing Guitars and Digital pianos category IDs and add 68 categories.
- **Alternative: keep Drums as an additional general category.** The final catalog has 71 categories, 355 new sample instruments, and 359 total instruments. Its five samples would cover drum types outside the named categories rather than duplicating the specific categories' entries.

The recommended option was approved. Removal must stop if Drums is no longer empty. The four existing instruments, including the Uncategorized Stentor violin, will not be moved, edited, or deleted by the sample-data import. Counts will be rechecked immediately before import if the user adds inventory in the meantime.

## Classification convention already approved

- Acoustic and electric string instruments stay in Chordophones. Guitars covers acoustic and electric guitars; Bass guitars has its own catalog group.
- Acoustic pianos belong to Chordophones; sampled digital pianos belong to Electrophones.
- Electric pianos means electromechanical instruments such as tine/reed electric pianos, distinct from digital pianos. Electronic organs, samplers, synthesizers, theremins, drum machines, and electronic drum kits belong to Electrophones.
- Pipe organs, harmonicas, and accordions belong to Aerophones. Kazoos belong to Membranophones because their membrane modifies the voice.
- Hybrid instruments need an explicit, documented choice rather than duplication under multiple families. Categories will remain mutually useful product groups: concert zithers, kotos, and hammered dulcimers will not share sample identities.

This follows the approved practical convention, not a claim of strict compliance with MIMO's expanded electro-acoustic classification. The Met, for example, classifies an electric guitar as a chordophone, while MIMO defines a broader Electrophones group.

References:

- [MIMO: Electrophones definition and subdivisions](https://vocabulary.mimo-international.com/HornbostelAndSachs/en/page/6154?clang=en).
- [The Met: electric guitar classified as a chordophone](https://www.metmuseum.org/art/collection/search/506805).
- [The Met: Zobo flute/kazoo classified as a membranophone-mirliton](https://www.metmuseum.org/art/collection/search/505055).
- [Yamaha: P-145 digital piano](https://ca.yamaha.com/en/musical-instruments/pianos/products/p-series/p-145/).
- [Oberlin: instrument-classification background](https://www2.oberlin.edu/library/digital/knight/knight_system.html).

## Sample identity and fictional values

Use real brand/model combinations only where a primary source verifies that identity. Retain the identity/source relationship in dataset metadata. Do not copy descriptive marketing passages.

Where a suitable real identity cannot be verified, use a plausible instrument with an explicitly fictional sample brand/model, clearly recorded as fictional. Never attach an invented model to a real manufacturer. Vary genuine instrument characteristics rather than creating five numbered copies of the same entry.

Each entry will have a nonempty name and brand, a brief relevant description, a nonnegative price with at most two decimal places, a nonnegative whole-number stock quantity, and the correct approved category.

All newly seeded prices and stock values are fictional demonstration data, including entries whose product identities are real. Document this once in the seed documentation; do not add repetitive price/stock disclaimers to the interface.

## Additive import design

- Preserve `npm run db:seed` and its refusal to modify populated inventory. The large sample catalog uses a separate command and dataset.
- Organize taxonomy and sample data by family, with stable category/item keys and source metadata. Use parameterized SQL and a transaction.
- Reuse an existing category only when its case-insensitive name and family match. Report conflicting existing data instead of silently moving or renaming it.
- Track imported sample keys with provenance. On rerun, skip imported identities without overwriting user edits or recreating deliberately deleted imported entries. An explicit later restoration/update workflow would be a separate decision.
- Reuse existing inventory as-is; do not claim existing real items as importer-owned records or duplicate their brand/model identities.
- Validate the complete dataset before database writes, then verify five fixed families, exact catalog counts, at least five sample items per approved category, valid relationships, alphabetical queries, and no duplication or existing-data changes on rerun.
- Stop if inventory changes make the approved cleanup unsafe. Use isolated schemas for importer tests and retain a local pre-import snapshot.

## Commit and release boundaries

After approval, use at least two coherent Step 3 commits: sourced taxonomy/sample data; importer, provenance, validation, tests, and documentation. Verify and push the feature branch, then wait for the Step 4 checkpoint. No production migration, production import, or deployment is authorized by this proposal.

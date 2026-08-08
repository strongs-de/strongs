# Importing resources

Two ways in, one code path behind them: the admin UI at `/admin/import`, and

```sh
pnpm data:import <file-or-directory>
```

The format is detected from the file's contents, not its extension, because everything in this space is
called `.xml` or `.txt`. Detection is a suggestion: both the CLI (`--format`) and the wizard let you
override it.

A resource is identified by the identifier in its file, or by `--id`. Importing the same identifier
again **replaces** its content. Name, column title, ordering and licence text are not overwritten on
re-import, so edits made in the admin UI survive.

## Bible translations

| Format                  | Recognised by                   | Notes                                                                                                          |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Zefania XML             | `<XMLBIBLE>`                    | What the bundled translations use. Strong's numbers as `<gr str="…">`, morphology as `rmac`.                   |
| CrossWire SWORD raw ZIP | `mods.d/*.conf` plus `modules/` | Bible drivers `RawText`/`zText` (including their v4 variants). The runtime uses CrossWire's `diatheke` reader. |
| OSIS                    | `<osis>`                        | Both container (`<verse>text</verse>`) and milestone (`<verse sID=…/>`) styles.                                |
| USFM                    | `\id`, `\c`, `\v` markers       | Word-level Strong's attributes are read; footnotes and cross references are dropped.                           |
| USX                     | `<usx>`                         | What eBible.org publishes.                                                                                     |
| USFX                    | `<usfx>`                        | Same content, different shape.                                                                                 |
| Verse per line          | a reference and text per row    | Tab, pipe, semicolon or comma separated; also `book`/`chapter`/`verse`/`text` columns.                         |

USFM carries Strong's numbers as word attributes, which the importer reads:

```
\v 1 Im Anfang \w schuf|strong="H1254"\w* \w Gott|strong="H430"\w* Himmel und Erde.
```

Verse ranges are preserved rather than expanded: a translation that prints 16-17 as one unit is stored as
one verse with `verse_end = 17`, and the reader spans it across both rows so the columns stay aligned.

## Reference works

| Kind                         | Format               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strong's dictionary          | Strong's XML         | `data/strongsgreek.xml`; the same parser reads the openscriptures Hebrew file. Cross references inside definitions become links.                                                                                                                                                                                                                                                                                                              |
| Strong's dictionary (German) | Strong's XML         | `data/stronggreek_de_kautz.xml`: Gerhard Kautz' German Greek lexicon, converted from his Word manuscript by `scripts/convert-kautz-lexicon.ts` (used with his permission — see the script's own doc comment). Imports as a separate resource; `lexicon_entries` has a composite key of `(resourceId, strong)`, so it coexists with the English dictionary rather than replacing it, and `resources.sortOrder` decides which one a page shows. |
| Morphology                   | Robinson TSP         | `data/books/*.TSP`. An **overlay**: it adds lemmas to a Greek text that is already imported, so pass `--target GNTTR` or pick the target in the wizard.                                                                                                                                                                                                                                                                                       |
| Cross references             | CSV/TSV              | Two reference columns and an optional score: `Gen 1:1<TAB>Joh 1:1<TAB>23`.                                                                                                                                                                                                                                                                                                                                                                    |
| Commentary                   | CSV/Markdown or ThML | Reference and body per row, or CCEL-style ThML. Bodies are reduced to eleven formatting tags with no attributes.                                                                                                                                                                                                                                                                                                                              |
| Commentary                   | Zefania XML          | `<dictionary type="x-commentary">` items with numeric `target`/`reflink mscope` references and one or more descriptions.                                                                                                                                                                                                                                                                                                                      |
| Commentary                   | CrossWire SWORD ZIP  | `RawCom`/`zCom`, `HREFCom` and `RawFiles` drivers (including v4 variants), read through CrossWire's `diatheke`.                                                                                                                                                                                                                                                                                                                               |

A directory is read as one resource, files in name order — which is how the 27 TSP files become a single
morphology overlay:

```sh
pnpm data:import --target GNTTR data/books
```

## Seeding a fresh database

```sh
pnpm db:migrate
pnpm data:import data/bibles/GER_ELB1905_STRONG.xml       # ~30 s
pnpm data:import data/bibles/GER_SCH1951_STRONG.xml
pnpm data:import data/bibles/GER_LUTH1912.xml
pnpm data:import data/bibles/GER_ILGRDE.xml
pnpm data:import data/bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml
pnpm data:import data/strongsgreek.xml
pnpm data:import --target GNTTR data/books
```

About two minutes in total: 109,428 verses and 750,000 tagged words.

`pnpm db:seed` is something different — a small fixture for the end-to-end tests, not real data.

`data/stronggreek_de_kautz.xml` (see the table above) is deliberately left out of that sequence: Kautz
asked to see a layout preview before it goes live, so importing it into production is a separate,
manual step for whoever runs that seeding, not something to fold in automatically.

## Reading the warnings

Every import reports what it could not make sense of, and those warnings are worth reading: they are how
you find out that a downloaded file is subtly broken. From the bundled data:

- **Elberfelder 1905**: two words with a corrupt Strong's reference (`62407651` in Gen 37:2 is two
  numbers run together). Those words keep their text and lose their tag.
- **Textus Receptus**: eleven words with the same problem.
- **Interlinear**: 74 duplicated verses. The file contains two Galatians 2 blocks — the first holds
  verses 1-14, the second mislabels the tail of verse 14 as verse 1, pads 2-14 empty, then carries the
  real 15-21. The importer keeps the **first non-empty** text for a reference, which reconstructs the
  chapter correctly; the previous version kept only 14 verses of it.
- **Morphology overlay**: ~2,700 verses where the Textus Receptus and Tischendorf tokenise differently.
  Alignment falls back from word position to Strong's number rather than force-fitting, and 94% of words
  end up with a lemma.

## Adding a format

1. Write a parser in `src/lib/bible/parse/` as an async generator emitting `ParseEvent`s.
2. Register it in `src/lib/bible/parse/index.ts` and add its kind in `src/lib/server/import/index.ts`.
3. Teach `detect.ts` to recognise it.
4. Add a test in `formats.spec.ts` using a real excerpt of a real file, not an invented sample. Every bug
   found so far came from a real file behaving unlike the specification.

/**
 * Parser for Strong's dictionary XML.
 *
 * Handles both the Greek file bundled in `data/strongsgreek.xml` and the Hebrew companion published
 * by openscriptures, which share a structure:
 *
 *   <entry strongs="00026">
 *     <strongs>26</strongs>
 *     <greek BETA="A)GA/PH" unicode="ἀγάπη" translit="agápē"/>
 *     <pronunciation strongs="ag-ah'-pay"/>
 *     <strongs_derivation>from <strongsref language="GREEK" strongs="25"/>;</strongs_derivation>
 *     <strongs_def> love, i.e. affection or benevolence</strongs_def>
 *     <kjv_def>:--(feast of) charity, dear, love.</kjv_def>
 *     <see language="GREEK" strongs="25"/>
 *
 * Definitions are mixed content: prose interleaved with `<strongsref>` pointers to other numbers and
 * inline `<greek>`/`<hebrew>` words. Those are turned into links and spans, which is why the fields
 * are stored as HTML rather than plain text — the cross-references are half the value of the entry.
 *
 * Only markup this parser emits itself reaches the database, so the HTML is trusted by construction:
 * every scrap of text from the source is escaped on the way in.
 *
 * A `<prologue>` before `<entries>`, if present, is a rights notice for the whole dictionary rather
 * than any one entry — it becomes a `license` event instead of part of an entry (see {@link ParseEvent}).
 * A `<usage_notes>` alongside it is the dictionary's own "how to read this" preface, and becomes a
 * `usageNotes` event the same way; it may contain the same `<br/>`/`<abbr>` markup a definition can.
 */

import { makeStrongId, type StrongLanguage } from '../strong.ts';
import { attribute, readXml } from './xml.ts';
import type { ParsedLexiconEntry, ParseStream, SourceInput } from './types.ts';

type Field = 'definition' | 'derivation' | 'kjv';

export async function* parseStrongsXml(input: SourceInput): ParseStream {
	/** Which dictionary this file is; decided by the first entry that names a language. */
	let language: StrongLanguage | undefined;

	let entry: Partial<ParsedLexiconEntry> & { seeAlso: string[] } = { seeAlso: [] };
	let number: number | undefined;
	let field: Field | undefined;
	const html: Record<Field, string> = { definition: '', derivation: '', kjv: '' };
	let inNumber = false;
	let numberText = '';
	let inPrologue = false;
	let prologueText = '';
	let inUsageNotes = false;
	let usageNotesHtml = '';
	let entriesSeen = 0;
	let skippedGaps = 0;
	/** Text of an entry that sits outside any field, used to recognise the "Not Used" placeholders. */
	let looseText = '';

	const resetEntry = () => {
		entry = { seeAlso: [] };
		number = undefined;
		looseText = '';
		html.definition = '';
		html.derivation = '';
		html.kjv = '';
	};

	for await (const event of readXml(input)) {
		if (event.type === 'open') {
			switch (event.name) {
				case 'entry':
					resetEntry();
					// The attribute is zero-padded: strongs="00026".
					number = toNumber(attribute(event.attributes, 'strongs'));
					break;

				case 'strongs':
					inNumber = true;
					numberText = '';
					break;

				case 'prologue':
					// A rights notice for the whole dictionary, not any one entry — see the `license`
					// event this yields on close, below.
					inPrologue = true;
					prologueText = '';
					break;

				case 'usage_notes':
					// A dictionary's own reading guide, not any one entry — see the `usageNotes` event
					// this yields on close, below.
					inUsageNotes = true;
					usageNotesHtml = '';
					break;

				case 'br':
					// Not in the original Strong's format, but some sources structure a definition into
					// numbered senses that need to stay on their own line rather than run together.
					if (field) html[field] += '<br/>';
					else if (inUsageNotes) usageNotesHtml += '<br/>';
					break;

				case 'abbr': {
					// Not in the original Strong's format either: some sources reuse a fixed set of
					// abbreviations throughout and want to gloss them inline, native-tooltip style.
					const title = attribute(event.attributes, 'title');
					if (field) html[field] += `<abbr title="${escapeHtml(title ?? '')}">`;
					else if (inUsageNotes) usageNotesHtml += `<abbr title="${escapeHtml(title ?? '')}">`;
					break;
				}

				case 'b':
				case 'i':
					// Also not in the original format: some sources use bold/italic typesetting as part
					// of the definition's own meaning (e.g. distinguishing a headword from its gloss),
					// which is worth keeping rather than flattening to plain text.
					if (field) html[field] += `<${event.name}>`;
					break;

				case 'verseref': {
					// Marks a Bible reference quoted inside a definition. It becomes a real link — a
					// click jumps straight to the verse — that also shows that verse's text on hover
					// without the source needing to embed it itself.
					const book = attribute(event.attributes, 'book');
					const chapter = attribute(event.attributes, 'chapter');
					const verse = attribute(event.attributes, 'verse');
					const end = attribute(event.attributes, 'end');
					const href = attribute(event.attributes, 'href');
					// The open and close tags must both fire, or neither: the close handler below has
					// no way to know which case it is closing, so it always emits `</a>`.
					if (field) {
						html[field] +=
							`<a class="verse-ref" href="${escapeHtml(href ?? '#')}" data-book="${escapeHtml(book ?? '')}" data-chapter="${escapeHtml(chapter ?? '')}" data-verse="${escapeHtml(verse ?? '')}"${end ? ` data-verse-end="${escapeHtml(end)}"` : ''}>`;
					}
					break;
				}

				case 'indent':
					// Groups the related words listed under a "Wortfamilie"-style heading, so the reader
					// can set them apart (indented, in this app's stylesheet) from the entry's own text.
					if (field) html[field] += '<span class="wf-entry">';
					break;

				case 'greek':
				case 'hebrew': {
					const word = attribute(event.attributes, 'unicode');
					const translit = attribute(event.attributes, 'translit');
					language ??= event.name === 'greek' ? 'greek' : 'hebrew';

					if (entry.lemma === undefined && word) {
						// The first inline word of an entry is its headword.
						entry.lemma = word;
						if (translit) entry.transliteration = translit;
					} else if (field && word) {
						// A later one is a word quoted inside a definition.
						html[field] += `<span class="original">${escapeHtml(word)}</span>`;
					}
					break;
				}

				case 'pronunciation':
					entry.pronunciation ??= attribute(event.attributes, 'strongs');
					break;

				case 'strongs_def':
					field = 'definition';
					break;
				case 'strongs_derivation':
					field = 'derivation';
					break;
				case 'kjv_def':
					field = 'kjv';
					break;

				case 'strongsref':
				case 'see': {
					const reference = referenceId(event.attributes);
					if (!reference) break;

					if (event.name === 'see') {
						if (!entry.seeAlso.includes(reference)) entry.seeAlso.push(reference);
					} else if (field) {
						html[field] +=
							`<a class="strong-link" href="/${reference}">${escapeHtml(reference)}</a>`;
					}
					break;
				}

				default:
					break;
			}
			continue;
		}

		if (event.type === 'text') {
			if (inNumber) numberText += event.text;
			else if (inPrologue) prologueText += escapeHtml(event.text);
			else if (inUsageNotes) usageNotesHtml += escapeHtml(event.text);
			else if (field) html[field] += escapeHtml(event.text);
			else looseText += event.text;
			continue;
		}

		switch (event.name) {
			case 'strongs':
				inNumber = false;
				number ??= toNumber(numberText);
				break;

			case 'prologue':
				inPrologue = false;
				if (prologueText) yield { type: 'license', licenseHtml: prologueText };
				break;

			case 'usage_notes':
				inUsageNotes = false;
				if (usageNotesHtml) yield { type: 'usageNotes', usageNotesHtml };
				break;

			case 'abbr':
				if (field) html[field] += '</abbr>';
				else if (inUsageNotes) usageNotesHtml += '</abbr>';
				break;

			case 'b':
			case 'i':
				if (field) html[field] += `</${event.name}>`;
				break;

			case 'verseref':
				if (field) html[field] += '</a>';
				break;

			case 'indent':
				if (field) html[field] += '</span>';
				break;

			case 'strongs_def':
			case 'strongs_derivation':
			case 'kjv_def':
				field = undefined;
				break;

			case 'entry': {
				const resolved = language ?? 'greek';
				if (number === undefined || !entry.lemma) {
					// Strong's numbering has gaps, marked "Not Used" in the source. There are 101 of them
					// in the Greek dictionary, and they are not worth reporting as problems.
					if (/not\s+used/i.test(looseText)) skippedGaps += 1;
					else {
						yield {
							type: 'warning',
							message: `skipped a dictionary entry without a usable number or headword (${number ?? '?'})`
						};
					}
					break;
				}

				entriesSeen += 1;
				yield {
					type: 'lexiconEntry',
					entry: {
						strong: makeStrongId(resolved, number),
						language: resolved === 'greek' ? 'grc' : 'hbo',
						lemma: entry.lemma,
						...(entry.transliteration ? { transliteration: entry.transliteration } : {}),
						...(entry.pronunciation ? { pronunciation: entry.pronunciation } : {}),
						...(cleanup(html.definition) ? { definitionHtml: cleanup(html.definition) } : {}),
						...(cleanup(html.derivation) ? { derivationHtml: cleanup(html.derivation) } : {}),
						...(cleanup(html.kjv) ? { kjvDefinitionHtml: cleanup(html.kjv) } : {}),
						...(entry.seeAlso.length > 0 ? { seeAlso: entry.seeAlso } : {})
					}
				};

				if (entriesSeen % 500 === 0) yield { type: 'progress', done: entriesSeen };
				break;
			}

			default:
				break;
		}
	}

	if (skippedGaps > 0) {
		yield {
			type: 'progress',
			done: entriesSeen,
			message: `${skippedGaps} unused numbers in the dictionary were skipped`
		};
	}
	yield { type: 'progress', done: entriesSeen, total: entriesSeen };
}

/** `<see language="HEBREW" strongs="0175"/>` becomes `H175`. */
function referenceId(attributes: Record<string, string>): string | undefined {
	const number = toNumber(attribute(attributes, 'strongs'));
	if (number === undefined) return undefined;

	const language = attribute(attributes, 'language')?.toUpperCase();
	const resolved: StrongLanguage = language === 'HEBREW' ? 'hebrew' : 'greek';
	return makeStrongId(resolved, number);
}

function toNumber(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value.trim().replace(/^0+/, '') || '0', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Normalises whitespace and trims the punctuation Strong's uses to join fields, so a definition does
 * not begin with ":--" when shown on its own.
 */
function cleanup(value: string): string {
	return value
		.replace(/\s+/g, ' ')
		.replace(/^\s*:?--\s*/, '')
		.replace(/^[;,]\s*/, '')
		.replace(/\s+([;,.])/g, '$1')
		.trim();
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

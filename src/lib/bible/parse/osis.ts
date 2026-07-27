/**
 * OSIS XML parser.
 *
 * OSIS is the interchange format used by CrossWire/SWORD and by most publisher exports, including
 * the Schlachter 2000 and Neue Genfer Übersetzung files the previous site imported but could not
 * redistribute.
 *
 * Two structural styles exist and both appear in the wild:
 *
 *   container:  <verse osisID="Gen.1.1">Im Anfang …</verse>
 *   milestone:  <verse sID="Gen.1.1" osisID="Gen.1.1"/>Im Anfang …<verse eID="Gen.1.1"/>
 *
 * The milestone style is the harder one: verse text is a sibling of the marker rather than its child,
 * so text has to be attributed to whichever verse is currently open. Chapters and books use the same
 * two styles. `legacy/strongs/management/commands/add_bible.py` only handled containers, and papered
 * over the gap with a special case that pulled the first verse of a chapter out of the chapter
 * element's own text.
 *
 * Strong's numbers arrive as `<w lemma="strong:G26">`, sometimes with several numbers in one
 * attribute, and morphology as `morph="robinson:V-AAI-3S"` or `morph="strongMorph:TH8804"`.
 */

import { bookByOsisId } from '../books.ts';
import { strongIdsFromSource } from '../strong.ts';
import { finalizeSegments, pushText, tidySegmentSpacing, type VerseSegment } from '../segments.ts';
import { attribute, readXml } from './xml.ts';
import type { ParseEvent, ParseStream, ResourceMetadata, SourceInput } from './types.ts';

/** A reference parsed from an osisID such as `Gen.1.1` or `Ps.16.16-17`. */
type OsisReference = { book: number; chapter: number; verse: number; verseEnd?: number };

export async function* parseOsis(input: SourceInput): ParseStream {
	const header: Record<string, string> = {};
	let headerField: string | undefined;
	let workId: string | undefined;
	let language: string | undefined;

	let current: OsisReference | undefined;
	let segments: VerseSegment[] = [];
	let openWord: { strong: string | undefined; morph: string | undefined; text: string } | undefined;
	let openNote: { marker: string; text: string } | undefined;
	let openTitle: { text: string } | undefined;
	/** Section heading collected before a verse, attached to the next verse that opens. */
	let pendingHeading: string | undefined;
	let emphasis = 0;
	let inHeader = false;
	/**
	 * True while the open verse was started by a milestone marker. Milestone verses end at the next
	 * `eID` marker, not at the close of the self-closing start marker.
	 */
	let milestoneVerse = false;
	/** Depth of elements whose text is apparatus we do not display, such as cross-reference notes. */
	let suppressed = 0;
	let versesSeen = 0;
	let metadataEmitted = false;

	const emitMetadata = (): ParseEvent => ({
		type: 'metadata',
		metadata: buildMetadata(header, workId, language)
	});

	const finishVerse = (): ParseEvent | undefined => {
		if (!current) return undefined;
		const reference = current;
		current = undefined;

		milestoneVerse = false;
		const finalized = finalizeSegments(tidySegmentSpacing(segments));
		segments = [];
		versesSeen += 1;

		return {
			type: 'verse',
			verse: {
				book: reference.book,
				chapter: reference.chapter,
				verse: reference.verse,
				...(reference.verseEnd !== undefined ? { verseEnd: reference.verseEnd } : {}),
				segments: finalized,
				...(pendingHeading ? { heading: pendingHeading } : {})
			}
		};
	};

	for await (const event of readXml(input)) {
		if (event.type === 'open') {
			switch (event.name) {
				case 'ostext':
				case 'osistext':
					workId = attribute(event.attributes, 'osisidwork');
					language = attribute(event.attributes, 'lang', 'xml:lang');
					break;

				case 'header':
					inHeader = true;
					break;

				case 'work':
					workId ??= attribute(event.attributes, 'osiswork');
					break;

				case 'verse': {
					// A milestone end marker closes the open verse; a start marker opens a new one.
					if (attribute(event.attributes, 'eid')) {
						const finished = finishVerse();
						if (finished) yield finished;
						pendingHeading = undefined;
						break;
					}

					const reference = parseOsisId(attribute(event.attributes, 'osisid', 'sid'));
					if (!reference) {
						yield {
							type: 'warning',
							message: `skipped a verse with an unreadable osisID: ${attribute(event.attributes, 'osisid', 'sid') ?? '(missing)'}`
						};
						break;
					}

					// A container-style verse follows an unclosed one only in malformed files, but
					// closing defensively keeps text from bleeding across verses.
					const previous = finishVerse();
					if (previous) yield previous;

					if (!metadataEmitted) {
						yield emitMetadata();
						metadataEmitted = true;
					}

					current = reference;
					segments = [];
					// `<verse sID=…/>` and any self-closing start marker mean the text follows as a
					// sibling; `<verse osisID=…>text</verse>` contains it.
					milestoneVerse = event.selfClosing || attribute(event.attributes, 'sid') !== undefined;
					break;
				}

				case 'w': {
					if (!current) break;
					openWord = {
						strong: attribute(event.attributes, 'lemma', 'savlm', 'strong'),
						morph: attribute(event.attributes, 'morph'),
						text: ''
					};
					break;
				}

				case 'note':
					// Cross-reference notes are apparatus: their text is swallowed, not shown inline.
					if (attribute(event.attributes, 'type') === 'crossReference') suppressed += 1;
					else if (current) {
						openNote = { marker: attribute(event.attributes, 'n') ?? '', text: '' };
					}
					break;

				case 'title':
					// Inside the header a title is metadata; outside it, a section heading.
					if (inHeader) headerField = 'title';
					else openTitle = { text: '' };
					break;

				case 'transchange':
				case 'hi':
					emphasis += 1;
					break;

				case 'lb':
					if (current && !openWord && !openNote) segments.push({ kind: 'br' });
					break;

				default:
					if (inHeader) headerField = event.name;
					break;
			}
			continue;
		}

		if (event.type === 'text') {
			if (suppressed > 0) continue;
			if (openWord) openWord.text += event.text;
			else if (openNote) openNote.text += event.text;
			else if (openTitle) openTitle.text += event.text;
			else if (inHeader && headerField) {
				header[headerField] = (header[headerField] ?? '') + event.text;
			} else if (current) {
				if (emphasis > 0 && event.text.trim()) segments.push({ kind: 'em', text: event.text });
				else pushText(segments, event.text);
			}
			continue;
		}

		switch (event.name) {
			case 'w': {
				if (!openWord) break;
				const word = openWord;
				openWord = undefined;

				const trailing = /\s$/.test(word.text) ? ' ' : '';
				const text = word.text.trim();
				if (!text) {
					pushText(segments, trailing);
					break;
				}

				const strongs =
					word.strong && current ? strongIdsFromSource(stripLemma(word.strong), current.book) : [];
				const morph = normalizeMorph(word.morph);
				const primary = strongs[0];

				if (primary) {
					segments.push({
						kind: 'w',
						text,
						strong: primary,
						...(strongs.length > 1 ? { strongs } : {}),
						...(morph ? { morph } : {})
					});
				} else {
					pushText(segments, text);
				}
				pushText(segments, trailing);
				break;
			}

			case 'note': {
				if (!openNote) {
					suppressed = Math.max(0, suppressed - 1);
					break;
				}
				const note = openNote;
				openNote = undefined;
				const text = note.text.replace(/\s+/g, ' ').trim();
				if (text) segments.push({ kind: 'note', marker: note.marker, text });
				break;
			}

			case 'title': {
				if (!openTitle) break;
				const title = openTitle.text.replace(/\s+/g, ' ').trim();
				openTitle = undefined;
				// A heading inside a verse is a Psalm superscription; before one, a section heading.
				if (title) {
					if (current) pushText(segments, `${title} `);
					else pendingHeading = title;
				}
				break;
			}

			case 'transchange':
			case 'hi':
				emphasis = Math.max(0, emphasis - 1);
				break;

			case 'verse': {
				// Container style only: a milestone verse ends at its eID marker instead, which arrives
				// as an open event.
				if (milestoneVerse) break;

				const finished = finishVerse();
				if (finished) yield finished;
				pendingHeading = undefined;
				if (versesSeen % 500 === 0) yield { type: 'progress', done: versesSeen };
				break;
			}

			case 'header':
				inHeader = false;
				headerField = undefined;
				break;

			case 'div':
			case 'chapter': {
				// Guard against a file that never closes its last verse.
				const finished = finishVerse();
				if (finished) yield finished;
				break;
			}

			default:
				headerField = undefined;
				break;
		}
	}

	const trailing = finishVerse();
	if (trailing) yield trailing;
	if (!metadataEmitted) yield emitMetadata();
	yield { type: 'progress', done: versesSeen, total: versesSeen };
}

/**
 * Parses an osisID.
 *
 * Accepts `Gen.1.1`, ranges written with a hyphen or the non-breaking hyphen U+2011 that the Genfer
 * files use (`Ps.16.16‑17`), and the `Gen.1.1!a` sub-verse suffix, which is dropped.
 */
export function parseOsisId(value: string | undefined): OsisReference | undefined {
	if (!value) return undefined;

	// Some files list several ids in one attribute; the first is the primary reference.
	const first = value.trim().split(/\s+/)[0];
	if (!first) return undefined;

	const parts = first.split('.');
	if (parts.length < 3) return undefined;

	const book = bookByOsisId(parts[0]!);
	if (!book) return undefined;

	const chapter = Number.parseInt(parts[1]!, 10);
	// Strip a sub-verse marker such as "!a", then split a possible range.
	const versePart = parts[2]!.split('!')[0]!;
	const [startText, endText] = versePart.split(/[-‑–]/);

	const verse = Number.parseInt(startText ?? '', 10);
	if (!Number.isFinite(chapter) || !Number.isFinite(verse)) return undefined;

	const verseEnd = endText === undefined ? undefined : Number.parseInt(endText, 10);

	return {
		book: book.id,
		chapter,
		verse,
		...(verseEnd !== undefined && Number.isFinite(verseEnd) && verseEnd > verse ? { verseEnd } : {})
	};
}

/** `strong:G26` and `lemma.Strong:G26` both mean G26. */
function stripLemma(value: string): string {
	return value
		.split(/\s+/)
		.map((part) => part.replace(/^[\w.]*strong:/i, ''))
		.join(' ');
}

/** `robinson:V-AAI-3S` and `strongMorph:TH8804` reduce to the code itself. */
function normalizeMorph(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const code = value.replace(/^[\w.]*:/, '').trim();
	return code ? code.toUpperCase() : undefined;
}

function buildMetadata(
	header: Record<string, string>,
	workId: string | undefined,
	language: string | undefined
): ResourceMetadata {
	const clean = (value: string | undefined) => value?.replace(/\s+/g, ' ').trim() || undefined;

	const title = clean(header['title']) ?? clean(workId) ?? 'Unbenannte Übersetzung';
	const identifier = (clean(workId) ?? title)
		.replace(/[^\w]+/g, '')
		.toUpperCase()
		.slice(0, 32);
	const resolvedLanguage = clean(language) ?? clean(header['language']) ?? 'de';
	const rights = clean(header['rights']);

	return {
		id: identifier || 'OSIS',
		name: title,
		abbrev: title,
		language: resolvedLanguage.toLowerCase(),
		direction: resolvedLanguage.toLowerCase().startsWith('he') ? 'rtl' : 'ltr',
		...(rights ? { licenseHtml: rights } : {})
	};
}

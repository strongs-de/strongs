/**
 * Runtime auto-linking of Bible references quoted inside already-sanitised HTML prose (commentary
 * bodies today; potentially other freeform text later).
 *
 * `src/lib/bible/parse/strongs-xml.ts` already turns a lexicon source's explicit `<verseref>` tags
 * into `<a class="verse-ref" data-book=… data-chapter=… data-verse=… data-verse-end=…>` links that
 * `verseHoverPopover` (`src/lib/actions/verse-hover-popover.ts`) knows how to show a hover popup for —
 * but that only covers sources that already mark references up explicitly. Free text (a commentary
 * body, say) never does, so nothing there ever gets linked or hovered.
 *
 * This module finds references the same way `scanVerseReferences` in
 * `scripts/convert-kautz-lexicon.ts` does for that offline conversion — token by token, requiring a
 * *known* book abbreviation (via {@link findBookId}) immediately followed by a verse-shaped token, so
 * ordinary prose containing a word that also happens to be a book abbreviation ("Mal", "Ex", "mal" as
 * the German filler word) is not mistaken for a citation — and emits the exact same `<a class=
 * "verse-ref" …>` markup `strongs-xml.ts` does, so `verseHoverPopover` needs no changes to pick these
 * up wherever this function's output ends up in the DOM.
 *
 * Two differences from the Kautz script's version, both because this runs over this app's own prose
 * rather than Kautz' English-styled source text:
 *
 *  - Both `,` and `:` are accepted between chapter and verse (this app's own reference grammar,
 *    {@link import('./reference.ts').parseReference}, accepts either; German prose almost always
 *    uses the comma, e.g. "Joh 3,16").
 *  - Comma/dot-separated verse *lists* ("2:1,8,12,18") are not supported — this app's `VerseRef` only
 *    models a single verse or a single `a-b` range, so neither does this.
 *
 * Safety: this only ever matches inside text nodes. `html` is split on tag boundaries before any
 * reference scanning happens, so a match can never occur inside a tag name or attribute, and text
 * already inside an `<a>` or `<abbr>` element is left alone rather than wrapped in a second, nested
 * link — so running this on HTML that already carries reference links (or calling it twice) is safe.
 * It assumes `html` is otherwise *safe* — sanitised, or limited to a small set of attribute-less tags
 * the way `sanitizeHtml` in `parse/commentary.ts` produces — it does no sanitising of its own.
 */

import { findBookId } from './book-names.ts';
import { referencePath } from './reference.ts';

/** Matches a `chapter,verse[-verseEnd]` or `chapter:verse[-verseEnd]` token, e.g. "3,16" or "5:3-4". */
const VERSE_TOKEN = /^(\d{1,3})[,:](\d{1,3})(?:-(\d{1,3}))?$/;

/** Splits a string on HTML tag boundaries, keeping the tags themselves as their own array elements. */
const TAG_SPLIT = /(<[a-zA-Z/][^>]*>)/g;

/** Elements a reference link must never be nested inside — each already is (or contains) one. */
const NO_NEST_TAGS = new Set(['a', 'abbr']);

/** Splits trailing punctuation (closing parens, sentence stops) off a word so the core can be matched. */
function stripTrailingPunctuation(word: string): { core: string; suffix: string } {
	const match = /^(.*?)([.,;:)\]]*)$/.exec(word)!;
	return { core: match[1]!, suffix: match[2]! };
}

function escapeAttr(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

/** Renders one reference as the same `<a class="verse-ref" …>` markup `strongs-xml.ts` emits for a
 *  `<verseref>` tag, so `verseHoverPopover` treats the two identically. `label` is the original
 *  matched text verbatim (comma or colon, whatever the source used), not a reformatted version. */
function renderVerseLink(
	book: number,
	chapter: number,
	verse: number,
	verseEnd: number | undefined,
	label: string
): string {
	const href = referencePath({ book, chapter, verse, ...(verseEnd ? { verseEnd } : {}) });
	const attrs = [
		`href="${escapeAttr(href)}"`,
		`data-book="${book}"`,
		`data-chapter="${chapter}"`,
		`data-verse="${verse}"`,
		verseEnd ? `data-verse-end="${verseEnd}"` : ''
	]
		.filter(Boolean)
		.join(' ');
	return `<a class="verse-ref" ${attrs}>${label}</a>`;
}

/**
 * Scans one run of plain text (no markup) for Bible references, linking each one found. Mirrors
 * `scanVerseReferences` in `scripts/convert-kautz-lexicon.ts`: a token only starts a reference when it
 * matches a known book abbreviation *and* the following token is verse-shaped, and a later bare
 * verse-shaped token (e.g. "4,2" on its own, after "Joh 3,16") continues the same book without
 * repeating its name — the common German citation style "Joh 3,16; 4,2".
 *
 * `book` carries the "current book" across calls for the same logical run of text (i.e. across
 * `autoLinkProse`'s tag-boundary splits), the same way the module-level state does in the script this
 * is ported from.
 */
function linkVerseReferences(text: string, book: { current: number | undefined }): string {
	const parts = text.match(/\S+|\s+/g) ?? [];
	let out = '';

	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i]!;
		if (/^\s/.test(part)) {
			out += part;
			continue;
		}

		const bookId = findBookId(part);
		const afterSpace = parts[i + 1];
		const lookaheadWord = afterSpace && /^\s/.test(afterSpace) ? parts[i + 2] : undefined;
		const lookahead = lookaheadWord ? stripTrailingPunctuation(lookaheadWord) : undefined;
		const verseMatch = bookId !== undefined && lookahead ? VERSE_TOKEN.exec(lookahead.core) : null;

		if (bookId !== undefined && verseMatch) {
			book.current = bookId;
			const chapter = Number.parseInt(verseMatch[1]!, 10);
			const verse = Number.parseInt(verseMatch[2]!, 10);
			const verseEnd = verseMatch[3] ? Number.parseInt(verseMatch[3], 10) : undefined;
			const label = part + afterSpace + lookahead!.core;
			out += renderVerseLink(bookId, chapter, verse, verseEnd, label) + lookahead!.suffix;
			i += 2;
			continue;
		}

		const { core, suffix } = stripTrailingPunctuation(part);
		const bareMatch = VERSE_TOKEN.exec(core);
		if (bareMatch && book.current !== undefined) {
			const chapter = Number.parseInt(bareMatch[1]!, 10);
			const verse = Number.parseInt(bareMatch[2]!, 10);
			const verseEnd = bareMatch[3] ? Number.parseInt(bareMatch[3], 10) : undefined;
			out += renderVerseLink(book.current, chapter, verse, verseEnd, core) + suffix;
			continue;
		}

		book.current = undefined;
		out += part;
	}

	return out;
}

/**
 * Auto-links Bible references found in running HTML text (e.g. "Joh 3,16" or "Mt 5:3-4") into
 * hoverable, clickable `verse-ref` links — see the module doc comment above for the matching rules
 * and the safety guarantees around existing markup.
 */
export function autoLinkProse(html: string): string {
	const parts = html.split(TAG_SPLIT);
	const book: { current: number | undefined } = { current: undefined };
	let skipDepth = 0;
	let out = '';

	for (const part of parts) {
		if (!part) continue;

		const tagMatch = /^<(\/?)([a-zA-Z][\w-]*)/.exec(part);
		if (tagMatch) {
			const [, slash, name] = tagMatch;
			if (NO_NEST_TAGS.has(name!.toLowerCase())) {
				skipDepth = Math.max(0, skipDepth + (slash ? -1 : 1));
				book.current = undefined;
			}
			out += part;
			continue;
		}

		if (skipDepth > 0) {
			out += part;
			continue;
		}

		out += linkVerseReferences(part, book);
	}

	return out;
}

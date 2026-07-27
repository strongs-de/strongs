/**
 * Parsing and formatting of scripture references.
 *
 * This is the single place that understands the site's URL vocabulary. The old application spread
 * the same job over eight overlapping regexes in `strongs/urls.py` plus ad-hoc parsing in each view;
 * here one grammar handles every accepted form and everything else is a search query.
 *
 * Accepted input (case- and space-insensitive, umlauts optional):
 *
 *   Joh              → whole book, chapter 1
 *   Joh3   Joh 3     → chapter
 *   Joh3,16          → single verse
 *   Joh 3:16         → single verse (colon separator)
 *   Joh3_16          → single verse (underscore, as used by the old sidebar links)
 *   Joh3,16-18       → verse range
 *   1Mo1,1  1.Mose 1,1  Hohes Lied 2,1
 */

import { bookById, isValidBookId } from './books.ts';
import { bookName, bookShortName, findBookId } from './book-names.ts';

export type VerseRef = {
	book: number;
	chapter: number;
	/** Undefined means "the whole chapter". */
	verse?: number;
	/** Inclusive end of a verse range; only set when it is greater than `verse`. */
	verseEnd?: number;
};

/**
 * Book, chapter and verse are separated by `,`, `:` or `_`; ranges by `-` or an en dash. A book name
 * may itself start with a digit (`1Mo`) or contain spaces (`Hohes Lied`), so the book part is
 * matched lazily and grows until the remainder parses as numbers.
 */
const REFERENCE_PATTERN = /^(.+?)\s*(\d{1,3})(?:\s*[,:_]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/;

export function parseReference(input: string): VerseRef | null {
	const trimmed = input.trim().replace(/\s+/g, ' ');
	if (!trimmed) return null;

	const match = REFERENCE_PATTERN.exec(trimmed);
	if (!match) {
		// No numeric part at all: the whole string has to be a book name.
		const book = findBookId(trimmed);
		return book ? { book, chapter: 1 } : null;
	}

	const [, bookPart, chapterPart, versePart, verseEndPart] = match;
	const book = findBookId(bookPart ?? '');
	if (book === undefined) return null;

	const chapter = Number(chapterPart);
	if (!Number.isInteger(chapter) || chapter < 1) return null;

	const ref: VerseRef = { book, chapter };

	if (versePart !== undefined) {
		const verse = Number(versePart);
		if (verse < 1) return null;
		ref.verse = verse;

		if (verseEndPart !== undefined) {
			const verseEnd = Number(verseEndPart);
			// A backwards or degenerate range is treated as a single verse rather than an error.
			if (verseEnd > verse) ref.verseEnd = verseEnd;
		}
	}

	return ref;
}

/** True when the reference names a book that exists and a chapter within its canonical range. */
export function isReferenceInCanon(ref: VerseRef): boolean {
	const book = bookById(ref.book);
	return book !== undefined && ref.chapter >= 1 && ref.chapter <= book.chapters;
}

export type FormatOptions = {
	/** `short` gives `Joh 3,16`, `full` gives `Johannes 3,16`. */
	style?: 'short' | 'full';
};

/** Human-readable reference, e.g. `Joh 3,16` or `Joh 3,16-18`. */
export function formatReference(ref: VerseRef, options: FormatOptions = {}): string {
	const name = options.style === 'full' ? bookName(ref.book) : bookShortName(ref.book);
	let out = `${name} ${ref.chapter}`;
	if (ref.verse !== undefined) {
		out += `,${ref.verse}`;
		if (ref.verseEnd !== undefined) out += `-${ref.verseEnd}`;
	}
	return out;
}

/**
 * The canonical URL path for a reference, e.g. `/Joh3,16`.
 *
 * Kept terse and space-free, matching the URLs the previous site published so existing links and
 * search-engine results keep working.
 */
export function referencePath(ref: VerseRef): string {
	let out = `/${bookShortName(ref.book)}${ref.chapter}`;
	if (ref.verse !== undefined) {
		out += `,${ref.verse}`;
		if (ref.verseEnd !== undefined) out += `-${ref.verseEnd}`;
	}
	return out;
}

/** Stable identifier for a single verse, used as a DOM id and in anchors: `Joh3_16`. */
export function verseAnchor(book: number, chapter: number, verse: number): string {
	return `${bookShortName(book)}${chapter}_${verse}`;
}

/**
 * Sortable integer key for a verse, so ranges and postings can be compared and stored compactly.
 * Layout: book * 1_000_000 + chapter * 1_000 + verse, valid for chapters and verses below 1000.
 */
export function verseKey(book: number, chapter: number, verse: number): number {
	return book * 1_000_000 + chapter * 1_000 + verse;
}

export function parseVerseKey(key: number): { book: number; chapter: number; verse: number } {
	return {
		book: Math.floor(key / 1_000_000),
		chapter: Math.floor((key % 1_000_000) / 1_000),
		verse: key % 1_000
	};
}

/**
 * Chapter that follows the given one, crossing into the next book at the end, or null at the end of
 * the canon. Replaces the ad-hoc `bookNr + 1` arithmetic in the old `views_bible.py`.
 */
export function nextChapter(
	book: number,
	chapter: number
): { book: number; chapter: number } | null {
	const current = bookById(book);
	if (!current) return null;
	if (chapter < current.chapters) return { book, chapter: chapter + 1 };
	return isValidBookId(book + 1) ? { book: book + 1, chapter: 1 } : null;
}

/** Chapter preceding the given one, crossing back into the previous book, or null at Genesis 1. */
export function previousChapter(
	book: number,
	chapter: number
): { book: number; chapter: number } | null {
	if (chapter > 1) return { book, chapter: chapter - 1 };
	const previous = bookById(book - 1);
	return previous ? { book: previous.id, chapter: previous.chapters } : null;
}

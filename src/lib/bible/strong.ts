/**
 * Strong's number handling.
 *
 * A Strong's number is stored and displayed with its language prefix — `G26`, `H430` — because the
 * Hebrew and Greek dictionaries number independently. Source files are inconsistent: Zefania stores
 * bare numbers (`<gr str="430">`, where the containing book decides the language), OSIS stores
 * `strong:G26`, and some sources use zero padding or ranges. Everything is normalised on the way in.
 */

import { strongLanguageForBook } from './books.ts';

export type StrongLanguage = 'hebrew' | 'greek';

export type StrongId = string;

/**
 * Highest number in each dictionary, used to reject nonsense input early. Greek's ceiling is not the
 * canonical dictionary's own top number (5624) but 6020: Gerhard Kautz' German lexicon adds a synonym
 * appendix numbered 5801-6020 (5625/5626 are two placeholder gaps in between, never assigned), and its
 * entries cross-reference each other and the main dictionary as "Synonyme siehe: NNNN" — those need to
 * resolve to real, clickable ids rather than 404 just because they sit past the original ceiling.
 */
const MAX_NUMBER: Record<StrongLanguage, number> = { hebrew: 8674, greek: 6020 };

const PREFIX: Record<StrongLanguage, string> = { hebrew: 'H', greek: 'G' };

export function makeStrongId(language: StrongLanguage, number: number): StrongId {
	return `${PREFIX[language]}${number}`;
}

/**
 * Parses a prefixed Strong's number such as `G26`, `h430`, `G0026`.
 * Returns null for anything else, including bare numbers — use {@link strongIdFromSource} when the
 * language has to be inferred from the containing book.
 */
export function parseStrongId(input: string): { language: StrongLanguage; number: number } | null {
	const match = /^\s*([GgHh])\s*0*(\d{1,5})\s*$/.exec(input);
	if (!match) return null;

	const language: StrongLanguage = match[1]!.toUpperCase() === 'H' ? 'hebrew' : 'greek';
	const number = Number(match[2]);
	if (number < 1 || number > MAX_NUMBER[language]) return null;

	return { language, number };
}

/** Normalises any accepted spelling to the canonical id, or null if it is not a Strong's number. */
export function normalizeStrongId(input: string): StrongId | null {
	const parsed = parseStrongId(input);
	return parsed ? makeStrongId(parsed.language, parsed.number) : null;
}

/**
 * Builds a canonical id from a raw source value and the book it appeared in.
 *
 * Handles the bare numbers used by Zefania XML (`<gr str="430">` in Genesis is H430, in Matthew
 * G430) as well as already-prefixed values and the `strong:G26` form used by OSIS.
 */
export function strongIdFromSource(raw: string, bookId: number): StrongId | null {
	const cleaned = raw.trim().replace(/^strong:/i, '');
	if (!cleaned) return null;

	const prefixed = parseStrongId(cleaned);
	if (prefixed) return makeStrongId(prefixed.language, prefixed.number);

	const bare = /^0*(\d{1,5})$/.exec(cleaned);
	if (!bare) return null;

	const language = strongLanguageForBook(bookId);
	const number = Number(bare[1]);
	if (number < 1 || number > MAX_NUMBER[language]) return null;

	return makeStrongId(language, number);
}

/**
 * Splits a source attribute that carries several numbers, as some translations do for words that
 * render a whole Hebrew phrase: `"430 853"` or `"G2532-G1161"`.
 */
export function strongIdsFromSource(raw: string, bookId: number): StrongId[] {
	return raw
		.split(/[\s,;|+-]+/)
		.map((part) => strongIdFromSource(part, bookId))
		.filter((id): id is StrongId => id !== null);
}

export function strongLanguage(id: StrongId): StrongLanguage {
	return id.startsWith('H') ? 'hebrew' : 'greek';
}

export function strongNumber(id: StrongId): number {
	return Number(id.slice(1));
}

/** The same number in the other dictionary, offered as a suggestion when a lookup finds nothing. */
export function otherLanguageId(id: StrongId): StrongId {
	const language = strongLanguage(id) === 'hebrew' ? 'greek' : 'hebrew';
	const number = strongNumber(id);
	return number <= MAX_NUMBER[language] ? makeStrongId(language, number) : id;
}

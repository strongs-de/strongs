/**
 * Search query parsing.
 *
 * The old site built its SQL by hand: it split the input on spaces and required every part to appear
 * after a space or a `>` (`versText LIKE '% wort%' OR versText LIKE '%>wort%'`), which is how it got
 * word-prefix matching out of a substring search. That behaviour is worth keeping — people expect
 * "lieb" to find "Liebe" — so prefix matching stays the default, now on top of PostgreSQL's German
 * stemmer instead of a table scan.
 *
 * Accepted input:
 *
 *   liebe gott            both words, in any order, matching word beginnings
 *   "am Anfang"           exactly this sequence of words
 *   liebe "des vaters"    a mix of the two
 *   -zorn                 excludes verses containing the word
 */

export type QueryTerm =
	| { kind: 'prefix'; text: string }
	| { kind: 'phrase'; text: string }
	| { kind: 'exclude'; text: string };

export type ParsedQuery = {
	terms: QueryTerm[];
	/** True when nothing usable was given. */
	empty: boolean;
	/** Words to highlight in results: the phrases and prefixes, without the exclusions. */
	highlight: string[];
};

export function parseSearchQuery(input: string): ParsedQuery {
	const terms: QueryTerm[] = [];
	// Matches "a quoted phrase", -excluded, or a bare word.
	const pattern = /"([^"]*)"|(-?)(\S+)/g;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(input)) !== null) {
		const [, quoted, negation, bare] = match;

		if (quoted !== undefined) {
			const text = sanitize(quoted);
			if (text) terms.push({ kind: 'phrase', text });
			continue;
		}

		const text = sanitize(bare ?? '');
		if (!text) continue;
		terms.push(negation === '-' ? { kind: 'exclude', text } : { kind: 'prefix', text });
	}

	return {
		terms,
		empty: terms.every((term) => term.kind === 'exclude') || terms.length === 0,
		highlight: terms
			.filter((term) => term.kind !== 'exclude')
			.flatMap((term) => term.text.split(/\s+/))
			.filter(Boolean)
	};
}

/**
 * Strips everything that is not part of a word.
 *
 * The result is interpolated into a `tsquery` string, so any character with meaning there — `&`, `|`,
 * `!`, `:`, `*`, parentheses, quotes — has to go. German letters, digits, hyphens and apostrophes are
 * kept, since they occur inside words.
 */
function sanitize(value: string): string {
	return value
		.replace(/[^\p{Letter}\p{Number}\-' ]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Folds a word the way the search configuration does, for client-side highlighting: lower case,
 * umlauts and ß resolved. Mirrors what `unaccent` plus `german_stem` do to the index, minus the
 * stemming, which cannot be undone in the browser.
 */
export function foldForHighlight(value: string): string {
	return value
		.toLowerCase()
		.replaceAll('ä', 'a')
		.replaceAll('ö', 'o')
		.replaceAll('ü', 'u')
		.replaceAll('ß', 'ss');
}

/**
 * Whether a word in a result should be highlighted.
 *
 * Prefix comparison rather than equality, matching the search semantics: a search for "lieb" finds
 * and highlights "Liebe". Highlighting is approximate by nature — the index matches stems, and a stem
 * cannot be mapped back to the word forms it covers — so it errs towards marking a word rather than
 * leaving an obvious match unmarked.
 */
export function shouldHighlight(word: string, needles: string[]): boolean {
	if (needles.length === 0) return false;
	const folded = foldForHighlight(word.replace(/[^\p{Letter}\p{Number}\-']/gu, ''));
	if (!folded) return false;

	return needles.some((needle) => {
		const foldedNeedle = foldForHighlight(needle);
		if (foldedNeedle.length < 2) return folded === foldedNeedle;
		// Compare on a shortened stem so inflected forms still light up.
		const stem = foldedNeedle.slice(0, Math.max(3, foldedNeedle.length - 2));
		return folded.startsWith(stem);
	});
}

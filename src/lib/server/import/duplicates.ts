/**
 * How a repeated verse reference inside one source is resolved.
 *
 * Extracted from the ingester so the rule — which is derived from a real defect in a real file, not
 * from taste — can be tested on its own. See `ingest-bible.ts` for the full explanation.
 */

import { segmentsToText } from '../../bible/segments.ts';
import type { ParsedVerse } from '../../bible/parse/types.ts';

export type DuplicateOutcome = {
	/** Which of the two to store. */
	keep: 'first' | 'later';
	verse: ParsedVerse;
	/** Wording for the import warning. */
	reason: string;
};

/**
 * Prefers the first non-empty text.
 *
 * A source that repeats a reference is broken in one of two ways: it duplicates a block of verses
 * (then the first copy is the correctly numbered one), or it pads a block with empty placeholders
 * before the real text arrives (then the later one is the only usable text).
 */
export function resolveDuplicate(first: ParsedVerse, later: ParsedVerse): DuplicateOutcome {
	if (segmentsToText(first.segments) !== '') {
		return { keep: 'first', verse: first, reason: 'keeping the first text' };
	}
	if (segmentsToText(later.segments) !== '') {
		return { keep: 'later', verse: later, reason: 'the first was empty, keeping the later text' };
	}
	// Both are empty, so there is nothing to choose; keep the first for a stable outcome.
	return { keep: 'first', verse: first, reason: 'both are empty' };
}

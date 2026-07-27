/**
 * Structured verse content.
 *
 * A verse is a list of segments. Import parses the source markup once into this shape; the reader
 * renders it directly. That replaces `legacy/strongs/templatetags/strongs_extras.py`, which rebuilt
 * HTML on every request with a chain of string replacements — including a global
 * `s.replace(',', ', ')` that also rewrote commas inside HTML attributes and numbers.
 *
 * The representation is deliberately compact, because it is stored as JSON for every verse of every
 * translation: plain runs are bare strings and optional fields are omitted rather than set to null.
 */

/** A run of plain text. */
export type TextSegment = string;

/** A word carrying a Strong's number, which the reader turns into a clickable lookup. */
export type WordSegment = {
	readonly kind: 'w';
	/** The word as this translation renders it. */
	readonly text: string;
	/** Canonical Strong's id, e.g. `G26`. */
	readonly strong: string;
	/** Robinson morphology code, when the source provides one. */
	readonly morph?: string;
};

/** A footnote or study note attached at this position. */
export type NoteSegment = {
	readonly kind: 'note';
	/** Marker shown inline, e.g. `1` or `a`. Empty means "use a generic marker". */
	readonly marker: string;
	readonly text: string;
};

/** Emphasised text — italics in most sources, marking words added by the translators. */
export type EmphasisSegment = {
	readonly kind: 'em';
	readonly text: string;
};

/** A line break inside a verse, as used in poetry. */
export type BreakSegment = { readonly kind: 'br' };

/** Words of Jesus, where a source marks them. */
export type RedLetterSegment = {
	readonly kind: 'wj';
	readonly children: readonly VerseSegment[];
};

export type VerseSegment =
	TextSegment | WordSegment | NoteSegment | EmphasisSegment | BreakSegment | RedLetterSegment;

export function isTextSegment(segment: VerseSegment): segment is TextSegment {
	return typeof segment === 'string';
}

/**
 * Flattens segments to the plain text used for full-text search, snippets and copying.
 *
 * Notes are excluded: they are editorial apparatus, and including them would make searches match
 * words that are not in the verse.
 */
export function segmentsToText(segments: readonly VerseSegment[]): string {
	let out = '';
	for (const segment of segments) {
		if (typeof segment === 'string') out += segment;
		else if (segment.kind === 'w' || segment.kind === 'em') out += segment.text;
		else if (segment.kind === 'br') out += ' ';
		else if (segment.kind === 'wj') out += segmentsToText(segment.children);
	}
	return normalizeWhitespace(out);
}

/** Collapses runs of whitespace and trims, without touching the characters themselves. */
export function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

/**
 * Tidies spacing around punctuation that source markup leaves behind.
 *
 * Zefania files put a trailing space inside every tagged word — `<gr str="976">Buch </gr> des` — so a
 * naive join produces `Buch , des`. The old code chased this with two dozen string replacements; the
 * rules are collected here and applied once at import.
 */
export function tidyPunctuation(value: string): string {
	return (
		value
			// No space before closing punctuation.
			.replace(/\s+([,.;:!?»”’)\]])/g, '$1')
			// No space after opening punctuation.
			.replace(/([«“‘(\[])\s+/g, '$1')
			// Collapse whatever is left.
			.replace(/\s{2,}/g, ' ')
			.trim()
	);
}

/**
 * Appends text to a segment list, merging with a preceding plain run so the stored JSON does not
 * accumulate a segment per character of markup noise.
 */
export function pushText(segments: VerseSegment[], text: string): void {
	if (!text) return;
	const last = segments.at(-1);
	if (typeof last === 'string') segments[segments.length - 1] = last + text;
	else segments.push(text);
}

/** Drops empty runs and trims the leading and trailing whitespace of a finished verse. */
export function finalizeSegments(segments: VerseSegment[]): VerseSegment[] {
	const out = segments.filter(
		(segment) => typeof segment !== 'string' || segment.trim().length > 0 || segment === ' '
	);

	const first = out[0];
	if (typeof first === 'string') {
		const trimmed = first.replace(/^\s+/, '');
		if (trimmed) out[0] = trimmed;
		else out.shift();
	}

	const last = out.at(-1);
	if (typeof last === 'string') {
		const trimmed = last.replace(/\s+$/, '');
		if (trimmed) out[out.length - 1] = trimmed;
		else out.pop();
	}

	return out;
}

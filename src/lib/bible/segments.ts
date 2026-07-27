/**
 * Structured verse content.
 *
 * A verse is a list of segments. Import parses the source markup once into this shape; the reader
 * renders it directly. That replaces the old `strongs_extras.py` template filter, which rebuilt
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
	/** Canonical Strong's id of the primary sense, e.g. `G26`. Shown and linked by default. */
	readonly strong: string;
	/**
	 * All ids this word carries, including `strong`, and only present when there is more than one.
	 *
	 * German renders a Hebrew phrase as a single word often enough to matter: "sechshundert" is
	 * H8337 (six) plus H3967 (hundred), and Elberfelder writes that as `str="8337-H3967"`. There are
	 * 2,726 such words in the bundled Elberfelder text.
	 */
	readonly strongs?: readonly string[];
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

export type TaggedWord = {
	/** 0-based index within the verse, in reading order. */
	position: number;
	text: string;
	strong: string;
	morph?: string;
};

/**
 * Extracts the Strong-tagged words of a verse in reading order.
 *
 * Used at import time to fill `verse_words`, which is what makes "every place this word occurs" and
 * the rendering statistics ordinary SQL queries.
 *
 * A word carrying several Strong's numbers yields one entry per number, all sharing the same
 * position, so a search for any of them finds the verse.
 */
export function wordsFromSegments(segments: readonly VerseSegment[]): TaggedWord[] {
	const words: TaggedWord[] = [];
	let position = 0;

	const walk = (list: readonly VerseSegment[]): void => {
		for (const segment of list) {
			if (typeof segment === 'string') continue;

			if (segment.kind === 'w') {
				for (const strong of segment.strongs ?? [segment.strong]) {
					words.push({
						position,
						text: segment.text,
						strong,
						...(segment.morph ? { morph: segment.morph } : {})
					});
				}
				position += 1;
			} else if (segment.kind === 'wj') {
				walk(segment.children);
			}
		}
	};

	walk(segments);
	return words;
}

/** Collapses runs of whitespace and trims, without touching the characters themselves. */
export function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

const CLOSING_PUNCTUATION = ',.;:!?)]»”’';
const OPENING_PUNCTUATION = '([«“‘';

/**
 * Repairs the spacing that tagged-word markup leaves behind, operating only on the plain runs
 * between words so the words themselves are never altered.
 *
 * Zefania puts the space that separates two words *inside* the preceding element —
 * `<gr str="976">Buch </gr> des <gr str="1078">Geschlechts </gr>,` — which on its own produces
 * "Buch des Geschlechts ,". Three rules are enough:
 *
 *  1. collapse runs of whitespace,
 *  2. drop a leading space that sits in front of closing punctuation,
 *  3. drop a trailing space that sits behind opening punctuation.
 */
export function tidySegmentSpacing(segments: VerseSegment[]): VerseSegment[] {
	return segments.map((segment) => {
		if (typeof segment !== 'string') return segment;

		let text = segment.replace(/\s+/g, ' ');

		if (text.length > 1 && text.startsWith(' ') && CLOSING_PUNCTUATION.includes(text[1]!)) {
			text = text.slice(1);
		}
		if (text.length > 1 && text.endsWith(' ') && OPENING_PUNCTUATION.includes(text.at(-2)!)) {
			text = text.slice(0, -1);
		}

		return text;
	});
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

import { describe, expect, it } from 'vitest';
import {
	formatReference,
	nextChapter,
	parseReference,
	parseVerseKey,
	previousChapter,
	referencePath,
	verseAnchor,
	verseKey,
	type VerseRef
} from './reference.ts';

describe('parseReference', () => {
	const cases: [input: string, expected: VerseRef][] = [
		// The forms the old site published, which must keep working.
		['Joh3,16', { book: 43, chapter: 3, verse: 16 }],
		['joh3,16', { book: 43, chapter: 3, verse: 16 }],
		['Joh 3,16', { book: 43, chapter: 3, verse: 16 }],
		['Joh3', { book: 43, chapter: 3 }],
		['joh', { book: 43, chapter: 1 }],
		['1Mo1,1', { book: 1, chapter: 1, verse: 1 }],
		['1.Mose 1,1', { book: 1, chapter: 1, verse: 1 }],
		['Ps23', { book: 19, chapter: 23 }],
		['Ps 119,105', { book: 19, chapter: 119, verse: 105 }],
		// Separator variants.
		['Joh 3:16', { book: 43, chapter: 3, verse: 16 }],
		['Joh3_16', { book: 43, chapter: 3, verse: 16 }],
		// Ranges.
		['Joh3,16-18', { book: 43, chapter: 3, verse: 16, verseEnd: 18 }],
		['Joh3,16–18', { book: 43, chapter: 3, verse: 16, verseEnd: 18 }],
		// Multi-word and umlaut book names.
		['Hohes Lied 2,1', { book: 22, chapter: 2, verse: 1 }],
		['1.Könige 8', { book: 11, chapter: 8 }],
		['1Konige8', { book: 11, chapter: 8 }],
		['Römer8,28', { book: 45, chapter: 8, verse: 28 }],
		['roemer 8', { book: 45, chapter: 8 }],
		// Books whose names begin with a digit, parsed without a separator.
		['1Joh1,9', { book: 62, chapter: 1, verse: 9 }],
		['3Joh1', { book: 64, chapter: 1 }],
		['2Kor12,9', { book: 47, chapter: 12, verse: 9 }],
		// Historical short forms from the old JavaScript arrays.
		['Off22,21', { book: 66, chapter: 22, verse: 21 }],
		['1Thes5', { book: 52, chapter: 5 }],
		['Hoh2', { book: 22, chapter: 2 }],
		// OSIS abbreviations, so imported identifiers resolve too.
		['Rev22', { book: 66, chapter: 22 }],
		['1Sam17,45', { book: 9, chapter: 17, verse: 45 }]
	];

	it.each(cases)('parses %s', (input, expected) => {
		expect(parseReference(input)).toEqual(expected);
	});

	it('defaults a bare book name to chapter 1', () => {
		expect(parseReference('Offenbarung')).toEqual({ book: 66, chapter: 1 });
	});

	it('treats a backwards range as a single verse', () => {
		expect(parseReference('Joh3,18-16')).toEqual({ book: 43, chapter: 3, verse: 18 });
	});

	it.each(['', '   ', 'Liebe', 'am Anfang', 'Gnade und Wahrheit', 'Xyz3,16', '42', 'G26', 'H430'])(
		'rejects %s, which is a search query rather than a reference',
		(input) => {
			expect(parseReference(input)).toBeNull();
		}
	);
});

describe('formatReference and referencePath', () => {
	it('formats with the short book name by default', () => {
		expect(formatReference({ book: 43, chapter: 3, verse: 16 })).toBe('Joh 3,16');
	});

	it('formats with the full book name on request', () => {
		expect(formatReference({ book: 43, chapter: 3, verse: 16 }, { style: 'full' })).toBe(
			'Johannes 3,16'
		);
	});

	it('formats ranges and whole chapters', () => {
		expect(formatReference({ book: 43, chapter: 3, verse: 16, verseEnd: 18 })).toBe('Joh 3,16-18');
		expect(formatReference({ book: 19, chapter: 23 })).toBe('Ps 23');
	});

	it('builds paths that parse back to the same reference', () => {
		const refs: VerseRef[] = [
			{ book: 1, chapter: 1, verse: 1 },
			{ book: 19, chapter: 119 },
			{ book: 43, chapter: 3, verse: 16, verseEnd: 18 },
			{ book: 62, chapter: 1, verse: 9 },
			{ book: 66, chapter: 22, verse: 21 }
		];
		for (const ref of refs) {
			const path = referencePath(ref);
			expect(parseReference(path.slice(1)), path).toEqual(ref);
		}
	});

	it('builds verse anchors in the format used by the reader DOM', () => {
		expect(verseAnchor(43, 3, 16)).toBe('Joh3_16');
	});
});

describe('verseKey', () => {
	it('round-trips', () => {
		expect(parseVerseKey(verseKey(43, 3, 16))).toEqual({ book: 43, chapter: 3, verse: 16 });
		expect(parseVerseKey(verseKey(19, 119, 176))).toEqual({ book: 19, chapter: 119, verse: 176 });
	});

	it('sorts in canonical order', () => {
		const keys = [verseKey(43, 3, 16), verseKey(1, 1, 1), verseKey(43, 3, 2), verseKey(19, 23, 1)];
		expect([...keys].sort((a, b) => a - b)).toEqual([
			verseKey(1, 1, 1),
			verseKey(19, 23, 1),
			verseKey(43, 3, 2),
			verseKey(43, 3, 16)
		]);
	});
});

describe('chapter navigation', () => {
	it('moves within a book', () => {
		expect(nextChapter(43, 3)).toEqual({ book: 43, chapter: 4 });
		expect(previousChapter(43, 3)).toEqual({ book: 43, chapter: 2 });
	});

	it('crosses book boundaries', () => {
		// John has 21 chapters, so the next chapter is Acts 1.
		expect(nextChapter(43, 21)).toEqual({ book: 44, chapter: 1 });
		// Back from Acts 1 is John 21.
		expect(previousChapter(44, 1)).toEqual({ book: 43, chapter: 21 });
	});

	it('stops at the ends of the canon', () => {
		expect(nextChapter(66, 22)).toBeNull();
		expect(previousChapter(1, 1)).toBeNull();
	});
});

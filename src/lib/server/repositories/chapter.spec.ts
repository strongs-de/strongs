import { describe, expect, it } from 'vitest';
import { arrangeChapter } from './chapter.ts';
import type { VerseSegment } from '../../bible/segments.ts';

function raw(
	resourceId: string,
	verse: number,
	text: string,
	extra: { verseEnd?: number; heading?: string } = {}
) {
	return {
		resourceId,
		verse,
		verseEnd: extra.verseEnd ?? null,
		segments: [text] as VerseSegment[],
		heading: extra.heading ?? null
	};
}

const textOf = (cell: { segments: VerseSegment[] } | null) =>
	cell ? (cell.segments[0] as string) : null;

describe('arrangeChapter', () => {
	it('aligns the same verse across columns', () => {
		const chapter = arrangeChapter(
			[raw('A', 1, 'A1'), raw('B', 1, 'B1'), raw('A', 2, 'A2'), raw('B', 2, 'B2')],
			['A', 'B'],
			43,
			3
		);

		expect(chapter.rows.map((row) => row.verse)).toEqual([1, 2]);
		expect(chapter.rows.map((row) => row.cells.map(textOf))).toEqual([
			['A1', 'B1'],
			['A2', 'B2']
		]);
	});

	it('leaves a gap where a translation lacks a verse, instead of shifting its text up', () => {
		// The interlinear is missing verses the other translations have; the old reader let the column
		// slide out of step because it simply listed each column's verses in order.
		const chapter = arrangeChapter(
			[
				raw('A', 1, 'A1'),
				raw('A', 2, 'A2'),
				raw('A', 3, 'A3'),
				raw('B', 1, 'B1'),
				raw('B', 3, 'B3')
			],
			['A', 'B'],
			41,
			7
		);

		expect(chapter.rows.map((row) => row.cells.map(textOf))).toEqual([
			['A1', 'B1'],
			['A2', null],
			['A3', 'B3']
		]);
	});

	it('spans a merged range across the rows it covers', () => {
		// One translation prints 16-17 as one unit, the other prints them separately.
		const chapter = arrangeChapter(
			[
				raw('A', 16, 'A16-17', { verseEnd: 17 }),
				raw('B', 16, 'B16'),
				raw('B', 17, 'B17'),
				raw('A', 18, 'A18'),
				raw('B', 18, 'B18')
			],
			['A', 'B'],
			43,
			3
		);

		expect(chapter.rows.map((row) => row.verse)).toEqual([16, 17, 18]);
		expect(chapter.rows[0]?.cells[0]).toMatchObject({ verse: 16, verseEnd: 17, span: 2 });
		// Row 17 has nothing in column A: its cell already covers that row.
		expect(chapter.rows[1]?.cells[0]).toBeNull();
		expect(textOf(chapter.rows[1]?.cells[1] ?? null)).toBe('B17');
		expect(chapter.rows[2]?.cells.map(textOf)).toEqual(['A18', 'B18']);
	});

	it('creates rows for verse numbers that only a range mentions', () => {
		const chapter = arrangeChapter([raw('A', 1, 'A1-3', { verseEnd: 3 })], ['A'], 43, 3);
		expect(chapter.rows.map((row) => row.verse)).toEqual([1, 2, 3]);
		expect(chapter.rows[0]?.cells[0]).toMatchObject({ span: 3 });
		expect(chapter.rows[1]?.cells[0]).toBeNull();
		expect(chapter.rows[2]?.cells[0]).toBeNull();
	});

	it('collects headings by the verse they precede', () => {
		const chapter = arrangeChapter(
			[raw('A', 1, 'A1', { heading: 'Der gute Hirte' }), raw('B', 1, 'B1')],
			['A', 'B'],
			19,
			23
		);

		expect(chapter.headings.get(1)).toBe('Der gute Hirte');
	});

	it('keeps the column order of the request, not of the query result', () => {
		const chapter = arrangeChapter([raw('B', 1, 'B1'), raw('A', 1, 'A1')], ['A', 'B'], 1, 1);
		expect(chapter.rows[0]?.cells.map(textOf)).toEqual(['A1', 'B1']);
	});

	it('reports an empty chapter', () => {
		expect(arrangeChapter([], ['A'], 1, 1).empty).toBe(true);
		expect(arrangeChapter([raw('A', 1, 'A1')], ['A'], 1, 1).empty).toBe(false);
	});
});

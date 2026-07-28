/**
 * Chapter reads for the parallel reader.
 *
 * One query fetches the chapter in every selected translation; the rows are then arranged into the
 * grid the reader renders, one row per verse number with a cell per translation. The previous version
 * ran one query per column and let jQuery equalise row heights in the browser after paint.
 */

import { and, asc, eq, inArray } from 'drizzle-orm';
import type { VerseSegment } from '../../bible/segments.ts';
import type { Database } from '../db/client.ts';
import { verses } from '../db/schema.ts';

export type ChapterVerse = {
	verse: number;
	/** Last verse of a merged range, when the translation prints several verses as one unit. */
	verseEnd: number | null;
	/** Grid rows this cell occupies: greater than one for a merged range. */
	span: number;
	segments: VerseSegment[];
	heading: string | null;
};

/** One row of the reader grid: a verse number and the text of it in each column. */
export type ChapterRow = {
	verse: number;
	/** Indexed like the requested resource list; null where a translation has no cell starting here. */
	cells: (ChapterVerse | null)[];
};

export type Chapter = {
	book: number;
	chapter: number;
	rows: ChapterRow[];
	/** Headings that appear in the chapter, keyed by the verse they precede. */
	headings: Map<number, string>;
	/** True when no requested translation has any text for this chapter. */
	empty: boolean;
};

export async function loadChapter(
	db: Database,
	options: { resourceIds: string[]; book: number; chapter: number }
): Promise<Chapter> {
	const { resourceIds, book, chapter } = options;

	if (resourceIds.length === 0) {
		return { book, chapter, rows: [], headings: new Map(), empty: true };
	}

	const rows = await db
		.select({
			resourceId: verses.resourceId,
			verse: verses.verse,
			verseEnd: verses.verseEnd,
			segments: verses.segments,
			heading: verses.heading
		})
		.from(verses)
		.where(
			and(
				inArray(verses.resourceId, resourceIds),
				eq(verses.bookId, book),
				eq(verses.chapter, chapter)
			)
		)
		.orderBy(asc(verses.verse));

	return arrangeChapter(rows, resourceIds, book, chapter);
}

type RawVerse = {
	resourceId: string;
	verse: number;
	verseEnd: number | null;
	segments: VerseSegment[];
	heading: string | null;
};

/**
 * Arranges verses into aligned rows.
 *
 * A merged range (`verseEnd`) claims the rows of every verse it covers, so the columns stay in step:
 * where one translation prints 16-17 as a unit and another prints them separately, the unit spans two
 * grid rows. Verse numbers absent from a translation leave a gap rather than shifting its text up,
 * which is what made the old interlinear column drift out of alignment.
 */
export function arrangeChapter(
	raw: RawVerse[],
	resourceIds: string[],
	book: number,
	chapter: number
): Chapter {
	const byResource = new Map<string, Map<number, RawVerse>>();
	const headings = new Map<number, string>();
	const verseNumbers = new Set<number>();

	for (const row of raw) {
		const forResource = byResource.get(row.resourceId) ?? new Map<number, RawVerse>();
		forResource.set(row.verse, row);
		byResource.set(row.resourceId, forResource);

		// A merged range occupies every verse number it covers.
		const last = row.verseEnd && row.verseEnd > row.verse ? row.verseEnd : row.verse;
		for (let verse = row.verse; verse <= last; verse += 1) verseNumbers.add(verse);

		// The first translation that supplies a heading wins, so columns do not disagree.
		if (row.heading && !headings.has(row.verse)) headings.set(row.verse, row.heading);
	}

	const ordered = [...verseNumbers].sort((left, right) => left - right);
	const rows: ChapterRow[] = [];
	/** Verse numbers already consumed by a range in a given column. */
	const consumed = resourceIds.map(() => new Set<number>());

	for (const verse of ordered) {
		const cells = resourceIds.map((resourceId, column) => {
			if (consumed[column]!.has(verse)) return null;

			const found = byResource.get(resourceId)?.get(verse);
			if (!found) return null;

			const last = found.verseEnd && found.verseEnd > found.verse ? found.verseEnd : found.verse;
			for (let covered = found.verse; covered <= last; covered += 1) {
				consumed[column]!.add(covered);
			}

			return {
				verse: found.verse,
				verseEnd: found.verseEnd,
				span: last - found.verse + 1,
				segments: found.segments,
				heading: found.heading
			};
		});

		rows.push({ verse, cells });
	}

	return { book, chapter, rows, headings, empty: rows.length === 0 };
}

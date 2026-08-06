/**
 * Verse highlights: which verse carries which colour from a reader's palette.
 *
 * A verse holds at most one highlight; picking a different colour replaces it rather than stacking,
 * matching a physical highlighter.
 */

import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import type { VerseSegment } from '../../bible/segments.ts';
import { highlightStyles, verseHighlights, verses } from '../db/schema.ts';

export type ChapterHighlight = {
	verse: number;
	styleId: string;
	color: string;
	name: string | null;
};

export type HighlightedVerse = {
	id: string;
	book: number;
	chapter: number;
	verse: number;
	segments: VerseSegment[] | null;
	updatedAt: Date;
};

/** All verses carrying one palette colour, with text from the requested Bible where available. */
export async function listHighlightedVerses(
	db: Database,
	userId: string,
	styleId: string,
	resourceId: string | null
): Promise<{
	style: { id: string; color: string; name: string | null };
	verses: HighlightedVerse[];
} | null> {
	const [style] = await db
		.select({ id: highlightStyles.id, color: highlightStyles.color, name: highlightStyles.name })
		.from(highlightStyles)
		.where(and(eq(highlightStyles.id, styleId), eq(highlightStyles.userId, userId)))
		.limit(1);
	if (!style) return null;

	const highlighted = await db
		.select({
			id: verseHighlights.id,
			book: verseHighlights.bookId,
			chapter: verseHighlights.chapter,
			verse: verseHighlights.verse,
			segments: verses.segments,
			updatedAt: verseHighlights.updatedAt
		})
		.from(verseHighlights)
		.leftJoin(
			verses,
			resourceId
				? and(
						eq(verses.resourceId, resourceId),
						eq(verses.bookId, verseHighlights.bookId),
						eq(verses.chapter, verseHighlights.chapter),
						eq(verses.verse, verseHighlights.verse)
					)
				: sql`false`
		)
		.where(and(eq(verseHighlights.userId, userId), eq(verseHighlights.styleId, styleId)))
		.orderBy(asc(verseHighlights.bookId), asc(verseHighlights.chapter), asc(verseHighlights.verse));

	return { style, verses: highlighted };
}

export async function loadChapterHighlights(
	db: Database,
	userId: string,
	book: number,
	chapter: number
): Promise<ChapterHighlight[]> {
	return db
		.select({
			verse: verseHighlights.verse,
			styleId: verseHighlights.styleId,
			color: highlightStyles.color,
			name: highlightStyles.name
		})
		.from(verseHighlights)
		.innerJoin(highlightStyles, eq(highlightStyles.id, verseHighlights.styleId))
		.where(
			and(
				eq(verseHighlights.userId, userId),
				eq(verseHighlights.bookId, book),
				eq(verseHighlights.chapter, chapter)
			)
		);
}

/** A no-op if `styleId` does not name one of this user's own styles. */
export async function setVerseHighlight(
	db: Database,
	userId: string,
	reference: { book: number; chapter: number; verse: number },
	styleId: string
): Promise<void> {
	const [style] = await db
		.select({ id: highlightStyles.id })
		.from(highlightStyles)
		.where(and(eq(highlightStyles.id, styleId), eq(highlightStyles.userId, userId)))
		.limit(1);
	if (!style) return;

	await db
		.insert(verseHighlights)
		.values({
			userId,
			styleId,
			bookId: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		})
		.onConflictDoUpdate({
			target: [
				verseHighlights.userId,
				verseHighlights.bookId,
				verseHighlights.chapter,
				verseHighlights.verse
			],
			set: { styleId, updatedAt: new Date() }
		});
}

export async function removeVerseHighlight(
	db: Database,
	userId: string,
	reference: { book: number; chapter: number; verse: number }
): Promise<void> {
	await db
		.delete(verseHighlights)
		.where(
			and(
				eq(verseHighlights.userId, userId),
				eq(verseHighlights.bookId, reference.book),
				eq(verseHighlights.chapter, reference.chapter),
				eq(verseHighlights.verse, reference.verse)
			)
		);
}

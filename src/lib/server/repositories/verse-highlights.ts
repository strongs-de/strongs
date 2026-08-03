/**
 * Verse highlights: which verse carries which colour from a reader's palette.
 *
 * A verse holds at most one highlight; picking a different colour replaces it rather than stacking,
 * matching a physical highlighter.
 */

import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { highlightStyles, verseHighlights } from '../db/schema.ts';

export type ChapterHighlight = {
	verse: number;
	styleId: string;
	color: string;
	name: string | null;
};

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

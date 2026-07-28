/**
 * Chapter-scoped reference works shown beside Bible translations in the reader.
 */

import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { commentaryEntries, crossReferences as crossReferenceRows } from '../db/schema.ts';

export type CommentaryCell = {
	id: number;
	resourceId: string;
	verseStart: number | null;
	verseEnd: number | null;
	title: string | null;
	bodyHtml: string;
};

export type CrossReferenceCell = {
	id: number;
	resourceId: string;
	fromVerse: number;
	toBook: number;
	toChapter: number;
	toVerse: number;
	toVerseEnd: number;
	votes: number;
};

export async function loadReferenceResources(
	db: Database,
	options: { resourceIds: string[]; book: number; chapter: number }
): Promise<{
	commentaries: CommentaryCell[];
	crossReferences: CrossReferenceCell[];
	verseNumbers: number[];
}> {
	const { resourceIds, book, chapter } = options;
	if (resourceIds.length === 0) {
		return { commentaries: [], crossReferences: [], verseNumbers: [] };
	}

	const [commentaries, crossReferences] = await Promise.all([
		db
			.select({
				id: commentaryEntries.id,
				resourceId: commentaryEntries.resourceId,
				verseStart: commentaryEntries.verseStart,
				verseEnd: commentaryEntries.verseEnd,
				title: commentaryEntries.title,
				bodyHtml: commentaryEntries.bodyHtml
			})
			.from(commentaryEntries)
			.where(
				and(
					inArray(commentaryEntries.resourceId, resourceIds),
					eq(commentaryEntries.bookId, book),
					eq(commentaryEntries.chapter, chapter)
				)
			)
			.orderBy(asc(commentaryEntries.verseStart), asc(commentaryEntries.id)),
		db
			.select({
				id: crossReferenceRows.id,
				resourceId: crossReferenceRows.resourceId,
				fromVerse: crossReferenceRows.fromVerse,
				toBook: crossReferenceRows.toBook,
				toChapter: crossReferenceRows.toChapter,
				toVerse: crossReferenceRows.toVerse,
				toVerseEnd: crossReferenceRows.toVerseEnd,
				votes: crossReferenceRows.votes
			})
			.from(crossReferenceRows)
			.where(
				and(
					inArray(crossReferenceRows.resourceId, resourceIds),
					eq(crossReferenceRows.fromBook, book),
					eq(crossReferenceRows.fromChapter, chapter)
				)
			)
			.orderBy(
				asc(crossReferenceRows.fromVerse),
				asc(crossReferenceRows.toBook),
				asc(crossReferenceRows.toVerse)
			)
	]);

	const verseNumbers = new Set<number>();
	for (const entry of commentaries) verseNumbers.add(entry.verseStart ?? 1);
	for (const entry of crossReferences) verseNumbers.add(entry.fromVerse);

	return { commentaries, crossReferences, verseNumbers: [...verseNumbers].sort((a, b) => a - b) };
}

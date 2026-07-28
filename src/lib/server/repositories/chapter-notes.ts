import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { sanitizeNoteHtml } from '../../notes/sanitize.ts';
import type { Database } from '../db/client.ts';
import { chapterNotes, verseListItems, verseLists } from '../db/schema.ts';

export type UserNoteOverview = {
	id: string;
	kind: 'chapter' | 'verse';
	book: number;
	chapter: number;
	verse: number | null;
	html: string;
	updatedAt: Date;
	listId: string | null;
	listTitle: string | null;
};

export async function loadChapterNote(
	db: Database,
	userId: string,
	book: number,
	chapter: number
): Promise<string | null> {
	const [note] = await db
		.select({ html: chapterNotes.noteHtml })
		.from(chapterNotes)
		.where(
			and(
				eq(chapterNotes.userId, userId),
				eq(chapterNotes.bookId, book),
				eq(chapterNotes.chapter, chapter)
			)
		)
		.limit(1);

	return note?.html ?? null;
}

export async function saveChapterNote(
	db: Database,
	userId: string,
	book: number,
	chapter: number,
	html: string
): Promise<void> {
	const clean = sanitizeNoteHtml(html);

	await db
		.insert(chapterNotes)
		.values({ userId, bookId: book, chapter, noteHtml: clean || null })
		.onConflictDoUpdate({
			target: [chapterNotes.userId, chapterNotes.bookId, chapterNotes.chapter],
			set: { noteHtml: clean || null, updatedAt: new Date() }
		});
}

/** Every chapter and verse-list note owned by a user, newest first. */
export async function listUserNotes(db: Database, userId: string): Promise<UserNoteOverview[]> {
	const [chapters, verses] = await Promise.all([
		db
			.select({
				id: chapterNotes.id,
				book: chapterNotes.bookId,
				chapter: chapterNotes.chapter,
				html: chapterNotes.noteHtml,
				updatedAt: chapterNotes.updatedAt
			})
			.from(chapterNotes)
			.where(and(eq(chapterNotes.userId, userId), isNotNull(chapterNotes.noteHtml)))
			.orderBy(desc(chapterNotes.updatedAt)),
		db
			.select({
				id: verseListItems.id,
				book: verseListItems.bookId,
				chapter: verseListItems.chapter,
				verse: verseListItems.verse,
				html: verseListItems.noteHtml,
				updatedAt: verseListItems.updatedAt,
				listId: verseLists.id,
				listTitle: verseLists.title
			})
			.from(verseListItems)
			.innerJoin(verseLists, eq(verseLists.id, verseListItems.listId))
			.where(and(eq(verseLists.userId, userId), isNotNull(verseListItems.noteHtml)))
			.orderBy(desc(verseListItems.updatedAt))
	]);

	return [
		...chapters.flatMap((note) =>
			note.html
				? [
						{
							id: note.id,
							kind: 'chapter' as const,
							book: note.book,
							chapter: note.chapter,
							verse: null,
							html: note.html,
							updatedAt: note.updatedAt,
							listId: null,
							listTitle: null
						}
					]
				: []
		),
		...verses.flatMap((note) =>
			note.html
				? [
						{
							...note,
							kind: 'verse' as const,
							html: note.html
						}
					]
				: []
		)
	].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

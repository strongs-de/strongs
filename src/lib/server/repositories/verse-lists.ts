/**
 * Verse lists and their notes.
 *
 * A list is an ordered set of verses, each of which may carry a note. Notes are sanitised HTML from a
 * small editor rather than the CKEditor build the old site shipped, and a list can be shared by
 * turning on an unguessable slug.
 */

import { randomBytes } from 'node:crypto';
import { and, asc, eq, max, sql } from 'drizzle-orm';
import { sanitizeNoteHtml } from '../../notes/sanitize.ts';
import type { VerseSegment } from '../../bible/segments.ts';
import type { Database } from '../db/client.ts';
import { verseListItems, verseLists, verses, type VerseList } from '../db/schema.ts';

export type VerseListSummary = {
	id: string;
	title: string;
	isPublic: boolean;
	slug: string | null;
	itemCount: number;
	updatedAt: Date;
};

export type VerseListItemWithText = {
	id: string;
	book: number;
	chapter: number;
	verse: number;
	position: number;
	noteHtml: string | null;
	/** The verse text in the reader's first translation, so a list reads on its own. */
	segments: VerseSegment[] | null;
};

export async function listVerseLists(db: Database, userId: string): Promise<VerseListSummary[]> {
	const rows = await db.execute<{
		id: string;
		title: string;
		is_public: boolean;
		slug: string | null;
		item_count: number;
		updated_at: string;
	}>(sql`
		select l.id, l.title, l.is_public, l.slug, l.updated_at, count(i.id)::int as item_count
		from verse_lists l
		left join verse_list_items i on i.list_id = l.id
		where l.user_id = ${userId}
		group by l.id
		order by l.updated_at desc
	`);

	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		isPublic: row.is_public,
		slug: row.slug,
		itemCount: Number(row.item_count),
		updatedAt: new Date(row.updated_at)
	}));
}

export async function createVerseList(
	db: Database,
	userId: string,
	title: string
): Promise<VerseList> {
	const [list] = await db
		.insert(verseLists)
		.values({ userId, title: title.trim() || 'Neue Versliste' })
		.returning();
	return list!;
}

export async function findVerseList(
	db: Database,
	options: { id?: string; slug?: string; userId?: string }
): Promise<VerseList | undefined> {
	const conditions = [];
	if (options.id) conditions.push(eq(verseLists.id, options.id));
	if (options.slug) conditions.push(eq(verseLists.slug, options.slug));
	if (options.userId) conditions.push(eq(verseLists.userId, options.userId));
	if (conditions.length === 0) return undefined;

	const [row] = await db
		.select()
		.from(verseLists)
		.where(and(...conditions))
		.limit(1);
	return row;
}

/** A list's verses with their text, for the list page and the public share view. */
export async function loadVerseListItems(
	db: Database,
	listId: string,
	resourceId: string | null
): Promise<VerseListItemWithText[]> {
	const rows = await db
		.select({
			id: verseListItems.id,
			book: verseListItems.bookId,
			chapter: verseListItems.chapter,
			verse: verseListItems.verse,
			position: verseListItems.position,
			noteHtml: verseListItems.noteHtml,
			segments: verses.segments
		})
		.from(verseListItems)
		.leftJoin(
			verses,
			and(
				eq(verses.bookId, verseListItems.bookId),
				eq(verses.chapter, verseListItems.chapter),
				eq(verses.verse, verseListItems.verse),
				resourceId ? eq(verses.resourceId, resourceId) : sql`false`
			)
		)
		.where(eq(verseListItems.listId, listId))
		.orderBy(asc(verseListItems.position), asc(verseListItems.bookId));

	return rows.map((row) => ({ ...row, segments: row.segments ?? null }));
}

export async function addVerseToList(
	db: Database,
	listId: string,
	reference: { book: number; chapter: number; verse: number }
): Promise<void> {
	const [row] = await db
		.select({ highest: max(verseListItems.position) })
		.from(verseListItems)
		.where(eq(verseListItems.listId, listId));

	await db
		.insert(verseListItems)
		.values({
			listId,
			bookId: reference.book,
			chapter: reference.chapter,
			verse: reference.verse,
			position: (row?.highest ?? -1) + 1
		})
		// Adding a verse twice is a no-op rather than an error: the reader offers the action per verse
		// and a double click should not fail.
		.onConflictDoNothing();

	await touch(db, listId);
}

export async function removeVerseFromList(
	db: Database,
	listId: string,
	reference: { book: number; chapter: number; verse: number }
): Promise<void> {
	await db
		.delete(verseListItems)
		.where(
			and(
				eq(verseListItems.listId, listId),
				eq(verseListItems.bookId, reference.book),
				eq(verseListItems.chapter, reference.chapter),
				eq(verseListItems.verse, reference.verse)
			)
		);
	await touch(db, listId);
}

export async function saveNote(
	db: Database,
	listId: string,
	itemId: string,
	html: string
): Promise<void> {
	const clean = sanitizeNoteHtml(html);
	await db
		.update(verseListItems)
		.set({ noteHtml: clean || null, updatedAt: new Date() })
		.where(and(eq(verseListItems.id, itemId), eq(verseListItems.listId, listId)));
	await touch(db, listId);
}

export async function renameVerseList(db: Database, listId: string, title: string): Promise<void> {
	await db
		.update(verseLists)
		.set({ title: title.trim().slice(0, 300) || 'Neue Versliste', updatedAt: new Date() })
		.where(eq(verseLists.id, listId));
}

export async function deleteVerseList(db: Database, listId: string): Promise<void> {
	await db.delete(verseLists).where(eq(verseLists.id, listId));
}

/**
 * Turns sharing on or off.
 *
 * Sharing mints a fresh slug every time it is enabled, so a link that was once shared stops working
 * when sharing is turned off and on again.
 */
export async function setVerseListSharing(
	db: Database,
	listId: string,
	isPublic: boolean
): Promise<string | null> {
	const slug = isPublic ? randomBytes(12).toString('base64url') : null;
	await db
		.update(verseLists)
		.set({ isPublic, slug, updatedAt: new Date() })
		.where(eq(verseLists.id, listId));
	return slug;
}

/** Which verses of a chapter are already in a list, so the reader can mark them. */
export async function markedVerses(
	db: Database,
	listId: string,
	book: number,
	chapter: number
): Promise<Set<number>> {
	const rows = await db
		.select({ verse: verseListItems.verse })
		.from(verseListItems)
		.where(
			and(
				eq(verseListItems.listId, listId),
				eq(verseListItems.bookId, book),
				eq(verseListItems.chapter, chapter)
			)
		);

	return new Set(rows.map((row) => row.verse));
}

async function touch(db: Database, listId: string): Promise<void> {
	await db.update(verseLists).set({ updatedAt: new Date() }).where(eq(verseLists.id, listId));
}

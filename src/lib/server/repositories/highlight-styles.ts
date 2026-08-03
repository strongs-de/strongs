/**
 * A reader's personal highlighting palette.
 *
 * Ten distinguishable colours are seeded the first time a reader's palette is read, so there is
 * always something to pick from; each can be renamed, and more can be added, up to `MAX_STYLES`.
 */

import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { highlightStyles, type HighlightStyle } from '../db/schema.ts';

export const MAX_STYLES = 30;

/**
 * Ten highlighter-pen colours, chosen to stay distinguishable from each other and to read well as a
 * background behind dark text.
 */
const DEFAULT_COLORS = [
	'#fde68a', // yellow
	'#a7f3d0', // green
	'#bfdbfe', // blue
	'#fbcfe8', // pink
	'#fed7aa', // orange
	'#e9d5ff', // purple
	'#fecaca', // red
	'#99f6e4', // teal
	'#e5e7eb', // gray
	'#c7d2fe' // indigo
];

async function seedDefaultStyles(db: Database, userId: string): Promise<HighlightStyle[]> {
	return db
		.insert(highlightStyles)
		.values(DEFAULT_COLORS.map((color, index) => ({ userId, color, sortOrder: index })))
		.returning();
}

/** A reader's palette, in display order — seeded with the defaults on first read. */
export async function listHighlightStyles(db: Database, userId: string): Promise<HighlightStyle[]> {
	const existing = await db
		.select()
		.from(highlightStyles)
		.where(eq(highlightStyles.userId, userId))
		.orderBy(asc(highlightStyles.sortOrder));

	if (existing.length > 0) return existing;
	return seedDefaultStyles(db, userId);
}

export async function countHighlightStyles(db: Database, userId: string): Promise<number> {
	const rows = await db
		.select({ id: highlightStyles.id })
		.from(highlightStyles)
		.where(eq(highlightStyles.userId, userId));
	return rows.length;
}

export async function addHighlightStyle(
	db: Database,
	userId: string,
	color: string,
	name: string
): Promise<HighlightStyle> {
	const count = await countHighlightStyles(db, userId);
	const [style] = await db
		.insert(highlightStyles)
		.values({ userId, color, name: name || null, sortOrder: count })
		.returning();
	return style!;
}

/** A no-op if the style does not belong to this user. */
export async function renameHighlightStyle(
	db: Database,
	userId: string,
	id: string,
	name: string
): Promise<void> {
	await db
		.update(highlightStyles)
		.set({ name: name || null, updatedAt: new Date() })
		.where(and(eq(highlightStyles.id, id), eq(highlightStyles.userId, userId)));
}

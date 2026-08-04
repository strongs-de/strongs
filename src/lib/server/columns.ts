/**
 * Which translations the reader shows, and in which order.
 *
 * Stored in a cookie so server rendering already knows the choice — the previous version stored the
 * same thing as five underscore-separated indices into a hardcoded array (`bible_translation_order`),
 * which broke as soon as that array changed. Resource ids are stable, so this cookie survives new
 * translations being added.
 */

import type { Cookies } from '@sveltejs/kit';
import type { ReadableResource } from './repositories/resources.ts';

export const COLUMNS_COOKIE = 'columns';

const MAX_COLUMNS = 5;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Reads the column selection, dropping ids that no longer exist and filling up from the default order
 * so the reader always has something to show.
 */
export function readColumns(cookies: Cookies, available: ReadableResource[]): string[] {
	return resolveColumns(cookies, available);
}

/**
 * Uses this device's cookie when present, otherwise the account's preference — which only seeds a
 * device that has not chosen its own columns yet — and finally the default order.
 */
export function resolveColumns(
	cookies: Cookies,
	available: ReadableResource[],
	accountColumns: readonly string[] = []
): string[] {
	const known = new Set(available.map((resource) => resource.id));

	const storedRaw = cookies.get(COLUMNS_COOKIE);
	if (storedRaw !== undefined) {
		const stored = storedRaw
			.split(',')
			.map((id) => id.trim())
			.filter((id) => known.has(id));
		const columns = [...new Set(stored)].slice(0, MAX_COLUMNS);
		if (columns.length > 0) return columns;
	}

	const preferred = [...new Set(accountColumns)]
		.filter((id) => known.has(id))
		.slice(0, MAX_COLUMNS);
	if (preferred.length > 0) return preferred;

	return defaultColumns(available);
}

/** The first few translations in display order, which is what a first-time visitor sees. */
export function defaultColumns(available: ReadableResource[]): string[] {
	const bibles = available.filter((resource) => resource.kind === 'bible');
	return (bibles.length > 0 ? bibles : available).slice(0, 4).map((resource) => resource.id);
}

export function writeColumns(cookies: Cookies, columns: string[]): void {
	cookies.set(COLUMNS_COOKIE, columns.slice(0, MAX_COLUMNS).join(','), {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

/**
 * Applies a change to one column.
 *
 * Choosing a translation that is already in another column swaps the two, which is what a reader
 * expects and what stops the same text appearing twice side by side.
 */
export function setColumn(columns: string[], index: number, resourceId: string): string[] {
	const next = [...columns];
	const existing = next.indexOf(resourceId);

	if (existing !== -1 && existing !== index) {
		const displaced = next[index];
		next[existing] = displaced ?? resourceId;
	}

	next[index] = resourceId;
	return next.filter((id, position) => id !== undefined && next.indexOf(id) === position);
}

/**
 * Appends a column.
 *
 * A specific translation when the reader picked one from the menu, otherwise the first one not on
 * screen yet — which is what a plain submit without scripting sends.
 */
export function addColumn(
	columns: string[],
	available: ReadableResource[],
	resourceId?: string
): string[] {
	if (columns.length >= MAX_COLUMNS) return columns;

	const wanted =
		resourceId !== undefined
			? available.find((resource) => resource.id === resourceId && !columns.includes(resource.id))
			: available.find((resource) => !columns.includes(resource.id));

	return wanted ? [...columns, wanted.id] : columns;
}

export function removeColumn(columns: string[], index: number): string[] {
	if (columns.length <= 1) return columns;
	return columns.filter((_id, position) => position !== index);
}

/** Moves one visible column to another position without changing the selected resources. */
export function moveColumn(columns: string[], from: number, to: number): string[] {
	if (
		!Number.isInteger(from) ||
		!Number.isInteger(to) ||
		from < 0 ||
		to < 0 ||
		from >= columns.length ||
		to >= columns.length ||
		from === to
	) {
		return columns;
	}

	const next = [...columns];
	const [moved] = next.splice(from, 1);
	if (moved === undefined) return columns;
	next.splice(to, 0, moved);
	return next;
}

export { MAX_COLUMNS };

/**
 * Per-column widths for the reader grid, as fractions of the row that sum to 1.
 *
 * Kept in a cookie of `id:fraction` pairs, like `COLUMNS_COOKIE` keyed by resource id rather than
 * position, so a drag-resize survives a reorder — the width follows the translation, not the slot.
 */
export const COLUMN_WIDTHS_COOKIE = 'column-widths';

/** A column may not shrink below this share of the row, so a boundary drag can never squeeze a
 *  neighbour into unreadable ribbon. */
export const MIN_COLUMN_FRACTION = 0.12;

/**
 * Clamps every width to the minimum share and renormalizes so the row still sums to 1 — clamping
 * alone could leave the total under or over the space the row actually has. Falls back to an equal
 * split whenever the count does not match `count` (or a width is not a usable number), since a stale
 * set of fractions cannot mean anything for a different number of columns.
 */
export function normalizeColumnWidths(widths: number[], count: number): number[] {
	if (count <= 0) return [];
	if (widths.length !== count || widths.some((width) => !Number.isFinite(width) || width <= 0)) {
		return Array(count).fill(1 / count);
	}

	const clamped = widths.map((width) => Math.max(MIN_COLUMN_FRACTION, width));
	const total = clamped.reduce((sum, width) => sum + width, 0);
	return clamped.map((width) => width / total);
}

/**
 * This device's stored widths, in the same order as `columnIds`, or `null` when the reader has not
 * customized them (no cookie yet) or the stored id set no longer matches the current columns — an
 * add or a remove since the widths were last saved leaves them meaning nothing, so the caller falls
 * back to an even split rather than rendering a stale layout.
 */
export function resolveColumnWidths(cookies: Cookies, columnIds: string[]): number[] | null {
	if (columnIds.length === 0) return null;

	const stored = cookies.get(COLUMN_WIDTHS_COOKIE);
	if (!stored) return null;

	const byId = new Map<string, number>();
	for (const pair of stored.split(',')) {
		const [id, fraction] = pair.split(':');
		if (id && fraction !== undefined) byId.set(id, Number(fraction));
	}

	if (byId.size !== columnIds.length || !columnIds.every((id) => byId.has(id))) return null;
	return normalizeColumnWidths(
		columnIds.map((id) => byId.get(id) ?? 0),
		columnIds.length
	);
}

export function writeColumnWidths(cookies: Cookies, columnIds: string[], widths: number[]): void {
	const normalized = normalizeColumnWidths(widths, columnIds.length);
	const value = columnIds
		.map((id, index) => `${id}:${(normalized[index] ?? 0).toFixed(4)}`)
		.join(',');
	cookies.set(COLUMN_WIDTHS_COOKIE, value, {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

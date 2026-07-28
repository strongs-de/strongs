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

/** Uses account preferences when present, otherwise this device's cookie and finally defaults. */
export function resolveColumns(
	cookies: Cookies,
	available: ReadableResource[],
	accountColumns: readonly string[] = []
): string[] {
	const known = new Set(available.map((resource) => resource.id));
	const preferred = [...new Set(accountColumns)]
		.filter((id) => known.has(id))
		.slice(0, MAX_COLUMNS);
	if (preferred.length > 0) return preferred;

	const stored = (cookies.get(COLUMNS_COOKIE) ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter((id) => known.has(id));

	const columns = [...new Set(stored)].slice(0, MAX_COLUMNS);
	if (columns.length > 0) return columns;

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

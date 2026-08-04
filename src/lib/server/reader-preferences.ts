import type { Cookies } from '@sveltejs/kit';

/**
 * Device-local reader preferences: font size, layout and colour scheme.
 *
 * Each is a cookie so server rendering already knows the choice, plus an account column that is used
 * only to seed a device that has not set its own cookie yet — the first time a reader opens the site
 * and signs in. After that first seed, this device's cookie is authoritative even while signed in, so
 * a phone and a desktop can keep different settings instead of one overwriting the other on every
 * visit. Changes still get written back to the account (see the `?/...` actions in the reader), which
 * is what lets a *new* device pick them up.
 */

export const FONT_SCALE_COOKIE = 'reader-font-scale';
export const MIN_FONT_SCALE = 85;
export const MAX_FONT_SCALE = 140;
export const FONT_SCALE_STEP = 5;
export const READER_LAYOUT_COOKIE = 'reader-layout';
export const FLOW_SYNC_DISABLED_COOKIE = 'flow-sync-disabled';
export const THEME_COOKIE = 'theme';
export type ReaderLayout = 'aligned' | 'flow';
export type Theme = 'light' | 'dark';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function normalizeFontScale(value: number): number {
	if (!Number.isFinite(value)) return 100;
	return Math.min(
		MAX_FONT_SCALE,
		Math.max(MIN_FONT_SCALE, Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP)
	);
}

/** This device's cookie wins when set; otherwise the account's value seeds it; otherwise 100%. */
export function readFontScale(cookies: Cookies, accountScale?: number | null): number {
	const stored = cookies.get(FONT_SCALE_COOKIE);
	if (stored !== undefined) return normalizeFontScale(Number(stored));
	if (accountScale !== undefined && accountScale !== null) return normalizeFontScale(accountScale);
	return 100;
}

export function writeFontScale(cookies: Cookies, scale: number): void {
	cookies.set(FONT_SCALE_COOKIE, String(normalizeFontScale(scale)), {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

/** This device's cookie wins when set; otherwise the account's value seeds it; otherwise flowing text. */
export function readReaderLayout(
	cookies: Cookies,
	accountLayout?: ReaderLayout | null
): ReaderLayout {
	const stored = cookies.get(READER_LAYOUT_COOKIE);
	if (stored === 'flow' || stored === 'aligned') return stored;
	if (accountLayout === 'flow' || accountLayout === 'aligned') return accountLayout;
	return 'flow';
}

export function writeReaderLayout(cookies: Cookies, layout: ReaderLayout): void {
	cookies.set(READER_LAYOUT_COOKIE, layout, {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

/**
 * Which columns have opted out of the flow layout's cross-column scroll sync, keyed by resource id
 * rather than column position — a column keeps its own sync preference across a reorder or a swap to a
 * different translation slot, since the id, not the position, is what a reader means by "this column".
 */
export function readFlowSyncDisabled(cookies: Cookies): Set<string> {
	const stored = cookies.get(FLOW_SYNC_DISABLED_COOKIE);
	if (!stored) return new Set();
	return new Set(
		stored
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0)
	);
}

export function writeFlowSyncDisabled(cookies: Cookies, disabled: ReadonlySet<string>): void {
	cookies.set(FLOW_SYNC_DISABLED_COOKIE, [...disabled].join(','), {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

/**
 * This device's cookie wins when set; otherwise the account's value seeds it; otherwise `undefined`,
 * meaning "follow the operating system", which only the client can decide.
 */
export function readTheme(cookies: Cookies, accountTheme?: Theme | null): Theme | undefined {
	const stored = cookies.get(THEME_COOKIE);
	if (stored === 'light' || stored === 'dark') return stored;
	if (accountTheme === 'light' || accountTheme === 'dark') return accountTheme;
	return undefined;
}

export function writeTheme(cookies: Cookies, theme: Theme): void {
	cookies.set(THEME_COOKIE, theme, {
		path: '/',
		maxAge: COOKIE_MAX_AGE_SECONDS,
		httpOnly: false,
		sameSite: 'lax'
	});
}

import type { Cookies } from '@sveltejs/kit';

export const FONT_SCALE_COOKIE = 'reader-font-scale';
export const MIN_FONT_SCALE = 85;
export const MAX_FONT_SCALE = 140;
export const FONT_SCALE_STEP = 5;
export const READER_LAYOUT_COOKIE = 'reader-layout';
export type ReaderLayout = 'aligned' | 'flow';

export function normalizeFontScale(value: number): number {
	if (!Number.isFinite(value)) return 100;
	return Math.min(
		MAX_FONT_SCALE,
		Math.max(MIN_FONT_SCALE, Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP)
	);
}

export function readFontScale(cookies: Cookies, accountScale?: number): number {
	if (accountScale !== undefined) return normalizeFontScale(accountScale);
	return normalizeFontScale(Number(cookies.get(FONT_SCALE_COOKIE) ?? 100));
}

export function writeFontScale(cookies: Cookies, scale: number): void {
	cookies.set(FONT_SCALE_COOKIE, String(normalizeFontScale(scale)), {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: 'lax'
	});
}

export function readReaderLayout(cookies: Cookies): ReaderLayout {
	return cookies.get(READER_LAYOUT_COOKIE) === 'flow' ? 'flow' : 'aligned';
}

export function writeReaderLayout(cookies: Cookies, layout: ReaderLayout): void {
	cookies.set(READER_LAYOUT_COOKIE, layout, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: 'lax'
	});
}

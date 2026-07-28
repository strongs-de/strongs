/**
 * Minimal typed translation layer.
 *
 * The site ships German only, but nothing is hardcoded in components: every string goes through
 * `t()` with a key that must exist in the catalogue, so adding a locale means adding a file and a
 * locale entry — not hunting through markup.
 */

import { de } from './de.ts';

export type MessageKey = keyof typeof de;
export type Locale = 'de';

export const DEFAULT_LOCALE: Locale = 'de';

const catalogues: Record<Locale, Record<MessageKey, string>> = { de };

export type MessageParams = Record<string, string | number>;

/**
 * Looks up a message and substitutes `{name}` placeholders.
 *
 * Unknown placeholders are left untouched so a missing parameter is visible during development
 * rather than silently producing an empty gap.
 */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
	const template = catalogues[locale][key] ?? catalogues[DEFAULT_LOCALE][key] ?? key;
	if (!params) return template;

	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}

/** Convenience binding for the default locale, which is what components use today. */
export function t(key: MessageKey, params?: MessageParams): string {
	return translate(DEFAULT_LOCALE, key, params);
}

/** Locale tag for `<html lang>` and `Intl` formatting. */
export const LOCALE_TAGS: Record<Locale, string> = { de: 'de-DE' };

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
	return new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);
}

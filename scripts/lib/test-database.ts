/**
 * Where the end-to-end database lives.
 *
 * A module of its own, free of side effects, because both `scripts/prepare-e2e.ts` and
 * `playwright.config.ts` need this and importing a script with top-level code into a config file runs
 * that code.
 */

/** Derives the test database URL from the development one by suffixing the database name. */
export function testDatabaseUrl(base: string): string {
	const url = new URL(base);
	url.pathname = `/${url.pathname.replace(/^\//, '') || 'postgres'}_e2e`;
	return url.toString();
}

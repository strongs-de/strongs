import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { resolveSession } from '$lib/server/auth/session';
import { failInterruptedJobs } from '$lib/server/import/jobs';
import { pruneExpiredSessions } from '$lib/server/auth/session';
import { logger } from '$lib/server/logger';

/**
 * Runs once when the server starts.
 *
 * An import that was running when the process stopped can neither continue nor be trusted, so it is
 * marked as failed; leaving it at "running" would be indistinguishable from one that is working.
 */
export const init: ServerInit = async () => {
	const db = getDb();
	try {
		await failInterruptedJobs(db);
		await pruneExpiredSessions(db);
	} catch (error) {
		// A database that is not up yet must not stop the server from booting: the healthcheck will
		// report unhealthy until it is, which is the signal the deployment watches.
		logger.warn({ err: error }, 'startup housekeeping skipped');
	}
};

/**
 * Request pipeline: resolve the session, guard the admin area, log slow requests.
 *
 * The admin guard lives here rather than in each route so a new admin page cannot be added without
 * protection by forgetting a check.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const recovered = recoverMalformedUri(event.url);
	// A plain Response rather than `redirect()`: thrown this early, before any `await`, it turns into
	// an unhandled rejection instead of a redirect — `redirect()` further down (past the session
	// lookup's `await`) is unaffected.
	if (recovered) return new Response(null, { status: 301, headers: { location: recovered } });

	const session = await resolveSession(getDb(), event.cookies);
	event.locals.user = session?.user ?? null;
	event.locals.sessionId = session?.sessionId ?? null;

	if (event.url.pathname.startsWith('/admin')) {
		if (!event.locals.user) {
			redirect(303, `/login?redirectTo=${encodeURIComponent(event.url.pathname)}`);
		}
		if (event.locals.user.role !== 'admin') {
			// 404 rather than 403: the existence of the admin area is not worth confirming.
			return new Response('Not found', { status: 404 });
		}
	}

	const started = Date.now();
	const response = await resolve(event);
	const duration = Date.now() - started;

	if (duration > 500) {
		logger.warn({ path: event.url.pathname, duration, status: response.status }, 'slow request');
	}

	return response;
};

/**
 * Some old browsers and stale bookmarked links percent-encode non-ASCII characters as Latin-1 (e.g.
 * "ö" as `%F6`) instead of UTF-8 (`%C3%B6`). SvelteKit's router rejects that outright with a 400
 * before any route runs, so it has to be recovered here: reinterpret the escapes as Latin-1 — whose
 * codepoints (0–255) already agree with Unicode — and redirect to the correctly UTF-8-encoded URL.
 */
function recoverMalformedUri(url: URL): string | null {
	try {
		decodeURI(url.pathname);
		return null;
	} catch {
		const recovered = url.pathname.replace(/%[0-9A-Fa-f]{2}/g, (hex) =>
			String.fromCharCode(parseInt(hex.slice(1), 16))
		);
		return `${encodeURI(recovered)}${url.search}`;
	}
}

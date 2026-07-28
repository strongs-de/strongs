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

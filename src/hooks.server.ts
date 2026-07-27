import type { Handle } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

/**
 * Request pipeline.
 *
 * Resolves the session (filled in by the accounts phase) and logs slow requests, which is the cheapest
 * useful signal for spotting a query that has lost its index.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionId = null;

	const started = Date.now();
	const response = await resolve(event);
	const duration = Date.now() - started;

	if (duration > 500) {
		logger.warn({ path: event.url.pathname, duration, status: response.status }, 'slow request');
	}

	return response;
};

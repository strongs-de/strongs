import { redirect } from '@sveltejs/kit';
import { parseReference, referencePath } from '$lib/bible/reference';

const LOCATION_COOKIE = 'location';

/**
 * The public entry point doubles as the marketing page. Returning signed-in readers skip it and
 * resume where they last read; a new account starts at John 1.
 *
 * This response must never be shared by a CDN because its outcome depends on the session cookie.
 */
export function load({ cookies, locals, setHeaders }) {
	setHeaders({ 'cache-control': 'private, no-store' });

	if (locals.user) {
		const stored = cookies.get(LOCATION_COOKIE);
		const reference = stored ? parseReference(stored) : null;
		redirect(307, referencePath(reference ?? { book: 43, chapter: 1 }));
	}
}

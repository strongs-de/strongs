import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { destroySession } from '$lib/server/auth/session';

/** Signing out is a POST, so a crawler or a prefetch cannot do it. */
export function load() {
	redirect(303, '/account');
}

export const actions = {
	default: async ({ cookies, locals }) => {
		await destroySession(getDb(), cookies, locals.sessionId);
		redirect(303, '/');
	}
};

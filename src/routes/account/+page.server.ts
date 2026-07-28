import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import {
	checkPasswordStrength,
	MIN_PASSWORD_LENGTH,
	verifyPassword
} from '$lib/server/auth/password';
import { destroyAllSessions, createSession } from '$lib/server/auth/session';
import { findUserByEmail, updatePassword, updateProfile } from '$lib/server/repositories/users';
import { listVerseLists } from '$lib/server/repositories/verse-lists';

export async function load({ locals }) {
	if (!locals.user) redirect(303, '/login?redirectTo=%2Faccount');

	// Only the count: verse lists live at /lists now, and this page just points there.
	const lists = await listVerseLists(getDb(), locals.user.id);

	return {
		listCount: lists.length,
		minPasswordLength: MIN_PASSWORD_LENGTH
	};
}

export const actions = {
	profile: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		await updateProfile(getDb(), locals.user.id, String(form.get('displayName') ?? ''));
		return { saved: true };
	},

	password: async ({ request, locals, cookies }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const current = String(form.get('currentPassword') ?? '');
		const next = String(form.get('password') ?? '');
		const repeat = String(form.get('passwordRepeat') ?? '');

		const db = getDb();
		const user = await findUserByEmail(db, locals.user.email);
		if (!user || !(await verifyPassword(user.passwordHash, current))) {
			return fail(400, { passwordError: 'current' as const });
		}
		if (next !== repeat) return fail(400, { passwordError: 'mismatch' as const });
		if (checkPasswordStrength(next)) return fail(400, { passwordError: 'weak' as const });

		await updatePassword(db, user.id, next);
		// Other devices are signed out, then this one is signed back in.
		await destroyAllSessions(db, user.id);
		await createSession(db, cookies, user.id, request.headers.get('user-agent') ?? undefined);

		return { passwordSaved: true };
	}
};

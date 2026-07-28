import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { dummyHash, verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import {
	clearFailedLogins,
	isLoginThrottled,
	pruneLoginAttempts,
	recordFailedLogin
} from '$lib/server/auth/rate-limit';
import { findUserByEmail, recordLogin } from '$lib/server/repositories/users';
import { updateReaderColumns } from '$lib/server/repositories/users';
import { listBibles } from '$lib/server/repositories/resources';
import { readColumns } from '$lib/server/columns';

export async function load({ locals, url }) {
	if (locals.user) redirect(303, url.searchParams.get('redirectTo') ?? '/account');
	return { redirectTo: url.searchParams.get('redirectTo') ?? '/account' };
}

export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const redirectTo = String(form.get('redirectTo') ?? '/account');

		if (!email || !password) {
			return fail(400, { email, error: 'missing' as const });
		}

		const db = getDb();
		const address = getClientAddress();

		if (await isLoginThrottled(db, email, address)) {
			return fail(429, { email, error: 'throttled' as const });
		}

		const user = await findUserByEmail(db, email);

		// Verify even when there is no such account, so "unknown address" and "wrong password" take the
		// same time and account existence cannot be read off the response.
		const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);

		if (!user || !valid || user.disabledAt) {
			await recordFailedLogin(db, email, address);
			return fail(400, { email, error: 'invalid' as const });
		}

		await clearFailedLogins(db, email, address);
		await pruneLoginAttempts(db);
		if (user.readerColumns.length === 0) {
			await updateReaderColumns(db, user.id, readColumns(cookies, await listBibles(db)));
		}
		await createSession(db, cookies, user.id, request.headers.get('user-agent') ?? undefined);
		await recordLogin(db, user.id);

		// Only same-site paths, so a crafted link cannot bounce someone off the site after signing in.
		redirect(303, redirectTo.startsWith('/') ? redirectTo : '/account');
	}
};

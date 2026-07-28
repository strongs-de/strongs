import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { checkPasswordStrength, MIN_PASSWORD_LENGTH } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { createUser } from '$lib/server/repositories/users';
import { updateReaderColumns } from '$lib/server/repositories/users';
import { listBibles } from '$lib/server/repositories/resources';
import { readColumns } from '$lib/server/columns';

export async function load({ locals }) {
	if (locals.user) redirect(303, '/account');
	return { minPasswordLength: MIN_PASSWORD_LENGTH };
}

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const repeat = String(form.get('passwordRepeat') ?? '');
		const displayName = String(form.get('displayName') ?? '').trim();

		const values = { email, displayName };

		if (!email.includes('@')) return fail(400, { ...values, error: 'email' as const });
		if (password !== repeat) return fail(400, { ...values, error: 'mismatch' as const });
		if (checkPasswordStrength(password)) return fail(400, { ...values, error: 'weak' as const });

		const db = getDb();
		const result = await createUser(db, { email, password, displayName });

		if (!result.ok) return fail(400, { ...values, error: 'taken' as const });

		await updateReaderColumns(db, result.user.id, readColumns(cookies, await listBibles(db)));
		await createSession(
			db,
			cookies,
			result.user.id,
			request.headers.get('user-agent') ?? undefined
		);
		redirect(303, '/account');
	}
};

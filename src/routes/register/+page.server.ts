import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { config } from '$lib/server/config';
import { checkPasswordStrength, MIN_PASSWORD_LENGTH } from '$lib/server/auth/password';
import { countRecent, LIMITS, recordAttempt } from '$lib/server/auth/rate-limit';
import { mailer } from '$lib/server/mail';
import { logger } from '$lib/server/logger';
import { createEmailVerification, createUser } from '$lib/server/repositories/users';
import { updateReaderColumns } from '$lib/server/repositories/users';
import { listBibles } from '$lib/server/repositories/resources';
import { readColumns } from '$lib/server/columns';

export async function load({ locals }) {
	if (locals.user) redirect(303, '/account');
	return { minPasswordLength: MIN_PASSWORD_LENGTH };
}

export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const repeat = String(form.get('passwordRepeat') ?? '');
		const displayName = String(form.get('displayName') ?? '').trim();
		// Honeypot: invisible and unreachable by keyboard for a person (see the field in
		// +page.svelte), but a script that blindly fills every field in the form trips it.
		const honeypot = String(form.get('company') ?? '').trim();

		const values = { email, displayName };

		if (honeypot) {
			// Silently pretend it worked: a bot that is refused just tries again, one that is told it
			// succeeded has no signal that it was caught. Nothing is created and no mail is sent.
			redirect(303, '/register/check-email');
		}

		if (!email.includes('@')) return fail(400, { ...values, error: 'email' as const });
		if (password !== repeat) return fail(400, { ...values, error: 'mismatch' as const });
		if (checkPasswordStrength(password)) return fail(400, { ...values, error: 'weak' as const });

		const db = getDb();
		const address = getClientAddress();

		// Per-address only, unlike login: there is no account yet to also key on.
		if ((await countRecent(db, `register:${address}`)) >= LIMITS.MAX_REGISTRATIONS_PER_ADDRESS) {
			return fail(429, { ...values, error: 'throttled' as const });
		}
		await recordAttempt(db, `register:${address}`);

		const result = await createUser(db, { email, password, displayName });

		if (!result.ok) return fail(400, { ...values, error: 'taken' as const });

		await updateReaderColumns(db, result.user.id, readColumns(cookies, await listBibles(db)));

		const token = await createEmailVerification(db, result.user.id);
		const link = new URL(`/register/verify/${token}`, config().ORIGIN).toString();

		try {
			await mailer().send({
				to: result.user.email,
				subject: 'strongs.de: Bitte bestätige deine E-Mail-Adresse',
				text: [
					'Willkommen bei strongs.de!',
					'',
					`Bitte bestätige deine E-Mail-Adresse über diesen Link: ${link}`,
					'',
					'Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.',
					'Wenn du dieses Konto nicht angelegt hast, kannst du diese E-Mail ignorieren.'
				].join('\n')
			});
		} catch (error) {
			// The account still exists; a mail failure must not block registration, only be logged.
			logger.error({ err: error }, 'sending the verification mail failed');
		}

		// No session yet — that only happens once the link above is confirmed.
		redirect(303, '/register/check-email');
	}
};

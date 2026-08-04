import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { config } from '$lib/server/config';
import { dummyHash, verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import {
	clearFailedLogins,
	countRecent,
	isLoginThrottled,
	pruneLoginAttempts,
	recordFailedLogin
} from '$lib/server/auth/rate-limit';
import { mailer } from '$lib/server/mail';
import { logger } from '$lib/server/logger';
import {
	createEmailVerification,
	findUserByEmail,
	recordLogin
} from '$lib/server/repositories/users';
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

		if (!user.emailVerifiedAt) {
			// The password was correct, so this can say exactly what is wrong without helping anyone
			// probe for which addresses are registered — that question is already answered by getting
			// this far instead of "invalid".
			return fail(400, { email, error: 'unverified' as const });
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
	},

	/**
	 * Re-sends the account-activation mail, offered once login fails with `unverified`.
	 *
	 * Same shape as the password-reset request: the response never says whether the address exists
	 * or is already verified, and IP throttling stands in for a per-account limit since there is no
	 * failed-login history to key on before the account is even active.
	 */
	resend: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		if (!email.includes('@')) return fail(400, { error: 'email' as const });

		const db = getDb();
		const address = getClientAddress();

		if ((await countRecent(db, `ip:${address}`)) >= 10) {
			return fail(429, { error: 'throttled' as const });
		}
		await recordFailedLogin(db, email, address);

		const user = await findUserByEmail(db, email);

		if (user && !user.disabledAt && !user.emailVerifiedAt) {
			const token = await createEmailVerification(db, user.id);
			const link = new URL(`/register/verify/${token}`, config().ORIGIN).toString();

			try {
				await mailer().send({
					to: user.email,
					subject: 'strongs.de: Bitte bestätige deine E-Mail-Adresse',
					text: [
						'Du hast eine neue Aktivierungsmail für dein Konto auf strongs.de angefordert.',
						'',
						`Bitte bestätige deine E-Mail-Adresse über diesen Link: ${link}`,
						'',
						'Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.',
						'Wenn du das nicht warst, kannst du diese E-Mail ignorieren.'
					].join('\n')
				});
			} catch (error) {
				logger.error({ err: error }, 'sending the verification mail failed');
			}
		}

		return { resent: true };
	}
};

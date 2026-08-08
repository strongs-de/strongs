import { fail } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { getDb } from '$lib/server/db';
import { countRecent, recordFailedLogin } from '$lib/server/auth/rate-limit';
import { mailer } from '$lib/server/mail';
import { passwordResetMail } from '$lib/server/mail/templates';
import { createPasswordReset, findUserByEmail } from '$lib/server/repositories/users';
import { logger } from '$lib/server/logger';

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		if (!email.includes('@')) return fail(400, { error: 'email' as const });

		const db = getDb();
		const address = getClientAddress();

		// Same limit as login, so this cannot be used to enumerate addresses or to send mail in bulk.
		if ((await countRecent(db, `ip:${address}`)) >= 10) {
			return fail(429, { error: 'throttled' as const });
		}
		await recordFailedLogin(db, email, address);

		const user = await findUserByEmail(db, email);

		// The response never says whether the address is known.
		if (user && !user.disabledAt) {
			const token = await createPasswordReset(db, user.id);
			const link = new URL(`/password-reset/${token}`, config().ORIGIN).toString();

			try {
				await mailer().send({ to: user.email, ...passwordResetMail(link) });
			} catch (error) {
				// A mail failure must not reveal that the address exists, so it is logged and swallowed.
				logger.error({ err: error }, 'sending the password reset mail failed');
			}
		}

		return { sent: true };
	}
};

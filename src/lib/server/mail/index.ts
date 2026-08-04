/**
 * Transactional email.
 *
 * One small interface with two implementations: Brevo's HTTP API, and a logger used when no API key is
 * configured. The logger is not a stub to be replaced later — it is what makes development and CI work
 * without credentials, and it prints the reset link so a local password reset can be completed.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { config } from '../config.ts';
import { logger } from '../logger.ts';

export type Mail = {
	to: string;
	subject: string;
	text: string;
	html?: string;
};

export type Mailer = {
	send(mail: Mail): Promise<void>;
};

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Posts to Brevo's transactional endpoint. */
function brevoMailer(apiKey: string, from: { email: string; name: string }): Mailer {
	return {
		async send(mail) {
			const response = await fetch(BREVO_ENDPOINT, {
				method: 'POST',
				headers: {
					'api-key': apiKey,
					'content-type': 'application/json',
					accept: 'application/json'
				},
				body: JSON.stringify({
					sender: from,
					to: [{ email: mail.to }],
					subject: mail.subject,
					textContent: mail.text,
					...(mail.html ? { htmlContent: mail.html } : {})
				})
			});

			if (!response.ok) {
				// The body carries Brevo's reason, which is usually "sender not verified".
				const detail = await response.text().catch(() => '');
				throw new Error(`Brevo rejected the message (${response.status}): ${detail.slice(0, 300)}`);
			}
		}
	};
}

/** Writes the message to the log instead of sending it. */
function loggingMailer(): Mailer {
	return {
		async send(mail) {
			logger.info(
				{ to: mail.to, subject: mail.subject, body: mail.text },
				'mail not sent: BREVO_API_KEY is not configured'
			);

			// End-to-end tests run as a separate process from the app server and cannot read this
			// process's log stream, so — only when explicitly opted in — mirror the mail to a file they
			// can read instead. See the `MAIL_TEST_OUTBOX` doc comment in `config.ts`.
			const outbox = config().MAIL_TEST_OUTBOX;
			if (outbox) {
				await mkdir(dirname(outbox), { recursive: true });
				await appendFile(
					outbox,
					JSON.stringify({ to: mail.to, subject: mail.subject, text: mail.text }) + '\n'
				);
			}
		}
	};
}

let cached: Mailer | undefined;

export function mailer(): Mailer {
	if (cached) return cached;

	const settings = config();
	cached = settings.BREVO_API_KEY
		? brevoMailer(settings.BREVO_API_KEY, {
				email: settings.MAIL_FROM,
				name: settings.MAIL_FROM_NAME
			})
		: loggingMailer();

	return cached;
}

/** Replaces the mailer, for tests. */
export function setMailer(replacement: Mailer | undefined): void {
	cached = replacement;
}

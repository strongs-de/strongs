import { z } from 'zod';

const emptyStringAsUndefined = (value: unknown) => (value === '' ? undefined : value);

/**
 * Runtime configuration, validated once at startup.
 *
 * Everything is read from the process environment so that the same code works under `vite dev`,
 * under `node build/index.js` in the container, and in the CLI scripts (which have no access to
 * SvelteKit's `$env` modules).
 */
const schema = z.object({
	DATABASE_URL: z.string().min(1),

	/** Public origin, e.g. `https://akribos.de`. Required by adapter-node for CSRF checks. */
	ORIGIN: z.string().url().default('http://localhost:5173'),

	/** Secret used to sign cookies. Must be stable across restarts and unique per deployment. */
	SESSION_SECRET: z.string().min(32),

	/** Where uploaded resource source files are archived so an import can be repeated. */
	UPLOAD_DIR: z.string().default('./var/uploads'),

	/** Transactional email via Brevo. When unset, the app logs mails instead of sending them. */
	BREVO_API_KEY: z.string().optional(),
	MAIL_FROM: z.string().email().default('noreply@akribos.de'),
	MAIL_FROM_NAME: z.string().default('Akribos'),

	LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

	/**
	 * Email address that is granted the admin role on first registration. Lets you bootstrap the
	 * very first admin account without touching the database by hand.
	 */
	BOOTSTRAP_ADMIN_EMAIL: z.preprocess(emptyStringAsUndefined, z.string().email().optional()),

	/**
	 * Encrypts the S3 secret access key stored in the `settings` table. Optional: without it, manual
	 * backup/restore still work, but the scheduled S3 backup cannot be configured.
	 * Generate with: openssl rand -base64 48
	 */
	BACKUP_ENCRYPTION_KEY: z.preprocess(emptyStringAsUndefined, z.string().min(32).optional()),

	/** Where database dumps are staged before they are streamed to the browser or to S3. */
	BACKUP_TMP_DIR: z.string().default('./var/backups'),

	/**
	 * When set, the logging mailer (see `mail/index.ts`) also appends every mail it "sends" to this
	 * file as JSON lines. Only end-to-end tests set this — it lets a separate test process recover a
	 * verification or password-reset link without a real mailbox. Combined with `BREVO_API_KEY` being
	 * unset (the logging mailer only exists for that case), setting this alone in a real deployment
	 * has no effect.
	 */
	MAIL_TEST_OUTBOX: z.preprocess(emptyStringAsUndefined, z.string().optional())
});

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

export function config(): Config {
	if (cached) return cached;

	const parsed = schema.safeParse(process.env);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
			.join('\n');
		throw new Error(`Invalid environment configuration:\n${issues}`);
	}

	cached = parsed.data;
	return cached;
}

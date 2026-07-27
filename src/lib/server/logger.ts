import { pino } from 'pino';

/**
 * Structured logger. In development it prints human-readable lines; in production it emits JSON on
 * stdout, which is what Coolify collects.
 */
export const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	transport:
		process.env.NODE_ENV === 'production'
			? undefined
			: { target: 'pino/file', options: { destination: 1 } },
	redact: ['req.headers.cookie', 'req.headers.authorization', 'password', '*.password']
});

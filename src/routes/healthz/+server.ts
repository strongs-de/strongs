import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';

/** Never cache the health probe, and never prerender it. */
export const prerender = false;

/**
 * Liveness and readiness probe used by the container healthcheck and by Coolify.
 *
 * Touches the database so a healthy response means "able to serve requests", not merely "process is
 * running".
 */
export async function GET() {
	try {
		await getDb().execute(sql`select 1`);
		return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		logger.error({ err: error }, 'health check failed');
		return Response.json(
			{ status: 'error', database: 'unreachable' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
}

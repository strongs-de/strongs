import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { isRestoreInProgress } from '$lib/server/backup/jobs';

/** Never cache the health probe, and never prerender it. */
export const prerender = false;

/**
 * Liveness and readiness probe used by the container healthcheck and by Coolify.
 *
 * Touches the database so a healthy response means "able to serve requests", not merely "process is
 * running" — except during a restore, where `pg_restore --clean` briefly makes queries fail on
 * purpose. Reporting unhealthy in that narrow window would risk the container being restarted mid-
 * restore, so a restore in progress short-circuits straight to "ok" without touching the database.
 */
export async function GET() {
	if (isRestoreInProgress()) {
		return Response.json(
			{ status: 'ok', restore: 'running' },
			{ headers: { 'cache-control': 'no-store' } }
		);
	}

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

import { sql } from 'drizzle-orm';
import type { Database } from './client.ts';

/**
 * Rebuilds the Strong's statistics views.
 *
 * Called at the end of an import rather than on a schedule, because the underlying data only changes
 * when a resource is imported or deleted. `CONCURRENTLY` keeps the site readable while the rebuild
 * runs, which matters because a full refresh over ~750k word rows takes a few seconds.
 *
 * A concurrent refresh needs a unique index on the view (both have one) and cannot run inside a
 * transaction, so callers must not wrap this in one.
 */
export async function refreshStrongStatistics(db: Database): Promise<void> {
	await db.execute(sql`refresh materialized view concurrently strong_stats`);
	await db.execute(sql`refresh materialized view concurrently strong_glosses`);
}

/**
 * First population of the views after they were created empty, where `CONCURRENTLY` is not allowed
 * yet. Safe to call at any time; it simply blocks readers for the duration.
 */
export async function refreshStrongStatisticsBlocking(db: Database): Promise<void> {
	await db.execute(sql`refresh materialized view strong_stats`);
	await db.execute(sql`refresh materialized view strong_glosses`);
}

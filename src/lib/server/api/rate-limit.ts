/**
 * Public API rate limiting.
 *
 * One row per request, counted over a rolling window — the same PostgreSQL-only approach
 * `auth/rate-limit.ts` uses for login throttling, rather than adding Redis for a second limiter.
 * Insert-then-count (rather than count-then-insert) makes the check atomic per request: two
 * concurrent requests from the same subject cannot both slip through by counting before either has
 * recorded itself.
 */

import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { apiRequests } from '../db/schema.ts';

const WINDOW_MS = 60 * 1000;

/** Requests per minute for a request authenticated with an API key. */
export const KEYED_LIMIT = 120;
/** Requests per minute, by IP, for a request from an allowed origin without a key. */
export const TRUSTED_LIMIT = 300;

export type RateLimitResult = {
	allowed: boolean;
	limit: number;
	remaining: number;
	/** Seconds until the window this request counted against fully rolls off. */
	retryAfterSeconds: number;
};

export async function checkApiRateLimit(
	db: Database,
	subject: string,
	limit: number
): Promise<RateLimitResult> {
	const now = new Date();
	await db.insert(apiRequests).values({ subject, requestedAt: now });

	const since = new Date(now.getTime() - WINDOW_MS);
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(apiRequests)
		.where(and(eq(apiRequests.subject, subject), gte(apiRequests.requestedAt, since)));

	const count = Number(row?.count ?? 0);
	return {
		allowed: count <= limit,
		limit,
		remaining: Math.max(0, limit - count),
		retryAfterSeconds: Math.ceil(WINDOW_MS / 1000)
	};
}

/** Drops rows outside the window; called opportunistically from the gate, not on a schedule. */
export async function pruneApiRequests(db: Database): Promise<void> {
	await db.delete(apiRequests).where(lt(apiRequests.requestedAt, new Date(Date.now() - WINDOW_MS)));
}

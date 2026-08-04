/**
 * Login throttling.
 *
 * Failed attempts are recorded per email address and per client address; once either crosses its
 * limit within the window, further attempts are refused. Counting both matters: per-email alone lets
 * one host work through many accounts, and per-address alone lets a botnet work through one account.
 *
 * The table is small and self-pruning, and the check is two indexed counts, so this stays in
 * PostgreSQL rather than pulling in Redis for it.
 */

import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { loginAttempts } from '../db/schema.ts';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 8;
const MAX_PER_ADDRESS = 30;
/**
 * Registration sees legitimately higher volume per address than a login failure or a password
 * reset — several people signing up from behind the same office or campus NAT is normal, a script
 * creating dozens of accounts a minute is not. Higher than `MAX_PER_ADDRESS`, still well below what
 * scripted abuse needs to be a nuisance.
 */
const MAX_REGISTRATIONS_PER_ADDRESS = 50;

export async function recordFailedLogin(
	db: Database,
	email: string,
	address: string
): Promise<void> {
	await db
		.insert(loginAttempts)
		.values([{ subject: `email:${email.toLowerCase()}` }, { subject: `ip:${address}` }]);
}

/** True when the caller should be refused without checking the password at all. */
export async function isLoginThrottled(
	db: Database,
	email: string,
	address: string
): Promise<boolean> {
	// The timestamp is passed as an ISO string with an explicit cast: in a raw `sql` template there is
	// no column to infer a type from, and the driver cannot serialise a bare Date.
	const since = new Date(Date.now() - WINDOW_MS).toISOString();

	const [row] = await db.execute<{ email_count: number; address_count: number }>(sql`
		select
			count(*) filter (where subject = ${`email:${email.toLowerCase()}`})::int as email_count,
			count(*) filter (where subject = ${`ip:${address}`})::int as address_count
		from ${loginAttempts}
		where attempted_at >= ${since}::timestamptz
	`);

	return (
		Number(row?.email_count ?? 0) >= MAX_PER_EMAIL ||
		Number(row?.address_count ?? 0) >= MAX_PER_ADDRESS
	);
}

/** Clears an address's and an account's failures after a successful login. */
export async function clearFailedLogins(
	db: Database,
	email: string,
	address: string
): Promise<void> {
	await db.delete(loginAttempts).where(eq(loginAttempts.subject, `email:${email.toLowerCase()}`));
	await db.delete(loginAttempts).where(eq(loginAttempts.subject, `ip:${address}`));
}

/** Drops rows outside the window; called from the login path, so no scheduler is needed. */
export async function pruneLoginAttempts(db: Database): Promise<void> {
	await db
		.delete(loginAttempts)
		.where(lt(loginAttempts.attemptedAt, new Date(Date.now() - WINDOW_MS)));
}

/** Exported for tests, which need to know when the limit bites. */
export const LIMITS = {
	WINDOW_MS,
	MAX_PER_EMAIL,
	MAX_PER_ADDRESS,
	MAX_REGISTRATIONS_PER_ADDRESS
};

/** Records a single attempt under an arbitrary subject, e.g. `register:<ip>`. */
export async function recordAttempt(db: Database, subject: string): Promise<void> {
	await db.insert(loginAttempts).values({ subject });
}

/** Used by the password-reset form, which is rate limited on the same table. */
export async function countRecent(
	db: Database,
	subject: string,
	windowMs = WINDOW_MS
): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(loginAttempts)
		.where(
			and(
				eq(loginAttempts.subject, subject),
				gte(loginAttempts.attemptedAt, new Date(Date.now() - windowMs))
			)
		);

	return Number(row?.count ?? 0);
}

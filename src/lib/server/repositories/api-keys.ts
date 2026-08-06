/**
 * Self-service API keys.
 *
 * A key is a random token whose SHA-256 is stored, the same approach `auth/session.ts` uses for
 * session cookies — a leaked database dump cannot be replayed as a working key. The raw token is
 * returned only from `createApiKey`, once, and is not recoverable afterwards.
 */

import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { apiKeys, type ApiKey } from '../db/schema.ts';

export type ApiKeyScope = 'public' | 'personal';

/** Keys a user can hold at once; there is no legitimate use for more from the account page. */
export const MAX_API_KEYS = 20;

const KEY_PREFIX = 'sk_akribos_';
/** Characters of the secret part shown in the list, so a key stays identifiable once created. */
const PREFIX_VISIBLE_CHARS = 8;

function hashKey(key: string): string {
	return createHash('sha256').update(key).digest('hex');
}

export async function countApiKeys(db: Database, userId: string): Promise<number> {
	const rows = await db
		.select({ id: apiKeys.id })
		.from(apiKeys)
		.where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
	return rows.length;
}

/** Creates a key and returns the raw token alongside its row — the only time the token is available. */
export async function createApiKey(
	db: Database,
	userId: string,
	name: string,
	scope: ApiKeyScope
): Promise<{ apiKey: ApiKey; key: string }> {
	const key = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

	const [apiKey] = await db
		.insert(apiKeys)
		.values({
			id: hashKey(key),
			userId,
			name,
			scope,
			prefix: key.slice(0, KEY_PREFIX.length + PREFIX_VISIBLE_CHARS)
		})
		.returning();

	return { apiKey: apiKey!, key };
}

export async function listApiKeys(db: Database, userId: string): Promise<ApiKey[]> {
	return db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.userId, userId))
		.orderBy(desc(apiKeys.createdAt));
}

/** A no-op if the key does not belong to this user or is already revoked. */
export async function revokeApiKey(db: Database, userId: string, id: string): Promise<void> {
	await db
		.update(apiKeys)
		.set({ revokedAt: new Date() })
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
}

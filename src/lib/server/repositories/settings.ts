/** Generic key/value access to the `settings` table (`db/schema.ts`). */

import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database } from '../db/client.ts';
import { settings } from '../db/schema.ts';
import { logger } from '../logger.ts';

/**
 * Returns the validated value stored under `key`, or `undefined` if the row is missing or its JSON
 * no longer matches `schema` — a malformed row must not take the page down, only log a warning.
 */
export async function getSetting<T>(
	db: Database,
	key: string,
	schema: z.ZodType<T>
): Promise<T | undefined> {
	const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
	if (!row) return undefined;

	const parsed = schema.safeParse(row.value);
	if (!parsed.success) {
		logger.warn({ key, issues: parsed.error.issues }, 'stored setting failed validation');
		return undefined;
	}
	return parsed.data;
}

export async function putSetting(db: Database, key: string, value: unknown): Promise<void> {
	await db
		.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

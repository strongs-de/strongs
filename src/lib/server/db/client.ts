import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export type Database = ReturnType<typeof createDb>['db'];

/**
 * Creates a database handle. Kept separate from `./index.ts` so CLI scripts can open their own
 * connection with their own pool size without pulling in the app-wide singleton.
 */
export function createDb(url: string, options: { max?: number } = {}) {
	const client = postgres(url, {
		max: options.max ?? 10,
		// Verse text is full of multi-byte characters; make sure the driver never guesses.
		connection: { client_encoding: 'UTF8' }
	});
	return { client, db: drizzle(client, { schema }) };
}

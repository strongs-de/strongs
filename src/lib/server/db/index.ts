import { config } from '../config.ts';
import { createDb, type Database } from './client.ts';

let instance: { client: ReturnType<typeof createDb>['client']; db: Database } | undefined;

/**
 * The application-wide database handle.
 *
 * Deliberately lazy: SvelteKit's build step imports every server module to analyse routes, so
 * connecting (or even validating the environment) at module scope would make `vite build` require a
 * live database and a full set of secrets.
 */
export function getDb(): Database {
	instance ??= createDb(config().DATABASE_URL);
	return instance.db;
}

/** Closes the pool. Only needed by CLI scripts and tests; the server keeps it open for its lifetime. */
export async function closeDb(): Promise<void> {
	await instance?.client.end();
	instance = undefined;
}

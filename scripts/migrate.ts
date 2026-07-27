/**
 * Applies pending database migrations, then exits.
 *
 * Runs on container start before the server boots (see the `start` script), and can be run by hand
 * with `pnpm db:migrate`. Deliberately free of `$lib` and `$env` imports so plain Node can execute
 * it in the production image, where no build tooling is installed.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

// A single connection, and `max_lifetime: 0` so the process can exit as soon as we are done.
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
	const started = Date.now();
	await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	console.log(`migrations applied in ${Date.now() - started}ms`);
} catch (error) {
	console.error('migration failed:', error);
	process.exitCode = 1;
} finally {
	await client.end();
}

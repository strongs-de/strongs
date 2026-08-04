/**
 * Prepares the end-to-end test database.
 *
 * The tests need known content, so they run against their own database rather than against a
 * development one that holds real translations: `/Joh3,16` has to show a fixture verse whose exact
 * wording the assertions can name.
 *
 * Creates the database if it is missing, applies migrations, wipes the content and seeds the fixture.
 *
 *   pnpm test:e2e   (runs this first)
 */

import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import postgres from 'postgres';
import { testDatabaseUrl } from './lib/test-database.ts';
import { MAIL_TEST_OUTBOX } from './lib/mail-outbox.ts';

const base = process.env.DATABASE_URL;
if (!base) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const target = process.env.E2E_DATABASE_URL ?? testDatabaseUrl(base);
const targetName = new URL(target).pathname.replace(/^\//, '');

// Connect to the maintenance database, which cannot be the one being created.
const maintenanceUrl = new URL(base);
maintenanceUrl.pathname = '/postgres';

const admin = postgres(maintenanceUrl.toString(), { max: 1, onnotice: () => {} });

try {
	const existing = await admin`select 1 from pg_database where datname = ${targetName}`;
	if (existing.length === 0) {
		// Identifiers cannot be bound as parameters.
		await admin.unsafe(`create database "${targetName.replace(/"/g, '""')}"`);
		console.log(`created database ${targetName}`);
	}
} finally {
	await admin.end();
}

const environment = { ...process.env, DATABASE_URL: target };

execFileSync('node', ['scripts/migrate.ts'], { stdio: 'inherit', env: environment });

// Start from a clean slate: content only, so the schema and migration history stay put.
const db = postgres(target, { max: 1, onnotice: () => {} });
try {
	await db`truncate resources, users, import_jobs, login_attempts, settings, backup_jobs cascade`;
} finally {
	await db.end();
}

execFileSync('node', ['scripts/seed.ts'], { stdio: 'inherit', env: environment });

// Stale links from a previous run cannot match a fresh run's unique email addresses, but there is no
// reason to let the file grow forever either.
await rm(MAIL_TEST_OUTBOX, { force: true });

console.log(`end-to-end database ready: ${targetName}`);

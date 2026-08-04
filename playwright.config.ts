import { defineConfig } from '@playwright/test';
import { testDatabaseUrl } from './scripts/lib/test-database.ts';

/**
 * End-to-end tests run against a production build, since that is what the container serves, and
 * against their own database, prepared by `scripts/prepare-e2e.ts`, so the assertions can name exact
 * verse wording.
 */
const databaseUrl =
	process.env.E2E_DATABASE_URL ??
	testDatabaseUrl(process.env.DATABASE_URL ?? 'postgres://strongs:strongs@localhost:5432/strongs');

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	// A cold build or a slow first render should not fail an assertion.
	timeout: 30_000,
	expect: { timeout: 7_000 },
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'pnpm run build && pnpm run preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		env: {
			// Spread first: the build step needs PATH and the rest of the ambient environment.
			...process.env,
			DATABASE_URL: databaseUrl,
			ORIGIN: 'http://localhost:4173',
			SESSION_SECRET: 'e2e-session-secret-e2e-session-secret-0123',
			// Lets the backup tests exercise the encrypted S3-secret path, not just the unconfigured one.
			BACKUP_ENCRYPTION_KEY: 'e2e-backup-encryption-key-0123456789abcdef',
			NODE_ENV: 'production'
		}
	}
});

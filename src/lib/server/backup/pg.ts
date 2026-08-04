/**
 * `pg_dump` / `pg_restore` wrappers.
 *
 * Custom format (`--format=custom`) rather than plain SQL: it is compressed, restorable with
 * `--clean --if-exists`, and is what `docs/operations.md` already tells an operator to use by hand.
 *
 * `restoreFromFile` deliberately does not pass `--single-transaction`: combined with `--clean` it
 * would turn every ignorable `DROP … IF EXISTS` ordering hiccup (extensions, the `german_unaccent`
 * text-search configuration, materialized views) into a fatal error. Instead stderr is inspected for
 * `pg_restore: warning:`/`error:` lines so a noisy-but-successful restore stays visible without being
 * treated as a hard failure.
 */

import { execFile as execFileCallback } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

/** First bytes of a `pg_dump --format=custom` file — the format's own magic string. */
const CUSTOM_FORMAT_MAGIC = Buffer.from('PGDMP', 'ascii');

export function isCustomFormatDump(head: Uint8Array): boolean {
	if (head.length < CUSTOM_FORMAT_MAGIC.length) return false;
	return Buffer.from(head.slice(0, CUSTOM_FORMAT_MAGIC.length)).equals(CUSTOM_FORMAT_MAGIC);
}

/**
 * `PG*` environment variables parsed out of a `postgres://user:pass@host:port/db` connection string,
 * so the password is passed to `pg_dump`/`pg_restore` via environment rather than argv — argv is
 * visible to any other process on the host via `ps`/`/proc/<pid>/cmdline`, the environment is not.
 */
export function connectionEnv(databaseUrl: string): NodeJS.ProcessEnv {
	const url = new URL(databaseUrl);
	return {
		PGHOST: url.hostname,
		PGPORT: url.port || '5432',
		PGUSER: decodeURIComponent(url.username),
		PGPASSWORD: decodeURIComponent(url.password),
		PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, ''))
	};
}

type ExecFileError = NodeJS.ErrnoException & { stdout?: string; stderr?: string };

async function run(
	command: string,
	args: string[],
	env: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string }> {
	try {
		return await execFile(command, args, { env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(
				`${command} ist für Datenbank-Backups erforderlich, ist in dieser Umgebung aber nicht ` +
					'installiert.',
				{ cause: error }
			);
		}
		throw error;
	}
}

/** Whether `pg_dump` is on `PATH`, so the admin page can show a clear notice instead of a 500. */
export async function hasPgTools(): Promise<boolean> {
	try {
		await execFile('pg_dump', ['--version']);
		return true;
	} catch {
		return false;
	}
}

export async function dumpToFile(options: {
	databaseUrl: string;
	outPath: string;
}): Promise<{ sizeBytes: number }> {
	const env = { ...process.env, ...connectionEnv(options.databaseUrl) };
	await run(
		'pg_dump',
		['--format=custom', '--compress=6', '--no-owner', '--no-privileges', '--file', options.outPath],
		env
	);
	const stats = await stat(options.outPath);
	return { sizeBytes: stats.size };
}

function countIgnoredErrors(stderr: string): number {
	const matches = stderr.match(/pg_restore: (warning|error):/g);
	return matches ? matches.length : 0;
}

export async function restoreFromFile(options: {
	databaseUrl: string;
	path: string;
}): Promise<{ ignoredErrors: number; stderr: string }> {
	const env = { ...process.env, ...connectionEnv(options.databaseUrl) };
	try {
		const { stderr } = await run(
			'pg_restore',
			[
				'--clean',
				'--if-exists',
				'--no-owner',
				'--no-privileges',
				'--dbname',
				env.PGDATABASE!,
				options.path
			],
			env
		);
		return { ignoredErrors: countIgnoredErrors(stderr), stderr };
	} catch (error) {
		if (error instanceof Error && 'stderr' in error) {
			const stderr = (error as ExecFileError).stderr ?? '';
			throw new Error(
				`pg_restore ist fehlgeschlagen: ${stderr.slice(-4000) || (error as Error).message}`,
				{ cause: error }
			);
		}
		throw error;
	}
}

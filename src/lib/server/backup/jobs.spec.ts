import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';

// `config()` (see `../config.ts`) caches its result on first call, so the override has to be in place
// before `jobs.ts` is ever imported — same pattern as `crypto.spec.ts` uses for `BACKUP_ENCRYPTION_KEY`.
const tmpDir = mkdtempSync(join(tmpdir(), 'strongs-backup-jobs-'));
process.env.BACKUP_TMP_DIR = tmpDir;

const { stageFromLocal, stageFromS3, stagedDumpPath } = await import('./jobs.ts');

afterAll(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

const DUMP_HEADER = Buffer.concat([Buffer.from('PGDMP', 'ascii'), Buffer.alloc(16, 1)]);

function fakeS3Client(handler: (command: unknown) => unknown): S3Client {
	return { send: vi.fn(async (command: unknown) => handler(command)) } as unknown as S3Client;
}

function writeLocalBackup(name: string, content: Buffer = DUMP_HEADER): string {
	const path = join(tmpDir, name);
	writeFileSync(path, content);
	return path;
}

describe('stageFromLocal', () => {
	it('rejects a name that does not match the backup file pattern', async () => {
		await expect(stageFromLocal('../../etc/passwd')).rejects.toThrow('Ungültiger Dateiname.');
		await expect(stageFromLocal('not-a-backup.dump')).rejects.toThrow('Ungültiger Dateiname.');
	});

	it('copies the file into a fresh staged path and leaves the original untouched', async () => {
		const name = 'strongs-20260101-030000.dump';
		writeLocalBackup(name);

		const staged = await stageFromLocal(name);

		expect(staged).not.toBe(join(tmpDir, name));
		expect(staged.startsWith(tmpDir)).toBe(true);
		expect(readFileSync(staged)).toEqual(DUMP_HEADER);
		// The original local backup must still exist — staging must never consume it.
		expect(readFileSync(join(tmpDir, name))).toEqual(DUMP_HEADER);
	});

	it('rejects a file that does not have a pg_dump custom-format header', async () => {
		const name = 'strongs-20260102-030000.dump';
		writeLocalBackup(name, Buffer.from('not a dump'));

		await expect(stageFromLocal(name)).rejects.toThrow('Das ist keine gültige Backup-Datei.');
		// The original stays put even though the staged copy failed validation.
		expect(readFileSync(join(tmpDir, name)).toString()).toBe('not a dump');
	});

	it('reports a missing local backup as "not found" rather than a raw ENOENT', async () => {
		await expect(stageFromLocal('strongs-20260103-030000.dump')).rejects.toThrow(
			'Die lokale Sicherung wurde nicht gefunden.'
		);
	});
});

describe('stageFromS3', () => {
	it('streams the object into a fresh staged path', async () => {
		const client = fakeS3Client((command) => {
			expect(command).toBeInstanceOf(GetObjectCommand);
			return { Body: Readable.from(DUMP_HEADER), ContentLength: DUMP_HEADER.length };
		});

		const staged = await stageFromS3(client, { bucket: 'b', key: 'strongs/foo.dump' });

		expect(staged.startsWith(tmpDir)).toBe(true);
		expect(readFileSync(staged)).toEqual(DUMP_HEADER);
	});

	it('rejects and cleans up when the object is not a pg_dump custom-format file', async () => {
		const client = fakeS3Client(() => ({
			Body: Readable.from(Buffer.from('not a dump')),
			ContentLength: 10
		}));

		await expect(stageFromS3(client, { bucket: 'b', key: 'strongs/foo.dump' })).rejects.toThrow(
			'Das ist keine gültige Backup-Datei.'
		);
	});

	it('propagates and cleans up on a stream error', async () => {
		const client = fakeS3Client(() => ({
			Body: new Readable({
				read() {
					this.destroy(new Error('connection reset'));
				}
			}),
			ContentLength: 5
		}));

		await expect(stageFromS3(client, { bucket: 'b', key: 'strongs/foo.dump' })).rejects.toThrow(
			'connection reset'
		);
	});
});

describe('stagedDumpPath', () => {
	it('rejects an id that is not a strict UUID (path traversal guard)', () => {
		expect(() => stagedDumpPath('../../etc/passwd')).toThrow('Ungültige Staging-ID.');
	});
});

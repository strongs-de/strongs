import { describe, expect, it } from 'vitest';
import {
	backupFileName,
	BACKUP_FILE_PATTERN,
	selectExpired,
	type BackupObject
} from './retention.ts';

function object(key: string, isoDate: string, size = 1024): BackupObject {
	return { key, lastModified: new Date(isoDate), size };
}

describe('backupFileName', () => {
	it('matches the pattern selectExpired relies on', () => {
		const name = backupFileName(new Date('2026-08-04T03:00:05Z'));
		expect(name).toBe('akribos-20260804-030005.dump');
		expect(BACKUP_FILE_PATTERN.test(name)).toBe(true);
		expect(BACKUP_FILE_PATTERN.test('strongs-20260804-030005.dump')).toBe(true);
	});

	it('is lexicographically sortable by time', () => {
		const earlier = backupFileName(new Date('2026-08-04T03:00:00Z'));
		const later = backupFileName(new Date('2026-08-04T04:00:00Z'));
		expect(earlier < later).toBe(true);
	});
});

describe('selectExpired', () => {
	it('keeps only the newest N and expires the rest', () => {
		const objects = [
			object('akribos-20260101-030000.dump', '2026-01-01'),
			object('akribos-20260102-030000.dump', '2026-01-02'),
			object('akribos-20260103-030000.dump', '2026-01-03')
		];
		expect(selectExpired(objects, 2)).toEqual(['akribos-20260101-030000.dump']);
	});

	it('never returns a key that does not match the backup file pattern', () => {
		const objects = [
			object('important-customer-data.zip', '2020-01-01'),
			object('strongs/important-customer-data.zip', '2020-01-01'),
			object('akribos-20260101-030000.dump', '2026-01-01')
		];
		expect(selectExpired(objects, 0)).toEqual(['akribos-20260101-030000.dump']);
	});

	it('ignores pre-restore safety dumps entirely', () => {
		const objects = [
			object('akribos/pre-restore/akribos-20260101-030000.dump', '2020-01-01'),
			object('akribos-20260102-030000.dump', '2026-01-02')
		];
		expect(selectExpired(objects, 0)).toEqual(['akribos-20260102-030000.dump']);
	});

	it('returns nothing when keep is at least the object count', () => {
		const objects = [object('akribos-20260101-030000.dump', '2026-01-01')];
		expect(selectExpired(objects, 1)).toEqual([]);
		expect(selectExpired(objects, 5)).toEqual([]);
	});

	it('matches a prefixed key by its basename only', () => {
		const objects = [
			object('akribos/backups/akribos-20260101-030000.dump', '2026-01-01'),
			object('akribos/backups/akribos-20260102-030000.dump', '2026-01-02')
		];
		expect(selectExpired(objects, 1)).toEqual(['akribos/backups/akribos-20260101-030000.dump']);
	});
});

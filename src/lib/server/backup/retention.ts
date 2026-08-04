/** Pure selection logic for pruning old backups, kept free of any S3/filesystem I/O so it is trivially testable. */

export type BackupObject = { key: string; lastModified: Date; size: number };

/** Backup file names this app produces, e.g. `strongs-20260804-030000.dump`. */
export const BACKUP_FILE_PATTERN = /^strongs-\d{8}-\d{6}\.dump$/;

/** Sub-prefix that pre-restore safety dumps are uploaded under; never touched by ordinary pruning. */
export const PRE_RESTORE_SEGMENT = 'pre-restore/';

export function backupFileName(at: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	const year = at.getUTCFullYear();
	const month = pad(at.getUTCMonth() + 1);
	const day = pad(at.getUTCDate());
	const hour = pad(at.getUTCHours());
	const minute = pad(at.getUTCMinutes());
	const second = pad(at.getUTCSeconds());
	return `strongs-${year}${month}${day}-${hour}${minute}${second}.dump`;
}

function baseName(key: string): string {
	const index = key.lastIndexOf('/');
	return index === -1 ? key : key.slice(index + 1);
}

/**
 * Keys to delete so that only the newest `keep` of *our own* backups remain.
 *
 * Objects whose name does not match `BACKUP_FILE_PATTERN`, or that live under the `pre-restore/`
 * sub-prefix, are never returned: the bucket may hold anything else the admin put there, and a
 * retention pass must not be able to touch it. This is the invariant that turns a retention bug into
 * a data-loss incident, so it is enforced here rather than trusted to callers.
 */
export function selectExpired(objects: BackupObject[], keep: number): string[] {
	const own = objects.filter(
		(object) =>
			!object.key.includes(PRE_RESTORE_SEGMENT) && BACKUP_FILE_PATTERN.test(baseName(object.key))
	);
	const newestFirst = [...own].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
	return newestFirst.slice(Math.max(keep, 0)).map((object) => object.key);
}

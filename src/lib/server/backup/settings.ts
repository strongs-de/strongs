/**
 * Backup configuration, stored as a single row in the generic `settings` key/value table.
 *
 * `lastRunAt`/`nextRunAt` are deliberately not part of this shape: `lastRunAt` is derived from
 * `backup_jobs` (`lastSuccessfulScheduledRun`) and `nextRunAt` is computed from the schedule on
 * demand (`schedule.ts`) — keeping a timestamp here would let it drift from what actually happened.
 */

import { z } from 'zod';
import type { Database } from '../db/client.ts';
import { getSetting, putSetting } from '../repositories/settings.ts';
import { decryptSecret, encryptSecret } from './crypto.ts';

export const BACKUP_SETTINGS_KEY = 'backup';

export const SCHEDULE_PRESETS = ['hourly', 'daily', 'weekly'] as const;
export type SchedulePreset = (typeof SCHEDULE_PRESETS)[number];

const s3Schema = z.object({
	enabled: z.boolean().default(false),
	/** e.g. `https://s3.eu-central-1.wasabisys.com`. */
	endpoint: z.union([z.string().url(), z.literal('')]).default(''),
	region: z.string().default('auto'),
	bucket: z.string().default(''),
	/** Normalised by `normalizePrefix`: no leading slash, single trailing slash when non-empty. */
	prefix: z.string().default('strongs/'),
	accessKeyId: z.string().default(''),
	/** AES-256-GCM token from `crypto.ts`, or `''` if never configured. Never plaintext. */
	secretAccessKey: z.string().default(''),
	forcePathStyle: z.boolean().default(true)
});

const scheduleSchema = z.object({
	preset: z.enum(SCHEDULE_PRESETS).default('daily'),
	/** Wall-clock time in `timeZone`. Ignored for `hourly` except `minute`. */
	hour: z.number().int().min(0).max(23).default(3),
	minute: z.number().int().min(0).max(59).default(0),
	/** ISO weekday: 1 = Monday … 7 = Sunday. Only used for `weekly`. */
	weekday: z.number().int().min(1).max(7).default(1),
	timeZone: z.string().default('Europe/Berlin')
});

const retentionSchema = z.object({
	keepRemote: z.number().int().min(1).max(365).default(30),
	/** Copies kept alongside S3 in the local `backups` volume, as a safety net if S3 is unreachable. */
	keepLocal: z.number().int().min(0).max(20).default(3)
});

// Precomputed rather than `.default({})`: Zod uses a container's default value as-is instead of
// re-parsing it, so `.default({})` would skip the nested schemas' own field defaults entirely.
export const backupSettingsSchema = z.object({
	s3: s3Schema.default(s3Schema.parse({})),
	schedule: scheduleSchema.default(scheduleSchema.parse({})),
	retention: retentionSchema.default(retentionSchema.parse({}))
});

export type BackupSettings = z.infer<typeof backupSettingsSchema>;

const DEFAULT_SETTINGS = backupSettingsSchema.parse({});

/** Strips a leading slash, collapses repeated slashes, and ensures one trailing slash when non-empty. */
export function normalizePrefix(prefix: string): string {
	const stripped = prefix.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
	if (stripped === '') return '';
	return stripped.endsWith('/') ? stripped : `${stripped}/`;
}

/** Defaults when nothing has been configured yet; never throws. */
export async function readBackupSettings(db: Database): Promise<BackupSettings> {
	const stored = await getSetting(db, BACKUP_SETTINGS_KEY, backupSettingsSchema);
	return stored ?? DEFAULT_SETTINGS;
}

/** Same as `readBackupSettings`, plus the decrypted secret. Server-internal only. */
export async function readBackupCredentials(
	db: Database
): Promise<{ settings: BackupSettings; secretAccessKey: string }> {
	const settings = await readBackupSettings(db);
	const secretAccessKey = settings.s3.secretAccessKey
		? decryptSecret(settings.s3.secretAccessKey)
		: '';
	return { settings, secretAccessKey };
}

export type BackupSettingsInput = {
	s3: Omit<BackupSettings['s3'], 'secretAccessKey'> & {
		/** Plaintext, or `''` to keep the currently stored secret unchanged. */
		secretAccessKey: string;
	};
	schedule: BackupSettings['schedule'];
	retention: BackupSettings['retention'];
};

/**
 * Merges a form submission into the stored settings. A blank secret field keeps the existing
 * (encrypted) secret; a non-blank one is encrypted before it is written.
 */
export async function writeBackupSettings(
	db: Database,
	next: BackupSettingsInput
): Promise<BackupSettings> {
	const current = await readBackupSettings(db);
	const secretAccessKey =
		next.s3.secretAccessKey === ''
			? current.s3.secretAccessKey
			: encryptSecret(next.s3.secretAccessKey);

	const merged = backupSettingsSchema.parse({
		s3: { ...next.s3, prefix: normalizePrefix(next.s3.prefix), secretAccessKey },
		schedule: next.schedule,
		retention: next.retention
	});

	await putSetting(db, BACKUP_SETTINGS_KEY, merged);
	return merged;
}

export type ClientBackupSettings = Omit<BackupSettings, 's3'> & {
	s3: Omit<BackupSettings['s3'], 'secretAccessKey'> & { hasSecret: boolean };
};

/**
 * Strips the ciphertext for the client. This is the single choke point that guarantees neither
 * plaintext nor ciphertext ever reaches the browser.
 */
export function toClientSettings(settings: BackupSettings): ClientBackupSettings {
	const { secretAccessKey, ...s3Rest } = settings.s3;
	return { ...settings, s3: { ...s3Rest, hasSecret: secretAccessKey !== '' } };
}

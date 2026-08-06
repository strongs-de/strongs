import { open, stat } from 'node:fs/promises';
import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { isEncryptionAvailable } from '$lib/server/backup/crypto';
import {
	readBackupCredentials,
	readBackupSettings,
	SCHEDULE_PRESETS,
	toClientSettings,
	writeBackupSettings,
	type BackupSettingsInput,
	type SchedulePreset
} from '$lib/server/backup/settings';
import { nextSlotAt } from '$lib/server/backup/schedule';
import {
	deleteLocalBackup,
	hasRunningBackupJob,
	lastSuccessfulScheduledRun,
	listBackupJobs,
	listLocalBackups,
	runRestore,
	runScheduledBackup,
	stagedDumpPath,
	stageFromLocal,
	stageFromS3
} from '$lib/server/backup/jobs';
import { hasPgTools, isCustomFormatDump } from '$lib/server/backup/pg';
import {
	createS3Client,
	listBackups as listBackupsS3,
	testConnection as testS3Connection
} from '$lib/server/backup/s3';
import { selectExpired } from '$lib/server/backup/retention';

/** Typed confirmation the restore form requires before a restore is allowed to proceed. */
const RESTORE_CONFIRMATION = 'WIEDERHERSTELLEN';

/** Same server-side check for every restore action, whichever source the file comes from. */
function isConfirmed(form: FormData): boolean {
	return String(form.get('confirm') ?? '').trim() === RESTORE_CONFIRMATION;
}

function clampInt(
	value: FormDataEntryValue | null,
	min: number,
	max: number,
	fallback: number
): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(max, Math.max(min, Math.round(parsed)));
}

function parsePreset(value: FormDataEntryValue | null): SchedulePreset {
	return SCHEDULE_PRESETS.includes(value as SchedulePreset) ? (value as SchedulePreset) : 'daily';
}

export async function load() {
	const db = getDb();

	const [settings, jobs, running, lastRunAt, localBackups, pgToolsAvailable] = await Promise.all([
		readBackupSettings(db),
		listBackupJobs(db, 20),
		hasRunningBackupJob(db),
		lastSuccessfulScheduledRun(db),
		listLocalBackups(),
		hasPgTools()
	]);

	return {
		settings: toClientSettings(settings),
		encryptionAvailable: isEncryptionAvailable(),
		jobs,
		running,
		lastRunAt,
		nextRunAt: settings.s3.enabled ? nextSlotAt(settings.schedule, new Date()) : null,
		localBackups: localBackups
			.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
			.map((backup) => ({ name: backup.key, size: backup.size, mtime: backup.lastModified })),
		pgToolsAvailable,
		restorePhrase: RESTORE_CONFIRMATION
	};
}

export const actions = {
	saveSettings: async ({ request }) => {
		const form = await request.formData();
		const db = getDb();

		const enabled = form.get('enabled') === 'on';
		if (enabled && !isEncryptionAvailable()) {
			return fail(400, {
				error:
					'BACKUP_ENCRYPTION_KEY ist nicht gesetzt — automatische Backups nach S3 können nicht ' +
					'aktiviert werden.'
			});
		}

		const secretInput = String(form.get('secretAccessKey') ?? '');
		const bucket = String(form.get('bucket') ?? '').trim();
		const accessKeyId = String(form.get('accessKeyId') ?? '').trim();

		if (enabled) {
			const current = await readBackupSettings(db);
			const hasSecret = current.s3.secretAccessKey !== '' || secretInput !== '';
			if (!bucket || !accessKeyId || !hasSecret) {
				return fail(400, {
					error:
						'Bucket, Access Key ID und ein Secret Access Key sind erforderlich, um automatische ' +
						'Backups zu aktivieren.'
				});
			}
		}

		const next: BackupSettingsInput = {
			s3: {
				enabled,
				endpoint: String(form.get('endpoint') ?? '').trim(),
				region: String(form.get('region') ?? '').trim() || 'auto',
				bucket,
				prefix: String(form.get('prefix') ?? '').trim() || 'akribos/',
				accessKeyId,
				secretAccessKey: secretInput,
				forcePathStyle: form.get('forcePathStyle') === 'on'
			},
			schedule: {
				preset: parsePreset(form.get('preset')),
				hour: clampInt(form.get('hour'), 0, 23, 3),
				minute: clampInt(form.get('minute'), 0, 59, 0),
				weekday: clampInt(form.get('weekday'), 1, 7, 1),
				timeZone: String(form.get('timeZone') ?? '').trim() || 'Europe/Berlin'
			},
			retention: {
				keepRemote: clampInt(form.get('keepRemote'), 1, 365, 30),
				keepLocal: clampInt(form.get('keepLocal'), 0, 20, 3)
			}
		};

		try {
			await writeBackupSettings(db, next);
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen.'
			});
		}

		return { saved: true };
	},

	testConnection: async ({ request }) => {
		const form = await request.formData();
		const db = getDb();
		const current = await readBackupCredentials(db);

		const secretInput = String(form.get('secretAccessKey') ?? '');
		const secretAccessKey = secretInput || current.secretAccessKey;
		const bucket = String(form.get('bucket') ?? '').trim() || current.settings.s3.bucket;
		const prefix = String(form.get('prefix') ?? '').trim() || current.settings.s3.prefix;

		if (!secretAccessKey || !bucket) {
			return fail(400, {
				tested: 'failed',
				message: 'Bucket und Secret Access Key werden für den Verbindungstest benötigt.'
			});
		}

		const client = createS3Client({
			endpoint: String(form.get('endpoint') ?? '').trim() || current.settings.s3.endpoint,
			region: String(form.get('region') ?? '').trim() || current.settings.s3.region,
			forcePathStyle: form.get('forcePathStyle') === 'on',
			accessKeyId: String(form.get('accessKeyId') ?? '').trim() || current.settings.s3.accessKeyId,
			secretAccessKey
		});

		const result = await testS3Connection(client, { bucket, prefix });
		return result.ok ? { tested: 'ok' } : { tested: 'failed', message: result.message };
	},

	runNow: async ({ locals }) => {
		const db = getDb();
		if (await hasRunningBackupJob(db)) {
			return fail(409, { error: 'Es läuft bereits ein Backup- oder Wiederherstellungsvorgang.' });
		}
		const settings = await readBackupSettings(db);
		if (!settings.s3.enabled) return fail(400, { error: 'S3 ist nicht aktiviert.' });

		await runScheduledBackup(db, { trigger: 'manual', createdBy: locals.user!.id });
		return { started: true };
	},

	listRemote: async () => {
		const db = getDb();
		const { settings, secretAccessKey } = await readBackupCredentials(db);
		if (!settings.s3.bucket || !secretAccessKey) {
			return fail(400, { remoteError: 'S3 ist nicht vollständig konfiguriert.' });
		}

		try {
			const client = createS3Client({ ...settings.s3, secretAccessKey });
			const objects = await listBackupsS3(client, {
				bucket: settings.s3.bucket,
				prefix: settings.s3.prefix
			});
			const expired = new Set(selectExpired(objects, settings.retention.keepRemote));

			return {
				remote: objects
					.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
					.map((object) => ({
						key: object.key,
						size: object.size,
						lastModified: object.lastModified.toISOString(),
						expired: expired.has(object.key)
					}))
			};
		} catch (error) {
			return fail(502, {
				remoteError: error instanceof Error ? error.message : 'Auflisten fehlgeschlagen.'
			});
		}
	},

	// The three restore actions below all report failure through the dedicated `restoreError` key
	// (rather than the generic `error` key `saveSettings`/`deleteLocal` use) so the "Wiederherstellen"
	// section is the only place that ever renders one of their messages — otherwise a restore failure
	// would render twice, once there and once in the unrelated S3-settings error banner above.

	restore: async ({ request, locals }) => {
		const form = await request.formData();

		// The server-side check that matters; the client-side disabled button is convenience only.
		if (!isConfirmed(form)) {
			return fail(400, { restoreError: 'confirm' });
		}

		let path: string;
		try {
			path = stagedDumpPath(String(form.get('stagedId') ?? ''));
		} catch {
			return fail(400, { restoreError: 'Ungültige hochgeladene Datei. Bitte erneut hochladen.' });
		}

		const stats = await stat(path).catch(() => null);
		if (!stats || stats.size === 0) {
			return fail(400, {
				restoreError: 'Die hochgeladene Datei wurde nicht gefunden. Bitte erneut hochladen.'
			});
		}

		const handle = await open(path, 'r');
		const head = Buffer.alloc(5);
		await handle.read(head, 0, 5, 0);
		await handle.close();
		if (!isCustomFormatDump(head)) {
			return fail(400, { restoreError: 'Das ist keine gültige Backup-Datei.' });
		}

		const db = getDb();
		if (await hasRunningBackupJob(db)) {
			return fail(409, {
				restoreError: 'Es läuft bereits ein Backup- oder Wiederherstellungsvorgang.'
			});
		}

		await runRestore(db, { path, createdBy: locals.user!.id });
		return { restoreStarted: true };
	},

	/** Restores directly from an existing local copy — no download + re-upload detour. */
	restoreLocal: async ({ request, locals }) => {
		const form = await request.formData();
		if (!isConfirmed(form)) {
			return fail(400, { restoreError: 'confirm' });
		}

		const db = getDb();
		if (await hasRunningBackupJob(db)) {
			return fail(409, {
				restoreError: 'Es läuft bereits ein Backup- oder Wiederherstellungsvorgang.'
			});
		}

		let path: string;
		try {
			path = await stageFromLocal(String(form.get('name') ?? ''));
		} catch (error) {
			return fail(400, {
				restoreError:
					error instanceof Error ? error.message : 'Die lokale Sicherung wurde nicht gefunden.'
			});
		}

		await runRestore(db, { path, createdBy: locals.user!.id });
		return { restoreStarted: true };
	},

	/** Restores directly from an S3 object — no download + re-upload detour. */
	restoreS3: async ({ request, locals }) => {
		const form = await request.formData();
		if (!isConfirmed(form)) {
			return fail(400, { restoreError: 'confirm' });
		}

		const key = String(form.get('key') ?? '');
		if (!key) return fail(400, { restoreError: 'Fehlender Schlüssel.' });

		const db = getDb();
		if (await hasRunningBackupJob(db)) {
			return fail(409, {
				restoreError: 'Es läuft bereits ein Backup- oder Wiederherstellungsvorgang.'
			});
		}

		const { settings, secretAccessKey } = await readBackupCredentials(db);
		if (!settings.s3.bucket || !secretAccessKey) {
			return fail(400, { restoreError: 'S3 ist nicht vollständig konfiguriert.' });
		}

		let path: string;
		try {
			const client = createS3Client({ ...settings.s3, secretAccessKey });
			path = await stageFromS3(client, { bucket: settings.s3.bucket, key });
		} catch (error) {
			return fail(400, {
				restoreError:
					error instanceof Error ? error.message : 'Herunterladen von S3 fehlgeschlagen.'
			});
		}

		await runRestore(db, { path, createdBy: locals.user!.id });
		return { restoreStarted: true };
	},

	deleteLocal: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		try {
			await deleteLocalBackup(name);
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Löschen fehlgeschlagen.'
			});
		}
		return { deletedLocal: name };
	}
};

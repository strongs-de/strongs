/**
 * In-process scheduler for the S3 backup preset. There is no queue service or external cron in this
 * stack (a single Compose service, deployed by Coolify), so a minute-granularity interval tick is the
 * whole mechanism — matching the "one process, no extra moving parts" choice already made for
 * imports (`import/jobs.ts`).
 *
 * A missed tick (a deploy, a brief outage) is not a special case: `isDue` compares against the last
 * *successful* run stored in `backup_jobs`, so the very next tick runs the backup, at most an hour
 * late for the hourly preset.
 */

import type { Database } from '../db/client.ts';
import { logger } from '../logger.ts';
import { isDue, lastSlotAt } from './schedule.ts';
import { hasRunningBackupJob, lastSuccessfulScheduledRun, runScheduledBackup } from './jobs.ts';
import { readBackupSettings } from './settings.ts';

const TICK_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;

export async function tick(db: Database, now: Date = new Date()): Promise<void> {
	try {
		const settings = await readBackupSettings(db);
		if (!settings.s3.enabled) return;

		const lastSuccess = await lastSuccessfulScheduledRun(db);
		if (!isDue(settings.schedule, lastSuccess, now)) return;
		if (await hasRunningBackupJob(db)) return;

		const slot = lastSlotAt(settings.schedule, now);
		logger.info({ slot }, 'starting scheduled backup');
		await runScheduledBackup(db, { trigger: 'schedule' });
	} catch (error) {
		// A throwing tick must never take the process down; it just tries again in a minute.
		logger.warn({ err: error }, 'scheduled backup tick failed');
	}
}

/** Starts the minute tick. Idempotent — a second call (dev HMR, a repeated init) is a no-op. */
export function startBackupScheduler(db: Database): void {
	if (timer) return;
	timer = setInterval(() => void tick(db), TICK_INTERVAL_MS);
	timer.unref();
}

/** Stops the tick. Only needed by tests. */
export function stopBackupScheduler(): void {
	if (timer) clearInterval(timer);
	timer = undefined;
}

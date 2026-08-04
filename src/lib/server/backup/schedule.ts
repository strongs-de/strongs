/**
 * Pure schedule computation for the admin-configured backup presets (hourly/daily/weekly).
 *
 * The scheduler compares against "the most recent scheduled moment at or before now" rather than
 * tracking a persisted "next run at" timer: that makes it idempotent, immune to a process restart or
 * a missed tick, and reducible to a single comparison (`isDue`) that a unit test can drive across DST
 * boundaries. See `isDue` below.
 *
 * Timezone handling is deliberately dependency-free: `Intl.DateTimeFormat` already knows IANA zone
 * rules, so a wall-clock time can be converted to a UTC instant by an offset lookup plus one or two
 * correction passes, without pulling in a date library.
 */

export const SCHEDULE_PRESETS = ['hourly', 'daily', 'weekly'] as const;
export type SchedulePreset = (typeof SCHEDULE_PRESETS)[number];

export type ScheduleSettings = {
	preset: SchedulePreset;
	/** Wall-clock hour in `timeZone`. Ignored for `hourly`. */
	hour: number;
	/** Wall-clock minute in `timeZone` for daily/weekly; minute-of-hour (UTC) for hourly. */
	minute: number;
	/** ISO weekday: 1 = Monday … 7 = Sunday. Only used for `weekly`. */
	weekday: number;
	timeZone: string;
};

const WEEKDAY_BY_SHORT_NAME: Record<string, number> = {
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
	Sun: 7
};

/** Offset of `timeZone` from UTC, in minutes, at the given instant (positive east of UTC). */
function offsetMinutesAt(instant: Date, timeZone: string): number {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
	const wallAsUtcMillis = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour) % 24,
		Number(parts.minute),
		Number(parts.second)
	);
	return Math.round((wallAsUtcMillis - instant.getTime()) / 60_000);
}

/**
 * The UTC instant corresponding to a wall-clock date/time in `timeZone`. Converges in at most a
 * couple of iterations except right at a DST transition, where a wall time that does not exist (the
 * spring-forward gap) or exists twice (the autumn-fallback overlap) resolves to *some* nearby instant
 * rather than throwing — acceptable here because the scheduler re-checks every minute regardless.
 */
function zonedTimeToInstant(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string
): Date {
	const target = Date.UTC(year, month - 1, day, hour, minute);
	let guess = target;
	for (let i = 0; i < 3; i++) {
		const offset = offsetMinutesAt(new Date(guess), timeZone);
		const next = target - offset * 60_000;
		if (next === guess) break;
		guess = next;
	}
	return new Date(guess);
}

function ymdInZone(instant: Date, timeZone: string): { year: number; month: number; day: number } {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
	return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function weekdayInZone(instant: Date, timeZone: string): number {
	const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
	return WEEKDAY_BY_SHORT_NAME[short] ?? 1;
}

/** Adds (or subtracts) whole calendar days. Uses UTC noon as the anchor to sidestep DST entirely. */
function stepDay(
	year: number,
	month: number,
	day: number,
	deltaDays: number
): { year: number; month: number; day: number } {
	const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
	return {
		year: anchor.getUTCFullYear(),
		month: anchor.getUTCMonth() + 1,
		day: anchor.getUTCDate()
	};
}

/**
 * The most recent scheduled moment at or before `now`, or `null` if the schedule can never produce
 * one (not a real case today, since every preset always has a slot, but keeps the return type honest
 * for a future preset that might not).
 */
export function lastSlotAt(schedule: ScheduleSettings, now: Date): Date | null {
	if (schedule.preset === 'hourly') {
		const candidate = new Date(now);
		candidate.setUTCSeconds(0, 0);
		candidate.setUTCMinutes(schedule.minute);
		if (candidate.getTime() > now.getTime()) {
			candidate.setTime(candidate.getTime() - 60 * 60_000);
		}
		return candidate;
	}

	let { year, month, day } = ymdInZone(now, schedule.timeZone);

	if (schedule.preset === 'weekly') {
		const currentWeekday = weekdayInZone(now, schedule.timeZone);
		const daysBack = (currentWeekday - schedule.weekday + 7) % 7;
		({ year, month, day } = stepDay(year, month, day, -daysBack));
	}

	let slot = zonedTimeToInstant(
		year,
		month,
		day,
		schedule.hour,
		schedule.minute,
		schedule.timeZone
	);
	if (slot.getTime() > now.getTime()) {
		const daysBack = schedule.preset === 'weekly' ? 7 : 1;
		({ year, month, day } = stepDay(year, month, day, -daysBack));
		slot = zonedTimeToInstant(year, month, day, schedule.hour, schedule.minute, schedule.timeZone);
	}
	return slot;
}

/** The next slot strictly after `now`. Display only. */
export function nextSlotAt(schedule: ScheduleSettings, now: Date): Date {
	if (schedule.preset === 'hourly') {
		const last = lastSlotAt(schedule, now)!;
		return new Date(last.getTime() + 60 * 60_000);
	}

	let { year, month, day } = ymdInZone(now, schedule.timeZone);

	if (schedule.preset === 'weekly') {
		const currentWeekday = weekdayInZone(now, schedule.timeZone);
		const daysForward = (schedule.weekday - currentWeekday + 7) % 7;
		({ year, month, day } = stepDay(year, month, day, daysForward));
	}

	let slot = zonedTimeToInstant(
		year,
		month,
		day,
		schedule.hour,
		schedule.minute,
		schedule.timeZone
	);
	if (slot.getTime() <= now.getTime()) {
		const daysForward = schedule.preset === 'weekly' ? 7 : 1;
		({ year, month, day } = stepDay(year, month, day, daysForward));
		slot = zonedTimeToInstant(year, month, day, schedule.hour, schedule.minute, schedule.timeZone);
	}
	return slot;
}

/**
 * Whether a scheduled backup is due: there is a slot at or before `now` that no successful run has
 * covered yet. `lastSuccessAt` should come from `backup_jobs` (`lastSuccessfulScheduledRun`), not from
 * stored config, so an edited schedule can never drift from what actually ran.
 */
export function isDue(schedule: ScheduleSettings, lastSuccessAt: Date | null, now: Date): boolean {
	const slot = lastSlotAt(schedule, now);
	if (!slot) return false;
	return lastSuccessAt === null || lastSuccessAt.getTime() < slot.getTime();
}

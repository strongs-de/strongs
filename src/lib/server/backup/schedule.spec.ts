import { describe, expect, it } from 'vitest';
import { isDue, lastSlotAt, nextSlotAt, type ScheduleSettings } from './schedule.ts';

function schedule(overrides: Partial<ScheduleSettings> = {}): ScheduleSettings {
	return {
		preset: 'daily',
		hour: 3,
		minute: 0,
		weekday: 1,
		timeZone: 'Europe/Berlin',
		...overrides
	};
}

function weekdayInBerlin(date: Date): number {
	const short = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Berlin',
		weekday: 'short'
	}).format(date);
	return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[short]!;
}

describe('lastSlotAt — hourly', () => {
	it('returns this hour’s slot once the minute has passed', () => {
		const slot = lastSlotAt(
			schedule({ preset: 'hourly', minute: 15 }),
			new Date('2026-08-04T10:20:00Z')
		);
		expect(slot?.toISOString()).toBe('2026-08-04T10:15:00.000Z');
	});

	it('falls back to the previous hour before the minute arrives', () => {
		const slot = lastSlotAt(
			schedule({ preset: 'hourly', minute: 15 }),
			new Date('2026-08-04T10:10:00Z')
		);
		expect(slot?.toISOString()).toBe('2026-08-04T09:15:00.000Z');
	});
});

describe('lastSlotAt — daily', () => {
	it('converts the wall-clock time from Europe/Berlin to UTC (CEST, summer)', () => {
		// 03:00 Europe/Berlin in August is CEST (UTC+2) = 01:00 UTC.
		const slot = lastSlotAt(schedule({ hour: 3, minute: 0 }), new Date('2026-08-04T02:00:00Z'));
		expect(slot?.toISOString()).toBe('2026-08-04T01:00:00.000Z');
	});

	it('converts the wall-clock time from Europe/Berlin to UTC (CET, winter)', () => {
		// 03:00 Europe/Berlin in January is CET (UTC+1) = 02:00 UTC.
		const slot = lastSlotAt(schedule({ hour: 3, minute: 0 }), new Date('2026-01-04T03:00:00Z'));
		expect(slot?.toISOString()).toBe('2026-01-04T02:00:00.000Z');
	});

	it('falls back to the previous day before today’s slot has occurred', () => {
		const slot = lastSlotAt(schedule({ hour: 3, minute: 0 }), new Date('2026-08-04T00:30:00Z'));
		expect(slot?.toISOString()).toBe('2026-08-03T01:00:00.000Z');
	});

	it('is UTC-independent of the exact time of day once the slot has passed', () => {
		const morning = lastSlotAt(schedule({ hour: 3, minute: 0 }), new Date('2026-08-04T10:00:00Z'));
		const evening = lastSlotAt(schedule({ hour: 3, minute: 0 }), new Date('2026-08-04T22:00:00Z'));
		expect(morning?.toISOString()).toBe(evening?.toISOString());
	});
});

describe('lastSlotAt — weekly', () => {
	it('produces a slot on the configured weekday', () => {
		for (const weekday of [1, 3, 5, 7]) {
			const slot = lastSlotAt(
				schedule({ preset: 'weekly', weekday, hour: 3 }),
				new Date('2026-08-04T12:00:00Z')
			);
			expect(weekdayInBerlin(slot!)).toBe(weekday);
		}
	});

	it('is exactly one week before a slot computed one week later', () => {
		const now = new Date('2026-08-04T12:00:00Z');
		const oneWeekLater = new Date(now.getTime() + 7 * 86_400_000);
		const first = lastSlotAt(schedule({ preset: 'weekly', weekday: 2 }), now);
		const second = lastSlotAt(schedule({ preset: 'weekly', weekday: 2 }), oneWeekLater);
		expect(second!.getTime() - first!.getTime()).toBe(7 * 86_400_000);
	});
});

describe('nextSlotAt', () => {
	it('is strictly after now and matches lastSlotAt one period later', () => {
		const now = new Date('2026-08-04T10:00:00Z');
		const next = nextSlotAt(schedule({ hour: 3, minute: 0 }), now);
		expect(next.getTime()).toBeGreaterThan(now.getTime());
		expect(next.toISOString()).toBe('2026-08-05T01:00:00.000Z');
	});

	it('agrees with lastSlotAt computed just after the returned instant', () => {
		const now = new Date('2026-08-04T10:00:00Z');
		const next = nextSlotAt(schedule({ hour: 3, minute: 0 }), now);
		const justAfter = new Date(next.getTime() + 1000);
		expect(lastSlotAt(schedule({ hour: 3, minute: 0 }), justAfter)?.toISOString()).toBe(
			next.toISOString()
		);
	});
});

describe('isDue', () => {
	const daily = schedule({ hour: 3, minute: 0 });

	it('is true when nothing has ever succeeded', () => {
		expect(isDue(daily, null, new Date('2026-08-04T10:00:00Z'))).toBe(true);
	});

	it('is false right after the slot has been covered by a successful run', () => {
		const slot = lastSlotAt(daily, new Date('2026-08-04T10:00:00Z'))!;
		expect(isDue(daily, slot, new Date('2026-08-04T10:00:00Z'))).toBe(false);
	});

	it('is true again once a new slot has passed', () => {
		const slot = lastSlotAt(daily, new Date('2026-08-04T10:00:00Z'))!;
		expect(isDue(daily, slot, new Date('2026-08-05T10:00:00Z'))).toBe(true);
	});

	it('is true when the last success was just before the slot', () => {
		const slot = lastSlotAt(daily, new Date('2026-08-04T10:00:00Z'))!;
		const justBefore = new Date(slot.getTime() - 1000);
		expect(isDue(daily, justBefore, new Date('2026-08-04T10:00:00Z'))).toBe(true);
	});
});

describe('DST transitions in Europe/Berlin', () => {
	// 2027-03-28: clocks spring forward from 02:00 CET to 03:00 CEST — 02:30 does not exist that day.
	it('still produces a slot on the spring-forward day without throwing', () => {
		const schedule30 = schedule({ hour: 2, minute: 30 });
		expect(() => lastSlotAt(schedule30, new Date('2027-03-28T12:00:00Z'))).not.toThrow();
		const slot = lastSlotAt(schedule30, new Date('2027-03-28T12:00:00Z'));
		expect(slot).not.toBeNull();
		// Whatever instant it resolves to, it must fall on 2027-03-28 UTC (not silently skip the day).
		expect(slot!.toISOString().slice(0, 10)).toBe('2027-03-28');
	});

	// 2026-10-25: clocks fall back from 03:00 CEST to 02:00 CET — 02:30 occurs twice.
	it('does not double-run across the fall-back day', () => {
		const schedule30 = schedule({ hour: 2, minute: 30 });
		const slot = lastSlotAt(schedule30, new Date('2026-10-25T23:00:00Z'))!;
		// A success recorded for that slot must not make the *next* day due yet...
		expect(isDue(schedule30, slot, new Date('2026-10-25T23:30:00Z'))).toBe(false);
		// ...but the following day's slot is still due once it arrives.
		expect(isDue(schedule30, slot, new Date('2026-10-26T23:00:00Z'))).toBe(true);
	});

	it('daily slots keep advancing one calendar day at a time across the transition', () => {
		const schedule300 = schedule({ hour: 3, minute: 0 });
		const before = lastSlotAt(schedule300, new Date('2026-10-25T12:00:00Z'))!;
		const after = lastSlotAt(schedule300, new Date('2026-10-26T12:00:00Z'))!;
		const days = (after.getTime() - before.getTime()) / 86_400_000;
		expect(days).toBeGreaterThan(0.9);
		expect(days).toBeLessThan(1.1);
	});
});

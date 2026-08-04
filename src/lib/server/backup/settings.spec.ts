import { describe, expect, it } from 'vitest';
import { backupSettingsSchema, normalizePrefix, toClientSettings } from './settings.ts';

describe('backupSettingsSchema', () => {
	it('fills in defaults for an empty or legacy row', () => {
		const parsed = backupSettingsSchema.parse({});
		expect(parsed).toEqual({
			s3: {
				enabled: false,
				endpoint: '',
				region: 'auto',
				bucket: '',
				prefix: 'strongs/',
				accessKeyId: '',
				secretAccessKey: '',
				forcePathStyle: true
			},
			schedule: { preset: 'daily', hour: 3, minute: 0, weekday: 1, timeZone: 'Europe/Berlin' },
			retention: { keepRemote: 30, keepLocal: 3 }
		});
	});

	it('fills in missing nested fields on a partial row', () => {
		const parsed = backupSettingsSchema.parse({ s3: { enabled: true, bucket: 'my-bucket' } });
		expect(parsed.s3.enabled).toBe(true);
		expect(parsed.s3.bucket).toBe('my-bucket');
		expect(parsed.s3.prefix).toBe('strongs/');
		expect(parsed.schedule.preset).toBe('daily');
	});
});

describe('normalizePrefix', () => {
	it('leaves an empty prefix empty', () => {
		expect(normalizePrefix('')).toBe('');
	});

	it('adds a trailing slash', () => {
		expect(normalizePrefix('x')).toBe('x/');
	});

	it('strips a leading slash', () => {
		expect(normalizePrefix('/x')).toBe('x/');
	});

	it('collapses repeated slashes', () => {
		expect(normalizePrefix('x//y')).toBe('x/y/');
	});

	it('leaves an already-normalised prefix unchanged', () => {
		expect(normalizePrefix('strongs/backups/')).toBe('strongs/backups/');
	});
});

describe('toClientSettings', () => {
	const base = backupSettingsSchema.parse({
		s3: { secretAccessKey: 'v1.iv.tag.ciphertext', accessKeyId: 'AKIAEXAMPLE' }
	});

	it('replaces the secret with a boolean flag', () => {
		const client = toClientSettings(base);
		expect(client.s3).not.toHaveProperty('secretAccessKey');
		expect(client.s3.hasSecret).toBe(true);
		expect(client.s3.accessKeyId).toBe('AKIAEXAMPLE');
	});

	it('reports no secret when none is stored', () => {
		const empty = backupSettingsSchema.parse({});
		expect(toClientSettings(empty).s3.hasSecret).toBe(false);
	});

	it('never serialises the ciphertext to the client payload', () => {
		const serialised = JSON.stringify(toClientSettings(base));
		expect(serialised).not.toContain('ciphertext');
		expect(serialised).not.toContain('v1.iv.tag');
	});
});

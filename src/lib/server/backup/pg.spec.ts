import { describe, expect, it } from 'vitest';
import { connectionEnv, isCustomFormatDump } from './pg.ts';

describe('connectionEnv', () => {
	it('parses host, port, user, password and database from the URL', () => {
		const env = connectionEnv('postgres://strongs:strongs@localhost:5432/strongs');
		expect(env).toEqual({
			PGHOST: 'localhost',
			PGPORT: '5432',
			PGUSER: 'strongs',
			PGPASSWORD: 'strongs',
			PGDATABASE: 'strongs'
		});
	});

	it('defaults the port to 5432 when omitted', () => {
		const env = connectionEnv('postgres://strongs:strongs@db/strongs');
		expect(env.PGPORT).toBe('5432');
	});

	it('URL-decodes a password containing special characters', () => {
		const env = connectionEnv('postgres://user:p%40ss%25word@db:5432/strongs');
		expect(env.PGPASSWORD).toBe('p@ss%word');
	});

	it('never includes the raw connection string or password in a serialisable argv-like array', () => {
		const env = connectionEnv('postgres://user:s3cr3t@db:5432/strongs');
		// The whole point of PG*-env over argv: nothing here is meant to be passed as a CLI argument.
		expect(Object.keys(env)).toEqual(['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']);
		expect(env.PGPASSWORD).toBe('s3cr3t');
	});
});

describe('isCustomFormatDump', () => {
	it('accepts a real custom-format header', () => {
		expect(isCustomFormatDump(Buffer.from('PGDMP\x01\x0e\x00', 'binary'))).toBe(true);
	});

	it('rejects gzip', () => {
		expect(isCustomFormatDump(Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00]))).toBe(false);
	});

	it('rejects plain SQL text', () => {
		expect(isCustomFormatDump(Buffer.from('-- PostgreSQL database dump\n', 'utf8'))).toBe(false);
	});

	it('rejects an empty buffer', () => {
		expect(isCustomFormatDump(new Uint8Array(0))).toBe(false);
	});

	it('rejects a buffer shorter than the magic string', () => {
		expect(isCustomFormatDump(Buffer.from('PGD', 'ascii'))).toBe(false);
	});
});

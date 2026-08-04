import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	type S3Client
} from '@aws-sdk/client-s3';
import { deleteKeys, getObjectStream, listBackups, pruneRemote, testConnection } from './s3.ts';

function fakeClient(handler: (command: unknown) => unknown): S3Client {
	return { send: vi.fn(async (command: unknown) => handler(command)) } as unknown as S3Client;
}

describe('listBackups', () => {
	it('follows pagination until IsTruncated is false', async () => {
		let call = 0;
		const client = fakeClient((command) => {
			expect(command).toBeInstanceOf(ListObjectsV2Command);
			call++;
			if (call === 1) {
				return {
					Contents: [{ Key: 'a', LastModified: new Date('2026-01-01'), Size: 10 }],
					IsTruncated: true,
					NextContinuationToken: 'tok'
				};
			}
			return {
				Contents: [{ Key: 'b', LastModified: new Date('2026-01-02'), Size: 20 }],
				IsTruncated: false
			};
		});
		const objects = await listBackups(client, { bucket: 'b', prefix: '' });
		expect(objects.map((o) => o.key)).toEqual(['a', 'b']);
		expect(call).toBe(2);
	});

	it('skips entries missing a key or lastModified', async () => {
		const client = fakeClient(() => ({
			Contents: [{ Size: 1 }, { Key: 'ok', LastModified: new Date('2026-01-01') }],
			IsTruncated: false
		}));
		const objects = await listBackups(client, { bucket: 'b', prefix: '' });
		expect(objects).toHaveLength(1);
		expect(objects[0]!.key).toBe('ok');
	});
});

describe('deleteKeys', () => {
	it('chunks deletes at 1000 keys', async () => {
		const calls: string[][] = [];
		const client = fakeClient((command) => {
			expect(command).toBeInstanceOf(DeleteObjectsCommand);
			const input = (command as DeleteObjectsCommand).input;
			calls.push(input.Delete!.Objects!.map((o) => o.Key!));
			return {};
		});
		const keys = Array.from({ length: 1500 }, (_, i) => `k${i}`);
		await deleteKeys(client, { bucket: 'b', keys });
		expect(calls).toHaveLength(2);
		expect(calls[0]).toHaveLength(1000);
		expect(calls[1]).toHaveLength(500);
	});

	it('does nothing for an empty key list', async () => {
		const client = fakeClient(() => {
			throw new Error('should not be called');
		});
		await expect(deleteKeys(client, { bucket: 'b', keys: [] })).resolves.toBeUndefined();
	});
});

describe('pruneRemote', () => {
	it('lists then deletes only the expired keys', async () => {
		const objects = [
			{ Key: 'strongs-20260101-030000.dump', LastModified: new Date('2026-01-01'), Size: 1 },
			{ Key: 'strongs-20260102-030000.dump', LastModified: new Date('2026-01-02'), Size: 1 }
		];
		let deleted: string[] = [];
		const client = fakeClient((command) => {
			if (command instanceof ListObjectsV2Command) return { Contents: objects, IsTruncated: false };
			if (command instanceof DeleteObjectsCommand) {
				deleted = command.input.Delete!.Objects!.map((o) => o.Key!);
				return {};
			}
			throw new Error('unexpected command');
		});
		const count = await pruneRemote(client, { bucket: 'b', prefix: '', keep: 1 });
		expect(count).toBe(1);
		expect(deleted).toEqual(['strongs-20260101-030000.dump']);
	});
});

describe('getObjectStream', () => {
	it('requests the given bucket and key and returns the body and content length', async () => {
		const client = fakeClient((command) => {
			expect(command).toBeInstanceOf(GetObjectCommand);
			const input = (command as GetObjectCommand).input;
			expect(input.Bucket).toBe('b');
			expect(input.Key).toBe('strongs/strongs-20260101-030000.dump');
			return { Body: Readable.from(Buffer.from('PGDMP')), ContentLength: 5 };
		});
		const { body, sizeBytes } = await getObjectStream(client, {
			bucket: 'b',
			key: 'strongs/strongs-20260101-030000.dump'
		});
		expect(sizeBytes).toBe(5);
		const chunks: Buffer[] = [];
		for await (const chunk of body) chunks.push(chunk as Buffer);
		expect(Buffer.concat(chunks).toString('ascii')).toBe('PGDMP');
	});

	it('defaults sizeBytes to 0 when the response has no ContentLength', async () => {
		const client = fakeClient(() => ({ Body: Readable.from(Buffer.from('x')) }));
		const { sizeBytes } = await getObjectStream(client, { bucket: 'b', key: 'k' });
		expect(sizeBytes).toBe(0);
	});

	it('throws when the response has no body', async () => {
		const client = fakeClient(() => ({}));
		await expect(getObjectStream(client, { bucket: 'b', key: 'k' })).rejects.toThrow(
			'Das S3-Objekt hat keinen Inhalt.'
		);
	});
});

describe('testConnection', () => {
	it('reports ok when head/put/delete succeed', async () => {
		const client = fakeClient(() => ({}));
		expect(await testConnection(client, { bucket: 'b', prefix: 'strongs/' })).toEqual({ ok: true });
	});

	it('reports the underlying error message on failure', async () => {
		const client = fakeClient((command) => {
			if (command instanceof HeadBucketCommand) throw new Error('access denied');
			return {};
		});
		const result = await testConnection(client, { bucket: 'b', prefix: 'strongs/' });
		expect(result).toEqual({ ok: false, message: 'access denied' });
	});

	it('writes a marker object under the configured prefix', async () => {
		let putKey: string | undefined;
		const client = fakeClient((command) => {
			if (command instanceof PutObjectCommand) putKey = command.input.Key;
			return {};
		});
		await testConnection(client, { bucket: 'b', prefix: 'strongs/' });
		expect(putKey).toBe('strongs/.strongs-connection-test');
	});
});

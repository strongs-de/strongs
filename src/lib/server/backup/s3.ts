/**
 * Thin wrapper around `@aws-sdk/client-s3` / `@aws-sdk/lib-storage`.
 *
 * The client is injected into every function here rather than constructed internally, so this module
 * can be exercised against a fake client in tests. `endpoint` + `forcePathStyle` cover any
 * S3-compatible provider (MinIO, Backblaze B2, Wasabi, Cloudflare R2, Hetzner, …), not just AWS.
 */

import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import {
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	type _Object
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { selectExpired, type BackupObject } from './retention.ts';

export type S3Credentials = {
	endpoint: string;
	region: string;
	forcePathStyle: boolean;
	accessKeyId: string;
	secretAccessKey: string;
};

export function createS3Client(credentials: S3Credentials): S3Client {
	return new S3Client({
		endpoint: credentials.endpoint || undefined,
		region: credentials.region || 'auto',
		forcePathStyle: credentials.forcePathStyle,
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey
		},
		// A misconfigured endpoint must fail in seconds, not hang a job or a form action.
		requestHandler: { connectionTimeout: 5_000, requestTimeout: 60_000 }
	});
}

export async function uploadFile(
	client: S3Client,
	options: {
		bucket: string;
		key: string;
		path: string;
		onProgress?: (loaded: number, total?: number) => void;
	}
): Promise<void> {
	const upload = new Upload({
		client,
		params: { Bucket: options.bucket, Key: options.key, Body: createReadStream(options.path) }
	});
	if (options.onProgress) {
		upload.on('httpUploadProgress', (progress) => {
			options.onProgress!(progress.loaded ?? 0, progress.total);
		});
	}
	await upload.done();
}

/**
 * Streams a single object back rather than buffering it, so a large dump does not sit in memory
 * before being forwarded to the browser — the download/restore counterpart of `uploadFile`.
 */
export async function getObjectStream(
	client: S3Client,
	options: { bucket: string; key: string }
): Promise<{ body: Readable; sizeBytes: number }> {
	const result = await client.send(
		new GetObjectCommand({ Bucket: options.bucket, Key: options.key })
	);
	if (!result.Body) throw new Error('Das S3-Objekt hat keinen Inhalt.');
	// The Node.js runtime of the SDK always resolves `Body` to a `Readable`; only the browser runtime
	// would give a web `ReadableStream` instead, which does not apply here.
	return { body: result.Body as Readable, sizeBytes: result.ContentLength ?? 0 };
}

/** Paginated listing of every object under `prefix`. */
export async function listBackups(
	client: S3Client,
	options: { bucket: string; prefix: string }
): Promise<BackupObject[]> {
	const objects: BackupObject[] = [];
	let continuationToken: string | undefined;

	do {
		const page = await client.send(
			new ListObjectsV2Command({
				Bucket: options.bucket,
				Prefix: options.prefix,
				ContinuationToken: continuationToken
			})
		);
		for (const object of (page.Contents ?? []) as _Object[]) {
			if (!object.Key || !object.LastModified) continue;
			objects.push({ key: object.Key, lastModified: object.LastModified, size: object.Size ?? 0 });
		}
		continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (continuationToken);

	return objects;
}

/** S3 rejects a delete request over 1000 keys, so deletes are chunked. */
export async function deleteKeys(
	client: S3Client,
	options: { bucket: string; keys: string[] }
): Promise<void> {
	const CHUNK_SIZE = 1000;
	for (let i = 0; i < options.keys.length; i += CHUNK_SIZE) {
		const chunk = options.keys.slice(i, i + CHUNK_SIZE);
		if (chunk.length === 0) continue;
		await client.send(
			new DeleteObjectsCommand({
				Bucket: options.bucket,
				Delete: { Objects: chunk.map((key) => ({ Key: key })) }
			})
		);
	}
}

/** Deletes everything under `prefix` beyond the newest `keep` of this app's own backups. */
export async function pruneRemote(
	client: S3Client,
	options: { bucket: string; prefix: string; keep: number }
): Promise<number> {
	const objects = await listBackups(client, options);
	const expired = selectExpired(objects, options.keep);
	if (expired.length > 0) await deleteKeys(client, { bucket: options.bucket, keys: expired });
	return expired.length;
}

/**
 * Proves *write* access, not just reachability: `HeadBucket` alone would pass for a read-only key,
 * which is the most common misconfiguration a backup feature can have.
 */
export async function testConnection(
	client: S3Client,
	options: { bucket: string; prefix: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
	const markerKey = `${options.prefix}.akribos-connection-test`;
	try {
		await client.send(new HeadBucketCommand({ Bucket: options.bucket }));
		await client.send(
			new PutObjectCommand({ Bucket: options.bucket, Key: markerKey, Body: 'Akribos' })
		);
		await deleteKeys(client, { bucket: options.bucket, keys: [markerKey] });
		return { ok: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, message };
	}
}

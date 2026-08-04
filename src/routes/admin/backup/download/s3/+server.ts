import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { readBackupCredentials } from '$lib/server/backup/settings';
import { createS3Client, getObjectStream } from '$lib/server/backup/s3';

export const prerender = false;

/**
 * Downloads a single S3 backup object directly — still protected by the `/admin` guard in
 * `hooks.server.ts`. `key` is a query parameter rather than a path segment because S3 keys contain
 * `/` (the configured prefix, and `pre-restore/`).
 */
export async function GET({ url }) {
	const key = url.searchParams.get('key');
	if (!key) error(400, 'Fehlender Parameter "key".');

	const db = getDb();
	const { settings, secretAccessKey } = await readBackupCredentials(db);
	if (!settings.s3.bucket || !secretAccessKey) {
		error(400, 'S3 ist nicht vollständig konfiguriert.');
	}

	const client = createS3Client({ ...settings.s3, secretAccessKey });
	let stream: { body: Readable; sizeBytes: number };
	try {
		stream = await getObjectStream(client, { bucket: settings.s3.bucket, key });
	} catch (err) {
		error(502, err instanceof Error ? err.message : 'Herunterladen von S3 fehlgeschlagen.');
	}

	const fileName = key.slice(key.lastIndexOf('/') + 1) || 'backup.dump';
	return new Response(Readable.toWeb(stream.body) as ReadableStream, {
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${fileName}"`,
			...(stream.sizeBytes ? { 'content-length': String(stream.sizeBytes) } : {}),
			'cache-control': 'no-store'
		}
	});
}

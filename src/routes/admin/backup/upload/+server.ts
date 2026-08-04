import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, open, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { json } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { stagedDumpPath } from '$lib/server/backup/jobs';
import { isCustomFormatDump } from '$lib/server/backup/pg';

export const prerender = false;

/**
 * Streams a restore upload straight to disk rather than through a form action's `request.formData()`,
 * which would materialise the whole (potentially multi-hundred-MB) dump in memory.
 */
export async function POST({ request, url }) {
	// `application/octet-stream` is not one of the content types SvelteKit's built-in CSRF check
	// covers (those are the "simple" form types a plain cross-site form can submit), so the origin is
	// checked explicitly here.
	const origin = request.headers.get('origin');
	if (origin !== null && origin !== url.origin) {
		return json({ error: 'invalid_origin' }, { status: 403 });
	}
	if (!request.body) return json({ error: 'empty_body' }, { status: 400 });

	await mkdir(config().BACKUP_TMP_DIR, { recursive: true });
	const stagedId = randomUUID();
	const path = stagedDumpPath(stagedId);

	// `request.body` is the DOM `ReadableStream` type; `Readable.fromWeb` wants Node's `stream/web`
	// variant, which is structurally identical but not the same declared type.
	await pipeline(
		Readable.fromWeb(
			request.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>
		),
		createWriteStream(path)
	);

	const handle = await open(path, 'r');
	const head = Buffer.alloc(5);
	await handle.read(head, 0, 5, 0);
	await handle.close();

	if (!isCustomFormatDump(head)) {
		await rm(path, { force: true });
		return json(
			{
				error: 'invalid_format',
				message: 'Das ist keine gültige Backup-Datei (pg_dump --format=custom erwartet).'
			},
			{ status: 415 }
		);
	}

	const { size } = await stat(path);
	return json({ stagedId, sizeBytes: size });
}

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { BACKUP_FILE_PATTERN } from '$lib/server/backup/retention';

export const prerender = false;

/**
 * Downloads an existing local backup copy (kept by the scheduled S3 backup as a safety net) — still
 * protected by the `/admin` guard in `hooks.server.ts`.
 *
 * Unlike `/admin/backup/download` (which dumps a fresh, throwaway copy and deletes it after
 * streaming), this serves an already-existing, durable local file and never deletes it.
 *
 * `params.name` is checked against `BACKUP_FILE_PATTERN` before it is ever joined into a path — the
 * pattern allows neither `/` nor `..`, which is what rules out path traversal here; string
 * concatenation is deliberately avoided.
 */
export async function GET({ params }) {
	const { name } = params;
	if (!name || !BACKUP_FILE_PATTERN.test(name)) {
		error(400, 'Ungültiger Dateiname.');
	}

	const path = join(config().BACKUP_TMP_DIR, name);
	const stats = await stat(path).catch(() => null);
	if (!stats) error(404, 'Datei nicht gefunden.');

	const nodeStream = createReadStream(path);
	return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${name}"`,
			'content-length': String(stats.size),
			'cache-control': 'no-store'
		}
	});
}

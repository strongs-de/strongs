import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { getDb } from '$lib/server/db';
import { createDownloadDump } from '$lib/server/backup/jobs';

export const prerender = false;

/**
 * A form action cannot return a raw file response (only an `ActionResult`), so the manual download is
 * a plain GET — still protected by the `/admin` guard in `hooks.server.ts`.
 */
export async function GET({ locals }) {
	const { path, fileName, sizeBytes } = await createDownloadDump(getDb(), {
		createdBy: locals.user!.id
	});

	const nodeStream = createReadStream(path);
	// The temp file dies with the response; nothing else reads it.
	nodeStream.on('close', () => void rm(path, { force: true }));

	return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${fileName}"`,
			'content-length': String(sizeBytes),
			'cache-control': 'no-store'
		}
	});
}

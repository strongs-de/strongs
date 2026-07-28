import { getDb } from '$lib/server/db';
import { listBibles } from '$lib/server/repositories/resources';
import { MAX_COLUMNS, resolveColumns, writeColumns } from '$lib/server/columns';
import { updateReaderColumns } from '$lib/server/repositories/users';
import { readFontScale, writeFontScale } from '$lib/server/reader-preferences';

/**
 * Data every page needs: the available translations and the reader's column selection.
 *
 * Resources are cached in the process, so this costs no query on most requests.
 */
export async function load({ cookies, locals }) {
	const db = getDb();
	const bibles = await listBibles(db);
	const columns = resolveColumns(cookies, bibles, locals.user?.readerColumns);
	if (locals.user && locals.user.readerColumns.length === 0) {
		await updateReaderColumns(db, locals.user.id, columns);
	}
	// Keep the device fallback aligned with the account so signing out does not reshuffle the reader.
	writeColumns(cookies, columns);
	const readerFontScale = readFontScale(cookies, locals.user?.readerFontScale);
	writeFontScale(cookies, readerFontScale);

	return {
		bibles,
		columns,
		readerFontScale,
		// The limit lives in $lib/server, so the reader cannot import it to decide whether to offer a
		// further column.
		maxColumns: MAX_COLUMNS,
		user: locals.user
	};
}

import { getDb } from '$lib/server/db';
import { listBibles } from '$lib/server/repositories/resources';
import { MAX_COLUMNS, readColumns } from '$lib/server/columns';

/**
 * Data every page needs: the available translations and the reader's column selection.
 *
 * Resources are cached in the process, so this costs no query on most requests.
 */
export async function load({ cookies, locals }) {
	const db = getDb();
	const bibles = await listBibles(db);

	return {
		bibles,
		columns: readColumns(cookies, bibles),
		// The limit lives in $lib/server, so the reader cannot import it to decide whether to offer a
		// further column.
		maxColumns: MAX_COLUMNS,
		user: locals.user
	};
}

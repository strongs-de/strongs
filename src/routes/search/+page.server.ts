import { redirect } from '@sveltejs/kit';
import { parseReference, referencePath } from '$lib/bible/reference';
import { normalizeStrongId } from '$lib/bible/strong';
import { getDb } from '$lib/server/db';
import { readColumns } from '$lib/server/columns';
import { listBibles } from '$lib/server/repositories/resources';
import { search } from '$lib/server/repositories/search';

/**
 * Search results.
 *
 * An input that turns out to be a reference or a Strong's number is redirected rather than searched,
 * so pasting "Joh 3,16" into the search box lands on the chapter — the behaviour of the old catch-all
 * view, now in one place.
 */
export async function load({ url, cookies, setHeaders }) {
	const query = (url.searchParams.get('q') ?? '').trim();
	const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1;

	if (!query) {
		return { query: '', results: null, columns: [] };
	}

	const strong = normalizeStrongId(query);
	if (strong) redirect(303, `/${strong}`);

	const reference = parseReference(query);
	if (reference) redirect(303, referencePath(reference));

	const db = getDb();
	const bibles = await listBibles(db);
	const columnIds = readColumns(cookies, bibles);
	const byId = new Map(bibles.map((bible) => [bible.id, bible]));

	const results = await search(db, query, { resourceIds: columnIds, page });

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=600' });

	return {
		query,
		results,
		title: query,
		columns: columnIds.flatMap((id) => {
			const resource = byId.get(id);
			return resource ? [resource] : [];
		})
	};
}

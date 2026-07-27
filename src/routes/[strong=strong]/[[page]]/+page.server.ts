import { error, redirect } from '@sveltejs/kit';
import { normalizeStrongId, otherLanguageId } from '$lib/bible/strong';
import { getDb } from '$lib/server/db';
import { listBibles } from '$lib/server/repositories/resources';
import {
	loadStrongEntry,
	loadStrongGlosses,
	loadStrongOccurrences,
	loadStrongStatistics,
	pickStatisticsResource
} from '$lib/server/repositories/strong';

/**
 * Full-page list of every verse containing a Strong's number: `/G26` and `/G26/2`.
 *
 * The same URLs the previous site used, including the page suffix, so old links and search results
 * keep working. Unlike the sidebar this is server-rendered, because it is a page people link to and
 * search engines index.
 */
export async function load({ params, setHeaders }) {
	const strong = normalizeStrongId(params.strong);
	if (!strong) error(404, 'Unbekannte Strong-Nummer');

	// Normalise padded or lower-case spellings to one canonical URL.
	if (strong !== params.strong) {
		redirect(301, params.page ? `/${strong}/${params.page}` : `/${strong}`);
	}

	const page = params.page ? Number.parseInt(params.page, 10) : 1;
	if (!Number.isInteger(page) || page < 1) error(404, 'Ungültige Seite');

	const db = getDb();
	const bibles = await listBibles(db);
	const columns = bibles.map((bible) => bible.id);
	const statisticsResource = await pickStatisticsResource(db, columns);

	if (!statisticsResource) {
		error(503, 'Es ist noch keine Übersetzung mit Strong-Nummern importiert.');
	}

	const [entry, statistics, glosses, occurrences] = await Promise.all([
		loadStrongEntry(db, strong),
		loadStrongStatistics(db, strong, statisticsResource),
		loadStrongGlosses(db, strong, statisticsResource, 20),
		loadStrongOccurrences(db, strong, statisticsResource, { page, pageSize: 30 })
	]);

	if (occurrences.total === 0 && !entry) {
		error(404, {
			message: 'Diese Strong-Nummer existiert nicht.',
			// Offered as a suggestion, the way the old error page did.
			alternative: otherLanguageId(strong)
		});
	}

	if (page > occurrences.pageCount) redirect(302, `/${strong}`);

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' });

	const resource = bibles.find((bible) => bible.id === statisticsResource);

	return {
		strong,
		entry: entry ?? null,
		statistics,
		glosses,
		occurrences,
		title: strong,
		resource: resource ? { id: resource.id, abbrev: resource.abbrev } : null
	};
}

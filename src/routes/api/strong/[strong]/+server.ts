import { error, json } from '@sveltejs/kit';
import { normalizeStrongId, otherLanguageId } from '$lib/bible/strong';
import { parseMorphology } from '$lib/bible/morphology';
import { parseReference } from '$lib/bible/reference';
import { getDb } from '$lib/server/db';
import {
	loadOriginalWord,
	loadStrongEntry,
	loadStrongGlosses,
	loadStrongOccurrences,
	loadStrongStatistics,
	pickStatisticsResource
} from '$lib/server/repositories/strong';

/**
 * Study sidebar data for a Strong's number.
 *
 * Query parameters:
 *   ref        the verse the word was clicked in, so the original form and morphology can be shown
 *   resources  the reader's selected translations, comma separated, for the rendering statistics
 *   page       page of the occurrence list
 */
export async function GET({ params, url, setHeaders }) {
	const strong = normalizeStrongId(params.strong);
	if (!strong) error(404, 'Unbekannte Strong-Nummer');

	const db = getDb();
	const resourceIds = (url.searchParams.get('resources') ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const statisticsResource = await pickStatisticsResource(db, resourceIds);
	const reference = parseReference(url.searchParams.get('ref') ?? '');
	const page = Number(url.searchParams.get('page') ?? '1') || 1;

	const [entry, statistics, glosses, occurrences, original] = await Promise.all([
		loadStrongEntry(db, strong),
		statisticsResource
			? loadStrongStatistics(db, strong, statisticsResource)
			: Promise.resolve({ occurrences: 0, verseCount: 0 }),
		statisticsResource ? loadStrongGlosses(db, strong, statisticsResource) : Promise.resolve([]),
		statisticsResource
			? loadStrongOccurrences(db, strong, statisticsResource, { page })
			: Promise.resolve({ occurrences: [], total: 0, page: 1, pageCount: 1 }),
		reference?.verse !== undefined
			? loadOriginalWord(db, {
					strong,
					book: reference.book,
					chapter: reference.chapter,
					verse: reference.verse
				})
			: Promise.resolve(undefined)
	]);

	// Dictionary content is immutable between imports, so it is worth caching.
	setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=3600' });

	return json({
		strong,
		found: entry !== undefined,
		entry: entry ?? null,
		/** Offered when the number does not exist, as the old error page did. */
		alternative: entry ? null : otherLanguageId(strong),
		statistics,
		glosses,
		occurrences,
		original: original ?? null,
		morphology: parseMorphology(original?.morph ?? ''),
		statisticsResource: statisticsResource ?? null
	});
}

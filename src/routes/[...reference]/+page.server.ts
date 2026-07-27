import { error, fail, redirect } from '@sveltejs/kit';
import { bookById } from '$lib/bible/books';
import { bookName, bookShortName } from '$lib/bible/book-names';
import {
	formatReference,
	nextChapter,
	parseReference,
	previousChapter,
	referencePath
} from '$lib/bible/reference';
import { normalizeStrongId } from '$lib/bible/strong';
import { getDb } from '$lib/server/db';
import { addColumn, readColumns, removeColumn, setColumn, writeColumns } from '$lib/server/columns';
import { loadChapter } from '$lib/server/repositories/chapter';
import { bookCoverage, chapterCount, listBibles } from '$lib/server/repositories/resources';
import {
	addVerseToList,
	findVerseList,
	listVerseLists,
	markedVerses
} from '$lib/server/repositories/verse-lists';

/**
 * The reader, and the resolver for everything that is not a named route.
 *
 * Precedence follows the previous site so old links keep working, but in one place instead of eight
 * competing URL patterns:
 *
 *   1. a Strong's number  → /G26
 *   2. a verse reference  → /Joh3,16
 *   3. anything else      → the search page
 */
export async function load({ params, cookies, url, setHeaders, locals }) {
	const raw = decodeURIComponent(params.reference ?? '').replace(/\/+$/, '');

	// Legacy paths from the previous site: /async/Joh3 and /Joh3/trans/0_2/ variants.
	const cleaned = raw.replace(/^async\//, '').replace(/\/?trans\/\d+_\d+$/, '');
	if (cleaned !== raw) redirect(301, `/${cleaned}${url.search}`);

	const input = cleaned.trim();
	if (!input) redirect(307, defaultLocation(cookies));

	// Legacy paged search URLs: /Liebe/2/ meant page two of a search for "Liebe".
	const paged = /^(.+)\/(\d{1,4})$/.exec(input);
	if (paged && !parseReference(input)) {
		const [, term, pageNumber] = paged;
		redirect(301, `/search?q=${encodeURIComponent(term!)}&page=${pageNumber}`);
	}

	const strong = normalizeStrongId(input);
	if (strong) redirect(301, `/${strong}`);

	const reference = parseReference(input);
	if (!reference) {
		// Not a reference, so treat it as a search — the behaviour of the old catch-all view.
		redirect(303, `/search?q=${encodeURIComponent(input)}`);
	}

	const book = bookById(reference.book);
	if (!book) error(404, 'Unbekanntes Buch');

	const db = getDb();
	const bibles = await listBibles(db);
	if (bibles.length === 0) {
		error(503, 'Es ist noch keine Bibelübersetzung importiert.');
	}

	const columns = readColumns(cookies, bibles);

	// Clamp the chapter to what the selected translations actually have, then redirect so the URL and
	// the content agree. The old code silently rendered the next book instead.
	const available = await chapterCount(db, columns, reference.book);
	const maxChapter = Math.max(available, 1);
	if (reference.chapter > maxChapter) {
		const following = nextChapter(reference.book, maxChapter);
		redirect(
			302,
			following ? referencePath(following) : referencePath({ ...reference, chapter: maxChapter })
		);
	}

	const chapter = await loadChapter(db, {
		resourceIds: columns,
		book: reference.book,
		chapter: reference.chapter
	});

	const coverage = await bookCoverage(db, columns);
	const byId = new Map(bibles.map((resource) => [resource.id, resource]));

	// Verse lists, so a signed-in reader can add a verse without leaving the chapter. The most recently
	// used list is offered first, which is the one they are working in.
	const lists = locals.user ? await listVerseLists(db, locals.user.id) : [];
	const marked =
		lists[0] !== undefined
			? await markedVerses(db, lists[0].id, reference.book, reference.chapter)
			: new Set<number>();

	// Public scripture text is the same for everyone; a signed-in reader's page is not.
	setHeaders({
		'cache-control': locals.user ? 'private, no-store' : 'public, max-age=0, s-maxage=3600'
	});

	rememberLocation(cookies, reference);

	return {
		reference,
		title: formatReference(reference),
		fullTitle: `${bookName(reference.book)} ${reference.chapter}`,
		shortBookName: bookShortName(reference.book),
		chapter: {
			...chapter,
			// Maps do not survive serialisation to the browser.
			headings: [...chapter.headings.entries()]
		},
		columns: columns.map((id, index) => {
			const resource = byId.get(id)!;
			return {
				index,
				resource,
				/** False when this translation does not contain the current book at all. */
				covers: coverage.get(id)?.has(reference.book) ?? false
			};
		}),
		navigation: {
			previous: previousChapter(reference.book, reference.chapter),
			next: nextChapter(reference.book, reference.chapter),
			maxChapter
		},
		lists: lists.map((list) => ({ id: list.id, title: list.title })),
		markedVerses: [...marked]
	};
}

/**
 * Column changes are form actions rather than links, so they work without JavaScript and the
 * selection is stored where server rendering can see it.
 */
export const actions = {
	setColumn: async ({ request, cookies }) => {
		const form = await request.formData();
		const index = Number(form.get('index'));
		const resource = String(form.get('resource') ?? '');

		const bibles = await listBibles(getDb());
		if (!Number.isInteger(index) || !bibles.some((bible) => bible.id === resource)) {
			return { success: false };
		}

		writeColumns(cookies, setColumn(readColumns(cookies, bibles), index, resource));
		return { success: true };
	},

	addColumn: async ({ cookies }) => {
		const bibles = await listBibles(getDb());
		writeColumns(cookies, addColumn(readColumns(cookies, bibles), bibles));
		return { success: true };
	},

	removeColumn: async ({ request, cookies }) => {
		const form = await request.formData();
		const index = Number(form.get('index'));
		if (!Number.isInteger(index)) return { success: false };

		const bibles = await listBibles(getDb());
		writeColumns(cookies, removeColumn(readColumns(cookies, bibles), index));
		return { success: true };
	},

	/** Adds the verse to a list straight from the reader, which is how notes get started. */
	addToList: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const listId = String(form.get('listId') ?? '');
		const reference = parseReference(String(form.get('reference') ?? ''));
		if (!reference?.verse) return fail(400, { error: 'reference' });

		const db = getDb();
		const list = await findVerseList(db, { id: listId, userId: locals.user.id });
		if (!list) return fail(404, { error: 'list' });

		await addVerseToList(db, list.id, {
			book: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		});

		return { added: true };
	}
};

const LOCATION_COOKIE = 'location';

/** Where `/` sends a returning visitor: the last chapter they read, or John 1. */
function defaultLocation(cookies: Parameters<typeof readColumns>[0]): string {
	const stored = cookies.get(LOCATION_COOKIE);
	const reference = stored ? parseReference(stored) : null;
	return referencePath(reference ?? { book: 43, chapter: 1 });
}

function rememberLocation(
	cookies: Parameters<typeof readColumns>[0],
	reference: { book: number; chapter: number }
): void {
	cookies.set(LOCATION_COOKIE, `${bookShortName(reference.book)}${reference.chapter}`, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: 'lax'
	});
}

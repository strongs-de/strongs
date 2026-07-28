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
import {
	addColumn,
	moveColumn,
	resolveColumns,
	removeColumn,
	setColumn,
	writeColumns
} from '$lib/server/columns';
import { loadChapter } from '$lib/server/repositories/chapter';
import { loadReferenceResources } from '$lib/server/repositories/reference-resources';
import { loadChapterNote, saveChapterNote } from '$lib/server/repositories/chapter-notes';
import {
	bookCoverage,
	chapterCount,
	listBibles,
	listReaderResources
} from '$lib/server/repositories/resources';
import { updateReaderColumns } from '$lib/server/repositories/users';
import { updateReaderFontScale } from '$lib/server/repositories/users';
import {
	MAX_FONT_SCALE,
	MIN_FONT_SCALE,
	readFontScale,
	writeFontScale
} from '$lib/server/reader-preferences';
import {
	addVerseToList,
	createVerseList,
	findVerseList,
	listVerseLists,
	markedVersesByList,
	removeVerseFromList
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

	// One URL per passage. "Joh 3,16", "1.Mose 1,1" and "Rev22" all name something that already has a
	// canonical spelling, so they redirect to it instead of rendering under a second address — which
	// keeps bookmarks, search results and the address bar in agreement.
	const canonical = referencePath(reference);
	if (canonical !== `/${input}`) redirect(301, `${canonical}${url.search}`);

	const db = getDb();
	const bibles = await listBibles(db);
	if (bibles.length === 0) {
		error(503, 'Es ist noch keine Bibelübersetzung importiert.');
	}

	const readerResources = await listReaderResources(db);
	const columns = resolveColumns(cookies, readerResources, locals.user?.readerColumns);
	const selectedBibles = columns.filter((id) => bibles.some((bible) => bible.id === id));

	/**
	 * Highest chapter the selected translations have for this book; 0 when none of them contains it.
	 *
	 * A chapter beyond that is clamped to the last one *of the same book* rather than jumped to the
	 * next book: the destination has to be a place that exists, or the redirect can bounce onwards and
	 * loop. When the book is absent entirely there is nothing to clamp to, so the empty state is
	 * rendered instead.
	 */
	const maxChapter = await chapterCount(
		db,
		selectedBibles.length > 0 ? selectedBibles : bibles.map((bible) => bible.id),
		reference.book
	);
	if (maxChapter > 0 && reference.chapter > maxChapter) {
		redirect(302, referencePath({ book: reference.book, chapter: maxChapter }));
	}

	const [chapter, referenceResources] = await Promise.all([
		loadChapter(db, {
			resourceIds: selectedBibles,
			book: reference.book,
			chapter: reference.chapter
		}),
		loadReferenceResources(db, {
			resourceIds: columns,
			book: reference.book,
			chapter: reference.chapter
		})
	]);
	for (const verse of referenceResources.verseNumbers) {
		if (!chapter.rows.some((row) => row.verse === verse)) {
			chapter.rows.push({ verse, cells: selectedBibles.map(() => null) });
		}
	}
	chapter.rows.sort((left, right) => left.verse - right.verse);
	chapter.empty = chapter.rows.length === 0;

	const coverage = await bookCoverage(db, selectedBibles);
	const byId = new Map(readerResources.map((resource) => [resource.id, resource]));
	const bibleCellIndex = new Map(selectedBibles.map((id, index) => [id, index]));

	// Verse lists, so a signed-in reader can add a verse without leaving the chapter. The most recently
	// used list is offered first, which is the one they are working in.
	const lists = locals.user ? await listVerseLists(db, locals.user.id) : [];
	const marked = locals.user
		? await markedVersesByList(db, locals.user.id, reference.book, reference.chapter)
		: [];
	const notesVisible = cookies.get('chapter-notes-visible') === '1';
	const chapterNote =
		locals.user && notesVisible
			? await loadChapterNote(db, locals.user.id, reference.book, reference.chapter)
			: null;

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
		referenceResources,
		columns: columns.map((id, index) => {
			const resource = byId.get(id)!;
			return {
				index,
				resource,
				bibleCellIndex: bibleCellIndex.get(id) ?? null,
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
		/** Which of this chapter's verses sit in which list, for the verse menu's check marks. */
		markedVerses: marked,
		notesVisible: locals.user !== null && notesVisible,
		chapterNote
	};
}

/**
 * Column changes are form actions rather than links, so they work without JavaScript and the
 * selection is stored where server rendering can see it.
 */
export const actions = {
	setColumn: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const index = Number(form.get('index'));
		const resource = String(form.get('resource') ?? '');

		const available = await listReaderResources(getDb());
		if (!Number.isInteger(index) || !available.some((item) => item.id === resource)) {
			return { success: false };
		}

		await commitColumns(
			cookies,
			locals.user,
			setColumn(resolveColumns(cookies, available, locals.user?.readerColumns), index, resource)
		);
		return { success: true };
	},

	addColumn: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const resource = form.get('resource');

		const bibles = await listReaderResources(getDb());
		await commitColumns(
			cookies,
			locals.user,
			addColumn(
				resolveColumns(cookies, bibles, locals.user?.readerColumns),
				bibles,
				// Absent when the button was submitted without a choice, which appends the next unused one.
				resource === null ? undefined : String(resource)
			)
		);
		return { success: true };
	},

	removeColumn: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const index = Number(form.get('index'));
		if (!Number.isInteger(index)) return { success: false };

		const bibles = await listReaderResources(getDb());
		await commitColumns(
			cookies,
			locals.user,
			removeColumn(resolveColumns(cookies, bibles, locals.user?.readerColumns), index)
		);
		return { success: true };
	},

	moveColumn: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const from = Number(form.get('from'));
		const to = Number(form.get('to'));
		const bibles = await listReaderResources(getDb());
		await commitColumns(
			cookies,
			locals.user,
			moveColumn(resolveColumns(cookies, bibles, locals.user?.readerColumns), from, to)
		);
		return { success: true };
	},

	toggleNotes: async ({ cookies, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const visible = cookies.get('chapter-notes-visible') === '1';
		cookies.set('chapter-notes-visible', visible ? '0' : '1', {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: false,
			sameSite: 'lax'
		});
		return { success: true };
	},

	saveChapterNote: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const reference = parseReference(String(form.get('reference') ?? ''));
		if (!reference) return fail(400, { error: 'reference' });
		await saveChapterNote(
			getDb(),
			locals.user.id,
			reference.book,
			reference.chapter,
			String(form.get('note') ?? '')
		);
		return { saved: true };
	},

	adjustFontSize: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const delta = Number(form.get('delta'));
		if (delta !== -5 && delta !== 5) return fail(400, { error: 'fontScale' });

		const current = readFontScale(cookies, locals.user?.readerFontScale);
		const next = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, current + delta));
		writeFontScale(cookies, next);
		if (locals.user) await updateReaderFontScale(getDb(), locals.user.id, next);
		return { success: true };
	},

	/**
	 * Adds the verse to a list straight from the reader, which is how notes get started.
	 *
	 * An empty `listId` means "a new list for this verse": the first verse a reader wants to keep is
	 * the moment they need a list, and making them go to the settings page first to create one was the
	 * reason the feature went unused.
	 */
	addToList: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const listId = String(form.get('listId') ?? '');
		const reference = parseReference(String(form.get('reference') ?? ''));
		if (!reference?.verse) return fail(400, { error: 'reference' });

		const db = getDb();
		const list = listId
			? await findVerseList(db, { id: listId, userId: locals.user.id })
			: await createVerseList(db, locals.user.id, String(form.get('title') ?? ''));
		if (!list) return fail(404, { error: 'list' });

		await addVerseToList(db, list.id, {
			book: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		});

		return { added: true, listId: list.id };
	},

	/** The other half of the verse menu: a list the verse is already in can be unticked. */
	removeFromList: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const listId = String(form.get('listId') ?? '');
		const reference = parseReference(String(form.get('reference') ?? ''));
		if (!reference?.verse) return fail(400, { error: 'reference' });

		const db = getDb();
		const list = await findVerseList(db, { id: listId, userId: locals.user.id });
		if (!list) return fail(404, { error: 'list' });

		await removeVerseFromList(db, list.id, {
			book: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		});

		return { removed: true, listId: list.id };
	}
};

const LOCATION_COOKIE = 'location';

/** Where `/` sends a returning visitor: the last chapter they read, or John 1. */
async function commitColumns(
	cookies: Parameters<typeof writeColumns>[0],
	user: App.Locals['user'],
	columns: string[]
): Promise<void> {
	writeColumns(cookies, columns);
	if (user) await updateReaderColumns(getDb(), user.id, columns);
}

function defaultLocation(cookies: Parameters<typeof writeColumns>[0]): string {
	const stored = cookies.get(LOCATION_COOKIE);
	const reference = stored ? parseReference(stored) : null;
	return referencePath(reference ?? { book: 43, chapter: 1 });
}

function rememberLocation(
	cookies: Parameters<typeof writeColumns>[0],
	reference: { book: number; chapter: number }
): void {
	cookies.set(LOCATION_COOKIE, `${bookShortName(reference.book)}${reference.chapter}`, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: 'lax'
	});
}

import { error, json } from '@sveltejs/kit';
import { bookById } from '$lib/bible/books';
import { bookName, bookShortName } from '$lib/bible/book-names';
import { nextChapter, previousChapter } from '$lib/bible/reference';
import { resolveColumns } from '$lib/server/columns';
import { getDb } from '$lib/server/db';
import { loadChapter } from '$lib/server/repositories/chapter';
import { loadChapterNote } from '$lib/server/repositories/chapter-notes';
import { loadReferenceResources } from '$lib/server/repositories/reference-resources';
import { listBibles, listReaderResources } from '$lib/server/repositories/resources';
import { loadChapterHighlights } from '$lib/server/repositories/verse-highlights';

export async function GET({ params, cookies, locals, setHeaders }) {
	const book = Number(params.book);
	const chapterNumber = Number(params.chapter);
	const definition = bookById(book);
	if (
		!definition ||
		!Number.isSafeInteger(chapterNumber) ||
		chapterNumber < 1 ||
		chapterNumber > definition.chapters
	) {
		error(404, 'Unbekanntes Kapitel');
	}

	const db = getDb();
	const [bibles, readerResources] = await Promise.all([listBibles(db), listReaderResources(db)]);
	const columnIds = resolveColumns(cookies, readerResources, locals.user?.readerColumns);
	const bibleIds = columnIds.filter((id) => bibles.some((bible) => bible.id === id));
	const notesVisible = cookies.get('chapter-notes-visible') === '1';
	const [chapter, referenceResources, chapterNote, highlights] = await Promise.all([
		loadChapter(db, { resourceIds: bibleIds, book, chapter: chapterNumber }),
		loadReferenceResources(db, {
			resourceIds: columnIds,
			book,
			chapter: chapterNumber
		}),
		locals.user && notesVisible
			? loadChapterNote(db, locals.user.id, book, chapterNumber)
			: Promise.resolve(null),
		locals.user
			? loadChapterHighlights(db, locals.user.id, book, chapterNumber)
			: Promise.resolve([])
	]);

	for (const verse of referenceResources.verseNumbers) {
		if (!chapter.rows.some((row) => row.verse === verse)) {
			chapter.rows.push({ verse, cells: bibleIds.map(() => null) });
		}
	}
	chapter.rows.sort((left, right) => left.verse - right.verse);
	chapter.empty = chapter.rows.length === 0;

	const bibleCellIndex = new Map(bibleIds.map((id, index) => [id, index]));
	setHeaders({ 'cache-control': 'private, no-store' });

	return json({
		reference: { book, chapter: chapterNumber },
		fullTitle: `${bookName(book)} ${chapterNumber}`,
		shortBookName: bookShortName(book),
		chapter: { ...chapter, headings: [...chapter.headings.entries()] },
		chapterNote,
		highlights,
		referenceResources,
		columns: columnIds.map((id) => ({
			resourceId: id,
			bibleCellIndex: bibleCellIndex.get(id) ?? null
		})),
		navigation: {
			previous: previousChapter(book, chapterNumber),
			next: nextChapter(book, chapterNumber)
		}
	});
}

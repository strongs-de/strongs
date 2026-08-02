import { json } from '@sveltejs/kit';
import { bookById } from '$lib/bible/books';
import { allBookNames } from '$lib/bible/book-names';

/** The 66-book canon this API's `book` path parameters refer to, with their chapter counts. */
export function GET({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=3600' });

	const books = allBookNames().map(({ book, names }) => ({
		id: book,
		name: names.name,
		shortName: names.short,
		testament: bookById(book)?.testament,
		chapters: bookById(book)?.chapters
	}));

	return json({ books });
}

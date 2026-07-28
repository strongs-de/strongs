import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createVerseList, listVerseLists } from '$lib/server/repositories/verse-lists';
import { listUserNotes } from '$lib/server/repositories/chapter-notes';

/**
 * The reader's own verse lists.
 *
 * Lists used to hang off the account page, which put a reading feature behind a settings page. This
 * is the entry point the header links to, and where a list is created when the reader is not in the
 * middle of a chapter.
 */
export async function load({ locals }) {
	if (!locals.user) redirect(303, '/login?redirectTo=%2Flists');

	const db = getDb();
	const [lists, notes] = await Promise.all([
		listVerseLists(db, locals.user.id),
		listUserNotes(db, locals.user.id)
	]);
	return { lists, notes };
}

export const actions = {
	createList: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const list = await createVerseList(getDb(), locals.user.id, String(form.get('title') ?? ''));
		redirect(303, `/lists/${list.id}`);
	}
};

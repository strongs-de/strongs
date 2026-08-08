import { error, fail, redirect } from '@sveltejs/kit';
import { parseReference } from '$lib/bible/reference';
import { getDb } from '$lib/server/db';
import { resolveColumns } from '$lib/server/columns';
import { listBibles } from '$lib/server/repositories/resources';
import {
	addVerseToList,
	deleteVerseList,
	findVerseList,
	loadVerseListItems,
	removeVerseFromList,
	renameVerseList,
	saveNote,
	setVerseListSharing
} from '$lib/server/repositories/verse-lists';

/**
 * A verse list with its comments.
 *
 * Every action re-checks ownership through `findVerseList({ id, userId })`, so a list id from another
 * account is simply not found.
 */
export async function load({ params, locals, cookies }) {
	if (!locals.user) redirect(303, `/login?redirectTo=${encodeURIComponent(`/lists/${params.id}`)}`);

	const db = getDb();
	const list = await findVerseList(db, { id: params.id, userId: locals.user.id });
	if (!list) error(404, 'Versliste nicht gefunden');

	const bibles = await listBibles(db);
	const primary =
		resolveColumns(cookies, bibles, locals.user.readerColumns)[0] ?? bibles[0]?.id ?? null;

	return {
		list: {
			id: list.id,
			title: list.title,
			isPublic: list.isPublic,
			slug: list.slug
		},
		items: await loadVerseListItems(db, list.id, primary),
		title: list.title
	};
}

async function ownedList(
	locals: App.Locals,
	id: string
): Promise<{ db: ReturnType<typeof getDb>; listId: string }> {
	if (!locals.user) redirect(303, '/login');
	const db = getDb();
	const list = await findVerseList(db, { id, userId: locals.user.id });
	if (!list) error(404, 'Versliste nicht gefunden');
	return { db, listId: list.id };
}

export const actions = {
	rename: async ({ params, request, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		const form = await request.formData();
		await renameVerseList(db, listId, String(form.get('title') ?? ''));
		return { saved: true };
	},

	addVerse: async ({ params, request, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		const form = await request.formData();
		const reference = parseReference(String(form.get('reference') ?? ''));

		if (!reference?.verse) return fail(400, { error: 'reference' as const });
		await addVerseToList(db, listId, {
			book: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		});
		return { saved: true };
	},

	removeVerse: async ({ params, request, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		const form = await request.formData();
		const reference = parseReference(String(form.get('reference') ?? ''));
		if (!reference?.verse) return fail(400, { error: 'reference' as const });

		await removeVerseFromList(db, listId, {
			book: reference.book,
			chapter: reference.chapter,
			verse: reference.verse
		});
		return { saved: true };
	},

	saveNote: async ({ params, request, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		const form = await request.formData();
		await saveNote(db, listId, String(form.get('itemId') ?? ''), String(form.get('note') ?? ''));
		return { saved: true };
	},

	share: async ({ params, request, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		const form = await request.formData();
		await setVerseListSharing(db, listId, form.get('isPublic') === 'true');
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		const { db, listId } = await ownedList(locals, params.id);
		await deleteVerseList(db, listId);
		redirect(303, '/account');
	}
};

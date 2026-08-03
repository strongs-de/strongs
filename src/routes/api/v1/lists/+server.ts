import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listVerseLists } from '$lib/server/repositories/verse-lists';
import { resolveApiIdentity } from '$lib/server/api/identity';
import { apiError } from '$lib/server/api/errors';

/** The caller's own verse lists — requires a session or a `personal`-scope API key. */
export async function GET({ locals }) {
	const identity = resolveApiIdentity(locals);
	if (identity.scope !== 'personal' || !identity.userId) {
		return apiError(
			403,
			'personal_scope_required',
			'Reading verse lists needs a signed-in session or a personal-scope API key.'
		);
	}

	const lists = await listVerseLists(getDb(), identity.userId);
	return json({ lists });
}

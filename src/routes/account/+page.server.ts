import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import {
	checkPasswordStrength,
	MIN_PASSWORD_LENGTH,
	verifyPassword
} from '$lib/server/auth/password';
import { destroyAllSessions, createSession } from '$lib/server/auth/session';
import {
	findUserByEmail,
	updatePassword,
	updateProfile,
	updateReaderFontScale
} from '$lib/server/repositories/users';
import { listVerseLists } from '$lib/server/repositories/verse-lists';
import {
	countApiKeys,
	createApiKey,
	listApiKeys,
	MAX_API_KEYS,
	revokeApiKey,
	type ApiKeyScope
} from '$lib/server/repositories/api-keys';
import { writeFontScale } from '$lib/server/reader-preferences';

export async function load({ locals }) {
	if (!locals.user) redirect(303, '/login?redirectTo=%2Faccount');

	// Only the count: verse lists live at /lists now, and this page just points there.
	const lists = await listVerseLists(getDb(), locals.user.id);
	const apiKeys = await listApiKeys(getDb(), locals.user.id);

	return {
		listCount: lists.length,
		readerFontScale: locals.user.readerFontScale,
		minPasswordLength: MIN_PASSWORD_LENGTH,
		apiKeys,
		maxApiKeys: MAX_API_KEYS
	};
}

export const actions = {
	profile: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		await updateProfile(getDb(), locals.user.id, String(form.get('displayName') ?? ''));
		return { saved: true };
	},

	reader: async ({ request, locals, cookies }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const scale = Number(form.get('fontScale'));
		if (!Number.isFinite(scale)) return fail(400, { readerError: true });
		const savedScale = await updateReaderFontScale(getDb(), locals.user.id, scale);
		writeFontScale(cookies, savedScale);
		return { readerSaved: true };
	},

	password: async ({ request, locals, cookies }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const current = String(form.get('currentPassword') ?? '');
		const next = String(form.get('password') ?? '');
		const repeat = String(form.get('passwordRepeat') ?? '');

		const db = getDb();
		const user = await findUserByEmail(db, locals.user.email);
		if (!user || !(await verifyPassword(user.passwordHash, current))) {
			return fail(400, { passwordError: 'current' as const });
		}
		if (next !== repeat) return fail(400, { passwordError: 'mismatch' as const });
		if (checkPasswordStrength(next)) return fail(400, { passwordError: 'weak' as const });

		await updatePassword(db, user.id, next);
		// Other devices are signed out, then this one is signed back in.
		await destroyAllSessions(db, user.id);
		await createSession(db, cookies, user.id, request.headers.get('user-agent') ?? undefined);

		return { passwordSaved: true };
	},

	createApiKey: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb();

		const form = await request.formData();
		const name = String(form.get('name') ?? '')
			.trim()
			.slice(0, 100);
		const scope = form.get('scope') === 'personal' ? 'personal' : ('public' as ApiKeyScope);
		if (!name) return fail(400, { apiKeyError: 'name' as const });

		const existing = await countApiKeys(db, locals.user.id);
		if (existing >= MAX_API_KEYS) return fail(400, { apiKeyError: 'limit' as const });

		const { apiKey, key } = await createApiKey(db, locals.user.id, name, scope);
		return { createdApiKey: { id: apiKey.id, key } };
	},

	revokeApiKey: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (id) await revokeApiKey(getDb(), locals.user.id, id);
		return { apiKeyRevoked: true };
	}
};

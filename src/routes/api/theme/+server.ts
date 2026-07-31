import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { writeTheme } from '$lib/server/reader-preferences';
import { updateTheme } from '$lib/server/repositories/users';

/**
 * Persists a colour-scheme choice: this device's cookie always, and — when signed in — the account
 * too, so a *new* device has something to seed from. The client already applied the theme itself
 * before this request goes out; this only makes it stick.
 */
export async function POST({ request, cookies, locals }) {
	const body = await request.json().catch(() => null);
	const theme = body && typeof body === 'object' ? body.theme : undefined;
	if (theme !== 'light' && theme !== 'dark') {
		return json({ success: false }, { status: 400 });
	}

	writeTheme(cookies, theme);
	if (locals.user) await updateTheme(getDb(), locals.user.id, theme);

	return json({ success: true });
}

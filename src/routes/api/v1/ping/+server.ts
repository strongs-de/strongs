import { json } from '@sveltejs/kit';

/**
 * Diagnostic endpoint: proves the domain-gate/rate-limit pipeline in `hooks.server.ts` end to end,
 * ahead of the real endpoints landing under `/api/v1`. Reports how the request authenticated —
 * `trusted` (the strongs.de frontend, or same-origin) or `key` with the presented key's scope —
 * without requiring any content to exist.
 */
export function GET({ locals }) {
	const auth = locals.apiAuth;
	return json({
		ok: true,
		auth: auth?.kind === 'key' ? { kind: 'key', scope: auth.apiKey.scope } : { kind: 'trusted' }
	});
}

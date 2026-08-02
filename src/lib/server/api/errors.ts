import { json } from '@sveltejs/kit';

/**
 * One JSON error shape for every `/api/v1` endpoint, in English — the docs at `/api` are English,
 * and a developer integrating against this API should not need to read German to handle an error.
 */
export function apiError(status: number, code: string, message: string): Response {
	return json({ error: { code, message } }, { status });
}

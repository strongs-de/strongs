import { expect, test } from '@playwright/test';

/**
 * The public API's domain gate and rate limiting (`hooks.server.ts` + `lib/server/api/`), exercised
 * against the `/api/v1/ping` diagnostic endpoint — the real endpoints land in a later PR.
 */

function uniqueEmail(): string {
	return `e2e-api-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

async function registerAndCreateKey(
	page: import('@playwright/test').Page,
	scope: 'public' | 'personal'
): Promise<string> {
	await page.goto('/register');
	await page.getByLabel('E-Mail-Adresse').fill(uniqueEmail());
	await page.getByLabel('Anzeigename').fill('E2E');
	await page.getByLabel('Passwort', { exact: true }).fill('ein-sicheres-passwort');
	await page.getByLabel('Passwort wiederholen').fill('ein-sicheres-passwort');
	await page.getByRole('button', { name: 'Konto erstellen' }).click();
	await expect(page).toHaveURL(/\/account$/);

	await page.getByLabel('Name', { exact: true }).fill(`E2E ${scope}`);
	if (scope === 'personal') {
		await page.getByRole('radio', { name: /Auch persönliche Daten/ }).check();
	}
	await page.getByRole('button', { name: 'Schlüssel erstellen' }).click();

	const shown = await page.locator('code').filter({ hasText: 'sk_strongs_' }).textContent();
	return shown!.trim();
}

test('a request with no origin and no API key is refused', async ({ request }) => {
	const response = await request.get('/api/v1/ping');
	expect(response.status()).toBe(401);
	expect((await response.json()).error.code).toBe('missing_api_key');
});

test('an invalid API key is refused', async ({ request }) => {
	const response = await request.get('/api/v1/ping', {
		headers: { authorization: 'Bearer sk_strongs_does-not-exist' }
	});
	expect(response.status()).toBe(401);
	expect((await response.json()).error.code).toBe('invalid_api_key');
});

test('a same-origin browser fetch is trusted without a key', async ({ page }) => {
	await page.goto('/Joh3');
	const body = await page.evaluate(() => fetch('/api/v1/ping').then((response) => response.json()));
	expect(body).toEqual({ ok: true, auth: { kind: 'trusted' } });
});

test('a valid API key authenticates and reports its own scope', async ({ page, request }) => {
	const key = await registerAndCreateKey(page, 'personal');

	const response = await request.get('/api/v1/ping', {
		headers: { authorization: `Bearer ${key}` }
	});
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ ok: true, auth: { kind: 'key', scope: 'personal' } });
});

test('exceeding the per-key rate limit returns 429 with Retry-After', async ({ page, request }) => {
	const key = await registerAndCreateKey(page, 'public');
	const headers = { authorization: `Bearer ${key}` };

	// Matches KEYED_LIMIT in src/lib/server/api/rate-limit.ts.
	const limit = 120;
	for (let i = 0; i < limit; i++) {
		const response = await request.get('/api/v1/ping', { headers });
		expect(response.status()).toBe(200);
	}

	const over = await request.get('/api/v1/ping', { headers });
	expect(over.status()).toBe(429);
	expect(over.headers()['retry-after']).toBeTruthy();
	expect((await over.json()).error.code).toBe('rate_limited');
});

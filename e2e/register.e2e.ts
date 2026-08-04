import { expect, test } from '@playwright/test';
import { lastMailLinkTo } from './lib/mail-outbox.ts';

/**
 * Registration: activation by mail, and the honeypot that guards it.
 *
 * `account.e2e.ts` and `admin-backup.e2e.ts` have their own `register()` helper that already follows
 * the confirmation link, so every other suite can keep assuming "registered" means "signed in". These
 * tests are the ones that actually exercise the steps in between.
 */

function uniqueEmail(): string {
	return `e2e-register-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

const PASSWORD = 'ein-sicheres-passwort';

async function fillRegisterForm(
	page: import('@playwright/test').Page,
	email: string
): Promise<void> {
	await page.goto('/register');
	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Anzeigename').fill('E2E');
	await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
	await page.getByLabel('Passwort wiederholen').fill(PASSWORD);
}

async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
	// The seed script creates this account.
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill('admin@example.com');
	await page.getByLabel('Passwort').fill('seed-admin-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();
}

test('registering does not sign in immediately', async ({ page }) => {
	const email = uniqueEmail();
	await fillRegisterForm(page, email);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();

	await expect(page).toHaveURL(/\/register\/check-email$/);
	await expect(
		page.getByRole('heading', { name: 'Bitte bestätige deine E-Mail-Adresse' })
	).toBeVisible();

	// No session was created, so the account area bounces straight to the login page.
	await page.goto('/account');
	await expect(page).toHaveURL(/\/login/);
});

test('confirming the activation link signs the account in', async ({ page }) => {
	const email = uniqueEmail();
	await fillRegisterForm(page, email);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();
	await expect(page).toHaveURL(/\/register\/check-email$/);

	await page.goto(await lastMailLinkTo(email));
	await expect(page.getByRole('heading', { name: 'Konto aktivieren' })).toBeVisible();

	await page.getByRole('button', { name: 'Konto aktivieren' }).click();
	await expect(page).toHaveURL(/\/account$/);
});

test('an already-used activation link is rejected the second time', async ({ page }) => {
	const email = uniqueEmail();
	await fillRegisterForm(page, email);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();

	const link = await lastMailLinkTo(email);
	await page.goto(link);
	await page.getByRole('button', { name: 'Konto aktivieren' }).click();
	await expect(page).toHaveURL(/\/account$/);

	await page.getByRole('button', { name: 'Abmelden' }).click();
	await page.goto(link);
	await expect(page.getByRole('alert')).toContainText('abgelaufen');
});

test('an unconfirmed account cannot sign in, but a fresh link works', async ({ page }) => {
	const email = uniqueEmail();
	await fillRegisterForm(page, email);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();
	await expect(page).toHaveURL(/\/register\/check-email$/);

	// The credentials are correct, but the account was never activated.
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Passwort').fill(PASSWORD);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('alert')).toContainText('bestätige');

	await page.getByRole('button', { name: 'Aktivierungslink erneut senden' }).click();
	await expect(page.getByText('ist eine neue E-Mail unterwegs')).toBeVisible();

	// The resend mail is the newest one for this address, so this picks it up rather than the
	// original registration mail.
	await page.goto(await lastMailLinkTo(email));
	await page.getByRole('button', { name: 'Konto aktivieren' }).click();
	await expect(page).toHaveURL(/\/account$/);

	await page.getByRole('button', { name: 'Abmelden' }).click();
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Passwort').fill(PASSWORD);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/account$/);
});

test('a filled honeypot field is answered as success but creates no account', async ({ page }) => {
	const email = uniqueEmail();
	await fillRegisterForm(page, email);
	// A real visitor can neither see nor tab to this field; a script that fills every input in the
	// form does not know that.
	await page.locator('input[name="company"]').fill('Acme Inc.');
	await page.getByRole('button', { name: 'Konto erstellen' }).click();

	// The bot is told it worked, exactly like a real registration.
	await expect(page).toHaveURL(/\/register\/check-email$/);

	await loginAsAdmin(page);
	await page.goto('/admin/users');
	await expect(page.getByText(email)).toHaveCount(0);
});

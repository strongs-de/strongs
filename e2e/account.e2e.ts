import { expect, test } from '@playwright/test';

/**
 * Accounts, verse lists and notes, and the admin area.
 *
 * Each test registers its own account so they can run in any order and in parallel without competing
 * for the same rows.
 */

function uniqueEmail(): string {
	return `e2e-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

const PASSWORD = 'ein-sicheres-passwort';

async function register(page: import('@playwright/test').Page, email: string): Promise<void> {
	await page.goto('/register');
	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Anzeigename').fill('E2E');
	await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
	await page.getByLabel('Passwort wiederholen').fill(PASSWORD);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();
	await expect(page).toHaveURL(/\/account$/);
}

test('registration, sign out and sign in again', async ({ page }) => {
	const email = uniqueEmail();
	await register(page, email);
	await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();

	await page.getByRole('button', { name: 'Abmelden' }).click();
	// Signing out lands on the reader, so the check is that the session is gone, not the address.
	await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();

	await page.goto('/account');
	await expect(page).toHaveURL(/\/login/);

	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Passwort').fill(PASSWORD);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/account$/);
});

test('a wrong password is refused', async ({ page }) => {
	const email = uniqueEmail();
	await register(page, email);
	await page.getByRole('button', { name: 'Abmelden' }).click();

	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Passwort').fill('falsches-passwort');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	await expect(page.getByRole('alert')).toContainText('falsch');
});

test('a verse list keeps its verses and notes', async ({ page }) => {
	await register(page, uniqueEmail());

	// Create a list. Lists live in the main navigation now, not on the settings page.
	await page.goto('/lists');
	await page.getByPlaceholder('Neue Versliste').fill('Meine Studienliste');
	await page.getByRole('button', { name: 'Neue Versliste' }).click();
	await expect(page).toHaveURL(/\/lists\//);

	// Add a verse by reference.
	await page.getByPlaceholder('Joh 3,16').fill('Joh 3,16');
	await page.getByRole('button', { name: 'Zur Versliste hinzufügen' }).click();
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
	await expect(page.getByText('Denn also hat Gott', { exact: false })).toBeVisible();

	// Write a note and save it. The click is scoped to the note's own form, since the rename form has a
	// button with the same label.
	const noteForm = page.locator('form[action="?/saveNote"]');
	const editor = noteForm.getByRole('textbox', { name: 'Notiz' });
	await editor.click();
	await editor.fill('Der bekannteste Vers');
	await noteForm.getByRole('button', { name: 'Speichern' }).click();

	// The note survives a reload.
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Notiz' })).toContainText('Der bekannteste Vers');
});

test('a shared list is readable without an account', async ({ page, browser }) => {
	await register(page, uniqueEmail());

	await page.goto('/lists');
	await page.getByPlaceholder('Neue Versliste').fill('Geteilte Liste');
	await page.getByRole('button', { name: 'Neue Versliste' }).click();
	await page.getByPlaceholder('Joh 3,16').fill('1Mo 1,1');
	await page.getByRole('button', { name: 'Zur Versliste hinzufügen' }).click();

	await page.getByRole('button', { name: 'Teilen' }).click();
	const shareUrl = await page.locator('input[readonly]').inputValue();
	expect(shareUrl).toContain('/l/');

	// A fresh browser context has no session.
	const anonymous = await browser.newContext();
	const anonymousPage = await anonymous.newPage();
	await anonymousPage.goto(shareUrl);
	await expect(anonymousPage.getByRole('heading', { name: 'Geteilte Liste' })).toBeVisible();
	await expect(anonymousPage.getByRole('link', { name: '1.Mose 1,1' })).toBeVisible();
	await anonymous.close();
});

test('the verse menu creates a list and adds the verse in one step', async ({ page }) => {
	await register(page, uniqueEmail());

	// The point of the menu: no list has to exist first.
	await page.goto('/Joh3');
	await page.locator('#Joh3_16').getByRole('link', { name: 'Vers Johannes 3,16' }).click();
	await page.getByRole('menuitem', { name: 'Neue Liste mit diesem Vers' }).click();

	await page.goto('/lists');
	await expect(page.getByRole('link', { name: /Johannes 3,16/ })).toBeVisible();
	await page.getByRole('link', { name: /Johannes 3,16/ }).click();
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
});

test('the verse menu ticks and unticks an existing list', async ({ page }) => {
	await register(page, uniqueEmail());

	await page.goto('/lists');
	await page.getByPlaceholder('Neue Versliste').fill('Merkverse');
	await page.getByRole('button', { name: 'Neue Versliste' }).click();

	await page.goto('/Joh3');
	const verse = page.locator('#Joh3_16').getByRole('link', { name: 'Vers Johannes 3,16' });

	await verse.click();
	await page.getByRole('menuitem', { name: 'Merkverse' }).click();
	await expect(page.locator('#Joh3_16 .verse-number.in-list')).toHaveCount(1);

	// Reopening shows it ticked, and clicking again takes the verse back out.
	await page.reload();
	await verse.click();
	await page.getByRole('menuitem', { name: 'Merkverse' }).click();
	await page.reload();
	await expect(page.locator('#Joh3_16 .verse-number.in-list')).toHaveCount(0);
});

test('the verse menu offers signing in rather than a list', async ({ page }) => {
	await page.goto('/Joh3');
	await page.locator('#Joh3_16').getByRole('link', { name: 'Vers Johannes 3,16' }).click();

	await expect(page.getByRole('menuitem', { name: 'Vers kopieren' })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: 'Zum Speichern anmelden' })).toBeVisible();
});

test('the admin area is hidden from a normal account', async ({ page }) => {
	await register(page, uniqueEmail());

	const response = await page.goto('/admin');
	expect(response?.status()).toBe(404);
});

test('an admin can see and edit resources', async ({ page }) => {
	// The seed script creates this account.
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill('admin@example.com');
	await page.getByLabel('Passwort').fill('seed-admin-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	await page.goto('/admin');
	await expect(page.getByRole('heading', { name: 'Übersicht' })).toBeVisible();
	await expect(page.getByText('Bibelübersetzung')).toBeVisible();

	await page.goto('/admin/resources');
	await expect(page.getByText('SEEDDE')).toBeVisible();

	// Editing the column title takes effect in the reader.
	const abbrev = page.locator('#abbrev-SEEDDE');
	await abbrev.fill('Umbenannt');
	await page
		.locator('form[action="?/save"]')
		.filter({ has: abbrev })
		.getByRole('button', { name: 'Speichern' })
		.click();

	await page.goto('/Joh3');
	await expect(page.locator('#column-0')).toContainText('Umbenannt');

	// Put it back, so the test can run again.
	await page.goto('/admin/resources');
	await page.locator('#abbrev-SEEDDE').fill('Testübersetzung');
	await page
		.locator('form[action="?/save"]')
		.filter({ has: page.locator('#abbrev-SEEDDE') })
		.getByRole('button', { name: 'Speichern' })
		.click();
});

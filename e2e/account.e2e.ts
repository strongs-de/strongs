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

/** Verse lists live under their own section of the settings dashboard now, not a page of their own. */
async function gotoLists(page: import('@playwright/test').Page): Promise<void> {
	await page.goto('/account');
	await page.getByRole('button', { name: 'Verslisten & Notizen' }).click();
}

test('registration, sign out and sign in again', async ({ page }) => {
	const email = uniqueEmail();
	await register(page, email);
	await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();

	await page.getByRole('button', { name: 'Abmelden' }).click();
	// Signing out lands on the reader, so the check is that the session is gone, not the address.
	// Anmelden lives in the consolidated user menu now.
	await page.getByRole('button', { name: 'Konto-Menü' }).click();
	await expect(page.getByRole('menuitem', { name: 'Anmelden' })).toBeVisible();

	await page.goto('/account');
	await expect(page).toHaveURL(/\/login/);

	await page.getByLabel('E-Mail-Adresse').fill(email);
	await page.getByLabel('Passwort').fill(PASSWORD);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/account$/);
});

test('an API key can be created, shown once and revoked', async ({ page }) => {
	await register(page, uniqueEmail());

	await page.getByLabel('Name', { exact: true }).fill('Meine App');
	await page.getByRole('radio', { name: /Auch persönliche Daten/ }).check();
	await page.getByRole('button', { name: 'Schlüssel erstellen' }).click();

	await expect(page.getByText('Schlüssel erstellt')).toBeVisible();
	const shownKey = (
		await page.locator('code').filter({ hasText: 'sk_strongs_' }).textContent()
	)?.trim();
	expect(shownKey).toMatch(/^sk_strongs_/);

	const keyItem = page.locator('li', { hasText: 'Meine App' });
	await expect(keyItem).toContainText('Auch persönliche Daten');

	// The raw key is never shown again after a reload — only its non-secret prefix.
	await page.reload();
	await expect(page.getByText('Schlüssel erstellt')).not.toBeVisible();
	await expect(page.locator('li', { hasText: 'Meine App' })).toContainText(shownKey!.slice(0, 19));

	await page.getByRole('button', { name: 'Widerrufen' }).click();
	await expect(page.locator('li', { hasText: 'Meine App' })).toContainText('Widerrufen am');
});

test('a reader gets a default highlight palette, can rename a colour and add one', async ({
	page
}) => {
	await register(page, uniqueEmail());

	// Versmarkierungen live under the "Darstellung" section of the settings dashboard now.
	await page.getByRole('button', { name: 'Darstellung' }).click();

	const rows = page.locator('form[action="?/renameHighlightStyle"]');
	await expect(rows).toHaveCount(10);

	await rows.first().getByRole('textbox').fill('Verheißungen');
	await rows.first().getByRole('button', { name: 'Speichern' }).click();

	// The name survives a reload — the whole point of naming a colour is to keep the label.
	await page.reload();
	await page.getByRole('button', { name: 'Darstellung' }).click();
	await expect(rows.first().getByRole('textbox')).toHaveValue('Verheißungen');

	const addForm = page.locator('form[action="?/addHighlightStyle"]');
	await addForm.locator('input[name="color"]').fill('#123456');
	await addForm.locator('input[name="name"]').fill('Meine Farbe');
	await addForm.getByRole('button', { name: 'Farbe hinzufügen' }).click();

	await expect(rows).toHaveCount(11);
	await expect(rows.last().getByRole('textbox')).toHaveValue('Meine Farbe');
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

	// Create a list from the settings dashboard's "Verslisten & Notizen" section.
	await gotoLists(page);
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

test('chapter notes follow the visible chapter while scrolling', async ({ page }) => {
	await register(page, uniqueEmail());

	// Chapter 2's note is seeded through the action directly rather than through the editor: flowing
	// text (the only layout now) keeps every loaded chapter's note editor in the DOM but hides all but
	// the current one, and chapter 2 here is short enough that the reader's own eager next-chapter
	// preload can flip the visible chapter away from it before the editor is reachable.
	const seedResponse = await page.request.post('/1Mo2?/saveChapterNote', {
		headers: { origin: 'http://localhost:4173' },
		form: { reference: '1Mo2', note: 'Notiz für Kapitel zwei' }
	});
	expect(seedResponse.ok()).toBeTruthy();
	await page
		.context()
		.addCookies([{ name: 'chapter-notes-visible', value: '1', url: 'http://localhost:4173' }]);

	await page.goto('/1Mo1');
	const firstTextColumn = page.locator('.flow-column').first();
	const visibleNote = page.locator('.flow-note > div:not(.hidden-note)');
	await expect(visibleNote.locator('.note-chapter-title')).toHaveText('1.Mose 1');
	await expect(page.locator('[data-chapter-key="1:2"]').first()).toBeAttached();
	await page.waitForTimeout(120);

	// A single scroll dispatch can land inside the app's own ~80ms window for suppressing scroll
	// events it caused itself (see `suppressProgrammaticFlowScroll` in the reader), which the chapter
	// preload triggered by switching to flowing text can still be running through this soon after.
	// Polling — scroll, dispatch, check — rather than doing it once retries past that window instead
	// of racing it.
	//
	// The target offset (4px, well inside the reader's own 12px "close enough to the top" threshold)
	// is deliberately not 12 itself: `scrollTop` rounds to the nearest layout pixel, so aiming exactly
	// at the boundary can converge one pixel short of it forever instead of crossing it.
	await expect
		.poll(() =>
			firstTextColumn.evaluate((element) => {
				const chapter = element.querySelector<HTMLElement>('[data-chapter-key="1:2"]');
				if (!chapter) return Number.POSITIVE_INFINITY;
				const distance =
					chapter.getBoundingClientRect().top - element.getBoundingClientRect().top - 4;
				element.scrollTop += distance;
				element.dispatchEvent(new Event('scroll'));
				return chapter.getBoundingClientRect().top - element.getBoundingClientRect().top;
			})
		)
		.toBeLessThanOrEqual(12);

	await expect(visibleNote.locator('.note-chapter-title')).toHaveText('1.Mose 2');
	await expect(visibleNote.locator('[contenteditable="true"]')).toContainText(
		'Notiz für Kapitel zwei'
	);
});

test('a shared list is readable without an account', async ({ page, browser }) => {
	await register(page, uniqueEmail());

	await gotoLists(page);
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

	await gotoLists(page);
	await expect(page.getByRole('link', { name: /Johannes 3,16/ })).toBeVisible();
	await page.getByRole('link', { name: /Johannes 3,16/ }).click();
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
});

test('a signed-in reader can highlight a verse with a colour and clear it', async ({ page }) => {
	await register(page, uniqueEmail());

	await page.goto('/Joh3');
	await page.locator('#Joh3_16').getByRole('link', { name: 'Vers Johannes 3,16' }).click();

	const swatches = page.locator('.swatches .swatch');
	await expect(swatches).toHaveCount(10);
	await swatches.first().click();

	const verse = page.locator('[data-verse-key="43:3:16"]').first();
	await expect(verse).toHaveCSS('background-color', 'rgb(253, 230, 138)');

	// The colour survives a reload, not just the optimistic UI update.
	await page.reload();
	await expect(verse).toHaveCSS('background-color', 'rgb(253, 230, 138)');

	// Picking the same swatch again clears the highlight instead of re-applying it.
	await page.locator('#Joh3_16').getByRole('link', { name: 'Vers Johannes 3,16' }).click();
	await expect(swatches.first()).toHaveAttribute('aria-pressed', 'true');
	await swatches.first().click();
	await expect(verse).not.toHaveCSS('background-color', 'rgb(253, 230, 138)');

	await page.reload();
	await expect(verse).not.toHaveCSS('background-color', 'rgb(253, 230, 138)');
});

test('the verse menu ticks and unticks an existing list', async ({ page }) => {
	await register(page, uniqueEmail());

	await gotoLists(page);
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

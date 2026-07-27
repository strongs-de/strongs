import { expect, test } from '@playwright/test';

/**
 * Reader, search and study sidebar.
 *
 * Runs against the fixture from `pnpm db:seed`: SEEDDE (with Strong's numbers) and SEEDPLAIN, plus
 * three dictionary entries.
 */

test('the root redirects into the reader', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/Joh1$/);
});

test('a reference shows the chapter in parallel columns', async ({ page }) => {
	await page.goto('/Joh3,16');

	await expect(page.getByRole('heading', { level: 1 })).toContainText('Johannes');

	// Both translations of verse 16 are present.
	await expect(
		page.getByText('Denn also hat Gott die Welt geliebt', { exact: false })
	).toBeVisible();
	await expect(
		page.getByText('Denn so sehr hat Gott die Welt geliebt', { exact: false })
	).toBeVisible();

	// The requested verse is highlighted.
	await expect(page.locator('.verse.highlighted').first()).toBeVisible();
});

test('verses stay aligned across columns', async ({ page }) => {
	await page.goto('/Joh3');

	// The two cells for verse 16 must start on the same grid row, which is what alignment means here.
	const rows = await page.locator('.verse').evaluateAll((nodes) =>
		nodes.map((node) => ({
			row: getComputedStyle(node).gridRowStart,
			column: getComputedStyle(node).gridColumnStart,
			text: node.textContent?.slice(0, 12) ?? ''
		}))
	);

	const verse16 = rows.filter((cell) => cell.text.trim().startsWith('16'));
	expect(verse16.length).toBeGreaterThan(1);
	expect(new Set(verse16.map((cell) => cell.row)).size).toBe(1);
	expect(new Set(verse16.map((cell) => cell.column)).size).toBe(verse16.length);
});

test('chapter navigation moves forwards and backwards', async ({ page }) => {
	await page.goto('/1Mo1');

	await page.getByRole('link', { name: /Nächstes Kapitel/ }).click();
	await expect(page).toHaveURL(/\/1Mo2$/);

	await page.getByRole('link', { name: /Vorheriges Kapitel/ }).click();
	await expect(page).toHaveURL(/\/1Mo1$/);
});

test('clicking a tagged word opens the study sidebar', async ({ page }) => {
	await page.goto('/Joh3,16');

	// "geliebt" carries G25.
	await page.locator('button.strong[data-strong="G25"]').first().click();

	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toContainText('G25');
	// The dictionary entry, the lemma and the decoded morphology.
	await expect(sidebar).toContainText('ἀγαπάω');
	await expect(sidebar).toContainText('to love');
	// The rendering statistics: this translation uses "geliebt" for G25.
	await expect(sidebar).toContainText('geliebt');

	// The sidebar is deep-linkable.
	await expect(page).toHaveURL(/#G25/);
});

test('the Strong page lists every occurrence', async ({ page }) => {
	await page.goto('/G2316');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('θεός');
	// θεός occurs in both John verses of the fixture.
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Johannes 3,17' })).toBeVisible();
});

test('a padded Strong number redirects to its canonical form', async ({ page }) => {
	await page.goto('/g0025');
	await expect(page).toHaveURL(/\/G25$/);
});

test('an unknown Strong number suggests the other dictionary', async ({ page }) => {
	await page.goto('/H25');
	await expect(page.getByRole('link', { name: /G25/ })).toBeVisible();
});

test('search finds words by their beginning', async ({ page }) => {
	await page.goto('/search?q=Wel');

	await expect(page.getByRole('heading', { level: 1 })).toContainText('Ergebnisse');
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
	// The matched word is marked.
	await expect(page.locator('mark').first()).toBeVisible();
});

test('search matches inflected forms through the German stemmer', async ({ page }) => {
	// "glaubt" and "glaubst" share a stem, so either finds the other.
	await page.goto('/search?q=glauben');
	await expect(page.getByRole('link', { name: 'Johannes 3,18' })).toBeVisible();
});

test('a participle with a ge- prefix is a known limitation of the stemmer', async ({ page }) => {
	// The snowball stemmer does not strip the participle prefix, so "lieb" does not reach "geliebt".
	// Documented here so the behaviour is a decision rather than a surprise; the help page promises
	// only that word beginnings match.
	await page.goto('/search?q=lieb');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Keine Ergebnisse');

	// The word itself is of course findable.
	await page.goto('/search?q=geliebt');
	await expect(page.getByRole('link', { name: 'Johannes 3,16' })).toBeVisible();
});

test('a quoted phrase matches the exact sequence', async ({ page }) => {
	// "am Anfang" appears in SEEDPLAIN's Genesis 1:1 but not in SEEDDE, which says "Im Anfang".
	await page.goto('/search?q=%22am+Anfang%22');
	await expect(page.getByRole('link', { name: '1.Mose 1,1' })).toBeVisible();

	// A phrase that exists in neither must not match merely because both words occur.
	await page.goto('/search?q=%22Anfang+Gott%22');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Keine Ergebnisse');
});

test('a word typed into the search box that is not a reference goes to search', async ({
	page
}) => {
	await page.goto('/');
	await page.getByRole('searchbox').fill('Licht');
	await page.getByRole('searchbox').press('Enter');

	await expect(page).toHaveURL(/\/search\?q=Licht$/);
});

test('a reference typed into the search box goes to the chapter', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('searchbox').fill('1Mo 1,3');
	await page.getByRole('searchbox').press('Enter');

	await expect(page).toHaveURL(/\/1Mo1,3$/);
	await expect(page.getByText('Es werde Licht', { exact: false }).first()).toBeVisible();
});

test('the column selection persists across navigations', async ({ page }) => {
	await page.goto('/Joh3');

	// Put the second translation in the first column.
	await page.locator('#column-0').selectOption('SEEDPLAIN');
	await expect(page.locator('#column-0')).toHaveValue('SEEDPLAIN');

	await page.goto('/1Mo1');
	await expect(page.locator('#column-0')).toHaveValue('SEEDPLAIN');
});

test('legacy URLs from the previous site still resolve', async ({ page }) => {
	await page.goto('/async/Joh3');
	await expect(page).toHaveURL(/\/Joh3$/);

	await page.goto('/Joh3/trans/0_2');
	await expect(page).toHaveURL(/\/Joh3$/);
});

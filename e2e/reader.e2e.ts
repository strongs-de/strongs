import { expect, test, type Page } from '@playwright/test';

/**
 * Reader, search and study sidebar.
 *
 * Runs against the fixture from `pnpm db:seed`: SEEDDE (with Strong's numbers), SEEDPLAIN and
 * SEEDCOMMENTARY, plus three dictionary entries.
 */

/**
 * Flowing text is the default for a fresh visitor; the tests below exercise the column grid
 * specifically, so they ask for it explicitly rather than depending on which layout happens to be
 * the default.
 */
async function useAlignedLayout(page: Page): Promise<void> {
	await page
		.context()
		.addCookies([{ name: 'reader-layout', value: 'aligned', url: 'http://localhost:4173' }]);
}

/** The commentary fixture is not a default column, so tests exercising it must select it explicitly. */
async function useCommentaryColumn(page: Page): Promise<void> {
	await page.context().addCookies([
		{
			name: 'columns',
			value: 'SEEDDE,SEEDPLAIN,SEEDCOMMENTARY',
			url: 'http://localhost:4173'
		}
	]);
}

test('the root redirects into the reader', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/Joh1$/);
});

test('Impressum and Datenschutz are reachable only from the global menu', async ({ page }) => {
	await page.goto('/Joh3');

	// No longer direct top-bar links — only reachable through the global menu.
	await expect(page.getByRole('banner').getByRole('link', { name: 'Impressum' })).toHaveCount(0);
	await expect(page.getByRole('banner').getByRole('link', { name: 'Datenschutz' })).toHaveCount(0);

	await page.getByRole('button', { name: 'Menü öffnen' }).click();
	await page.getByRole('menuitem', { name: 'Impressum' }).click();
	await expect(page).toHaveURL(/\/impressum$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Impressum');

	await page.goto('/Joh3');
	await page.getByRole('button', { name: 'Menü öffnen' }).click();
	await page.getByRole('menuitem', { name: 'Datenschutz' }).click();
	await expect(page).toHaveURL(/\/datenschutz$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Datenschutzerklärung');
});

test('the help page is reachable from the site header', async ({ page }) => {
	await page.goto('/Joh3');

	await page.getByRole('link', { name: 'Hilfe' }).click();

	await expect(page).toHaveURL(/\/help$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Hilfe');
});

test('the about page loads with a visible heading', async ({ page }) => {
	const response = await page.goto('/about');

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('strongs.de');
});

test('a reference shows the chapter in parallel columns', async ({ page }) => {
	await useAlignedLayout(page);
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

test('commentary text is formatted the same as scripture text, in both layouts', async ({
	page
}) => {
	await useCommentaryColumn(page);

	await page.goto('/Joh3,16');
	const flowCommentary = page.locator('.flow-reference .commentary-body').first();
	await expect(flowCommentary).toContainText('bekannteste Vers');
	expect(
		await page
			.locator('.flow-reference')
			.first()
			.evaluate((el) => getComputedStyle(el).fontSize)
	).toBe(
		await page
			.locator('.flow-verse')
			.first()
			.evaluate((el) => getComputedStyle(el).fontSize)
	);
	expect(
		await page
			.locator('.flow-reference')
			.first()
			.evaluate((el) => getComputedStyle(el).fontFamily)
	).toBe(
		await page
			.locator('.flow-verse')
			.first()
			.evaluate((el) => getComputedStyle(el).fontFamily)
	);

	await useAlignedLayout(page);
	await page.goto('/Joh3,16');
	const alignedCommentary = page.locator('.reference-cell .commentary-body').first();
	await expect(alignedCommentary).toContainText('bekannteste Vers');
	expect(
		await page
			.locator('.reference-cell')
			.first()
			.evaluate((el) => getComputedStyle(el).fontSize)
	).toBe(
		await page
			.locator('.verse')
			.first()
			.evaluate((el) => getComputedStyle(el).fontSize)
	);
	expect(
		await page
			.locator('.reference-cell')
			.first()
			.evaluate((el) => getComputedStyle(el).fontFamily)
	).toBe(
		await page
			.locator('.verse')
			.first()
			.evaluate((el) => getComputedStyle(el).fontFamily)
	);
});

test('verses stay aligned across columns', async ({ page }) => {
	await useAlignedLayout(page);
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

test('a column boundary can be dragged to resize the columns, and the split persists', async ({
	page
}) => {
	await useAlignedLayout(page);
	await page.goto('/Joh3');

	// The desktop bar; the mobile tab-switcher bar shares the same test id but is hidden at this
	// (default) viewport width and never renders a resize handle at all.
	const bar = page.getByTestId('column-picker-bar').first();
	const handle = bar.getByRole('separator');
	await expect(handle).toHaveCount(1);

	const barBox = (await bar.boundingBox())!;
	const handleBox = (await handle.boundingBox())!;
	const startX = handleBox.x + handleBox.width / 2;
	const y = handleBox.y + handleBox.height / 2;
	const targetX = startX + barBox.width * 0.2;

	// Dispatches synthetic pointer events directly rather than driving `page.mouse`: the handler
	// computes the new width from this event's own `clientX` against the position recorded at
	// pointerdown, not incrementally, so one pointermove carrying the final coordinate is enough —
	// and this sidesteps a CDP/headless-Chromium quirk where a real synthetic mouse-up can go
	// undelivered if the element under the cursor was itself moved (by our own live-resize feedback)
	// since the preceding mouse-move.
	await handle.dispatchEvent('pointerdown', { clientX: startX, clientY: y, pointerId: 1 });
	await page.evaluate(
		([x, pointerY]) => {
			window.dispatchEvent(
				new PointerEvent('pointermove', { clientX: x, clientY: pointerY, bubbles: true })
			);
		},
		[targetX, y]
	);
	await page.evaluate(() => {
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
	});

	// The boundary moved right, so the first column grew and the second shrank.
	const columnHeaders = bar.locator('[role="group"]');
	const [firstWidth, secondWidth] = await columnHeaders.evaluateAll((nodes) =>
		nodes.map((node) => node.getBoundingClientRect().width)
	);
	expect(firstWidth).toBeGreaterThan(secondWidth * 1.3);

	// The resize commits to a cookie once the drag ends.
	await expect.poll(() => page.evaluate(() => document.cookie)).toContain('column-widths=');

	// The split survives a reload.
	await page.reload();
	const [firstAfterReload, secondAfterReload] = await columnHeaders.evaluateAll((nodes) =>
		nodes.map((node) => node.getBoundingClientRect().width)
	);
	expect(firstAfterReload).toBeGreaterThan(secondAfterReload * 1.3);

	// And still applies after switching to the flow layout.
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('menuitem', { name: /Fließtext/ }).click();
	const flowColumns = page.locator('.flow-column');
	await expect(flowColumns).toHaveCount(2);
	const [flowFirst, flowSecond] = await flowColumns.evaluateAll((nodes) =>
		nodes.map((node) => node.getBoundingClientRect().width)
	);
	expect(flowFirst).toBeGreaterThan(flowSecond * 1.3);
});

test('the view menu switches to synchronized flowing text', async ({ page }) => {
	await page.goto('/Joh3');
	expect(await page.evaluate(() => window.scrollY)).toBe(0);

	await page.getByRole('button', { name: 'Ansicht' }).click();
	await expect(page.getByRole('menuitemradio', { name: 'Helles Design' })).toBeVisible();
	await expect(page.getByRole('menuitemradio', { name: 'Dunkles Design' })).toBeVisible();
	await page.getByRole('menuitem', { name: /Fließtext/ }).click();

	const reader = page.getByTestId('flow-reader');
	await expect(reader).toBeVisible();
	await expect(page.locator('.flow-verse').first()).toHaveCSS('display', 'inline');
	await expect(page.locator('.flow-chapter-title')).toHaveCount(0);
	await expect(page.locator('.flow-chapter-number').first()).toHaveText('3');
	await expect(page.locator('.verse-lead').first()).toHaveCSS('white-space', 'nowrap');
	await expect(page.locator('.keep-punctuation').first()).toHaveCSS('white-space', 'nowrap');

	const columns = page.locator('.flow-column');
	await expect(columns).toHaveCount(2);
	await expect(columns.first()).toHaveCSS('scrollbar-width', 'none');
	await page.waitForTimeout(120);
	await columns.first().evaluate((element) => {
		const verse = element.querySelector<HTMLElement>('[data-verse-key="43:3:17"]');
		element.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
		element.scrollTop = verse?.offsetTop ?? element.scrollHeight;
		element.dispatchEvent(new Event('scroll'));
	});

	await expect
		.poll(() => columns.nth(1).evaluate((element) => element.scrollTop))
		.toBeGreaterThan(0);

	// Whichever text column the reader manipulates becomes the source for all the others.
	const firstPosition = await columns.first().evaluate((element) => element.scrollTop);
	await page.waitForTimeout(120);
	await columns.nth(1).evaluate((element) => {
		element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
		element.scrollTop = 0;
		element.dispatchEvent(new Event('scroll'));
	});
	await expect
		.poll(() => columns.first().evaluate((element) => element.scrollTop))
		.not.toBe(firstPosition);

	// The preference survives a regular navigation.
	await page.goto('/Joh3');
	await expect(reader).toBeVisible();
});

test('a column can opt out of synchronized flowing-text scrolling on its own', async ({ page }) => {
	// The fixture's chapter is short enough that almost any scroll position also crosses the endless-
	// scroll thresholds, whose chapter-prepend compensation moves *every* column regardless of sync
	// (by design — see onFlowScroll). Blocking it isolates the cross-column sync behaviour this test
	// is actually about.
	await page.route('**/api/reader/**', (route) => route.abort());
	await page.goto('/Joh3');

	const columns = page.locator('.flow-column');
	await expect(columns).toHaveCount(2);

	// Both columns start synced, so both toggles offer to disable it.
	const disableToggle = page.getByRole('button', { name: 'Synchron scrollen deaktivieren' });
	await expect(disableToggle).toHaveCount(2);
	await disableToggle.nth(1).click();
	await expect(page.getByRole('button', { name: 'Synchron scrollen aktivieren' })).toHaveCount(1);

	// Let any in-flight sync from the initial mount settle, then take the second column's resting
	// position as the baseline to compare against — rather than assuming it is 0, which the
	// mount-time alignment (while still synced) need not leave it at.
	await page.waitForTimeout(400);
	const baseline = await columns.nth(1).evaluate((element) => element.scrollTop);

	// Scrolling the still-synced first column must not move the column that opted out.
	await columns.first().evaluate((element) => {
		const verse = element.querySelector<HTMLElement>('[data-verse-key="43:3:17"]');
		element.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
		element.scrollTop = verse?.offsetTop ?? element.scrollHeight;
		element.dispatchEvent(new Event('scroll'));
	});
	await page.waitForTimeout(400);
	expect(await columns.nth(1).evaluate((element) => element.scrollTop)).toBe(baseline);

	// Re-enabling resumes sync from the next real scroll: scrolling the first column back to the top
	// re-anchors the second column on verse 16 instead of wherever it was left.
	await page.getByRole('button', { name: 'Synchron scrollen aktivieren' }).click();
	await expect(page.getByRole('button', { name: 'Synchron scrollen deaktivieren' })).toHaveCount(2);

	await columns.first().evaluate((element) => {
		element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
		element.scrollTop = 0;
		element.dispatchEvent(new Event('scroll'));
	});
	await expect
		.poll(() => columns.nth(1).evaluate((element) => element.scrollTop))
		.not.toBe(baseline);
});

test('flowing text preloads the next chapter for endless scrolling', async ({ page }) => {
	await page.goto('/Joh3');
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('menuitem', { name: /Fließtext/ }).click();

	await expect(page.locator('[data-chapter-key="43:4"]').first()).toBeAttached();
});

test('a verse reference scrolls directly to the requested verse', async ({ page }) => {
	await useAlignedLayout(page);
	await page.setViewportSize({ width: 900, height: 260 });
	await page.goto('/1Mo1,3');

	await expect(page.locator('.verse.highlighted').first()).toBeInViewport();
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('landing on a deep-linked verse settles once, without a spurious extra prepend', async ({
	page
}) => {
	await useAlignedLayout(page);
	await page.setViewportSize({ width: 900, height: 260 });
	await page.goto('/Joh3,16');

	await expect(page.locator('.verse.highlighted').first()).toBeInViewport();

	// The scroll that lands on the deep-linked verse is our own programmatic scroll, not the reader
	// scrolling, so it must not be misread as "the reader scrolled near the top of the stream" and
	// spuriously prepend the previous chapter — nobody asked to see it yet. Before the fix, the
	// unsuppressed `scrollIntoView` left exactly that scroll event unshielded.
	await page.waitForTimeout(600);
	await expect(page.locator('.aligned-chapter[data-chapter-key="43:2"]')).toHaveCount(0);

	// And once the landing scroll has settled, nothing keeps nudging it further — two polls apart
	// see the same position, rather than the page still fighting its own compensating scrolls.
	const first = await page.evaluate(() => window.scrollY);
	await page.waitForTimeout(150);
	const second = await page.evaluate(() => window.scrollY);
	expect(second).toBe(first);
});

test('changing the reference resets aligned scrolling and the visible chapter', async ({
	page
}) => {
	await useAlignedLayout(page);
	await page.setViewportSize({ width: 900, height: 260 });
	await page.goto('/1Mo1,3');
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

	await page.getByRole('searchbox').fill('Joh 3');
	await page.getByRole('searchbox').press('Enter');

	await expect(page).toHaveURL(/\/Joh3$/);
	await expect(page.getByTestId('reader-location')).toContainText('Johannes 3');
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('the aligned chapter label follows endless scrolling', async ({ page }) => {
	await useAlignedLayout(page);
	await page.setViewportSize({ width: 900, height: 300 });
	await page.goto('/1Mo1');

	const nextChapter = page.locator('.aligned-chapter[data-chapter-key="1:2"]');
	await expect(nextChapter).toBeAttached();
	await nextChapter.scrollIntoViewIfNeeded();
	await page.evaluate(() => window.scrollBy(0, 100));

	await expect(page.getByTestId('reader-location')).toContainText('1.Mose 2');
});

test('chapter navigation moves forwards and backwards', async ({ page }) => {
	await page.goto('/1Mo1');

	await page.getByRole('link', { name: /Nächstes Kapitel/ }).click();
	await expect(page).toHaveURL(/\/1Mo2$/);

	await page.getByRole('link', { name: /Vorheriges Kapitel/ }).click();
	await expect(page).toHaveURL(/\/1Mo1$/);
});

test('clicking a tagged word opens the study sidebar', async ({ page }) => {
	// Open the whole chapter: the clicked verse, rather than only the route, must determine which
	// original-language form and morphology the sidebar loads.
	await page.goto('/Joh3');

	// "geliebt" carries G25.
	await page.locator('button.strong[data-strong="G25"]').first().click();

	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toContainText('G25');
	// The dictionary entry, lemma and exact clicked reference are loaded.
	await expect(sidebar).toContainText('ἀγαπάω');
	await expect(sidebar).toContainText('to love');
	await expect(sidebar).toContainText('Joh 3,16');
	// The rendering statistics: this translation uses "geliebt" for G25.
	await expect(sidebar).toContainText('geliebt');

	// The sidebar is deep-linkable.
	await expect(page).toHaveURL(/#G25\/geliebt\/16$/);
});

test('clicking a footnote marker opens its note without relying on the Popover API', async ({
	page
}) => {
	await page.goto('/Joh3');

	// Force the same code path devices without Popover API support hit, so a regression here is
	// caught even when the browser under test does support it.
	await page.addInitScript(() => {
		// @ts-expect-error simulating an older WebView for the test
		delete HTMLElement.prototype.showPopover;
	});
	await page.reload();

	const marker = page.locator('button.footnote-marker').first();
	await marker.click();

	const note = page.getByRole('note');
	await expect(note).toBeVisible();
	await expect(note).toContainText('so sehr');

	await marker.click();
	await expect(note).not.toBeVisible();
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

	// Put the second translation in the first column. The fixture now spans more than one resource
	// kind (bibles and a commentary), so the menu groups them under an expandable "Bibeln" submenu.
	await page.locator('#column-0').click();
	await page.getByRole('menuitem', { name: 'Bibeln' }).click();
	await page
		.locator('form[action="?/setColumn"]')
		.filter({ has: page.locator('input[name="resource"][value="SEEDPLAIN"]') })
		.getByRole('menuitem')
		.click();
	await expect(page.locator('#column-0')).toContainText('Schlicht');

	await page.goto('/1Mo1');
	await expect(page.locator('#column-0')).toContainText('Schlicht');
});

test('a closed column can be opened again', async ({ page }) => {
	await page.goto('/Joh3');
	await expect(page.locator('button[id^="column-"]')).toHaveCount(2);

	// Close the second column; the fixture has exactly two translations, so the add button appears.
	await page
		.getByRole('button', { name: /Spalte entfernen/ })
		.last()
		.click();
	await expect(page.locator('button[id^="column-"]')).toHaveCount(1);

	await page.getByRole('button', { name: 'Spalte hinzufügen' }).first().click();
	await page.getByRole('menuitem', { name: 'Bibeln' }).click();
	await page.locator('form[action="?/addColumn"]').getByRole('menuitem').first().click();

	await expect(page.locator('button[id^="column-"]')).toHaveCount(2);

	// And the choice is remembered, like every other column change.
	await page.goto('/1Mo1');
	await expect(page.locator('button[id^="column-"]')).toHaveCount(2);
});

test('the study panel and the column headers stay in view while scrolling', async ({ page }) => {
	await page.goto('/Joh3,16');
	await page.locator('button.strong[data-strong="G25"]').first().click();

	const sidebar = page.getByRole('complementary');
	const header = page.locator('#column-0');
	await expect(sidebar).toBeVisible();

	await page.mouse.wheel(0, 4000);
	// Both are fixed/pinned to the viewport; before the fix both scrolled away, because the
	// reader's <main> was a scroll container and nothing could stick to the viewport inside it.
	await expect(sidebar).toBeInViewport();
	await expect(header).toBeInViewport();
});

test('opening the study sidebar does not resize the reading columns', async ({ page }) => {
	await page.goto('/Joh3');

	const column = page.locator('.flow-column[data-flow-column-index="0"]');
	const before = (await column.boundingBox())!;

	await page.locator('button.strong[data-strong="G25"]').first().click();
	await expect(page.getByRole('complementary')).toBeVisible();

	const after = (await column.boundingBox())!;
	expect(after.width).toBeCloseTo(before.width, 0);
});

test('escape closes the study sidebar', async ({ page }) => {
	await page.goto('/Joh3');

	await page.locator('button.strong[data-strong="G25"]').first().click();
	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(sidebar).not.toBeVisible();
});

test('clicking outside the study sidebar closes it', async ({ page }) => {
	await page.goto('/Joh3');

	await page.locator('button.strong[data-strong="G25"]').first().click();
	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toBeVisible();

	await page.getByRole('heading', { level: 1 }).click();
	await expect(sidebar).not.toBeVisible();
});

test('clicking another word switches the sidebar instead of closing it', async ({ page }) => {
	await page.goto('/Joh3');

	await page.locator('button.strong[data-strong="G25"]').first().click();
	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toContainText('G25');

	// "Gott" nearby carries G2316.
	await page.locator('button.strong[data-strong="G2316"]').first().click();
	await expect(sidebar).toBeVisible();
	await expect(sidebar).toContainText('G2316');
});

test('on a phone the study panel is a sheet that leaves the verse visible', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 780 });
	await page.goto('/Joh3,16');

	const verse = page.locator('#Joh3_16');
	await page.locator('button.strong[data-strong="G25"]').first().click();

	const sheet = page.getByRole('complementary');
	await expect(sheet).toBeVisible();

	// A sheet over the lower part of the screen, not a full-width sibling that squeezes the text to
	// nothing — which is what a `w-full` flex item did before.
	const sheetBox = (await sheet.boundingBox())!;
	const verseBox = (await verse.boundingBox())!;
	expect(sheetBox.height).toBeLessThan(780 * 0.75);
	expect(verseBox.width).toBeGreaterThan(200);
	expect(verseBox.y).toBeLessThan(sheetBox.y);
});

test('the mobile column switcher exposes real tab semantics without hiding desktop columns', async ({
	page
}) => {
	// Default (desktop) viewport first: the regression this specifically guards against is
	// `aria-hidden` leaking onto desktop, where every column is visible at once regardless of which
	// one `mobileColumn` happens to name.
	await page.goto('/Joh3');

	const columns = page.locator('.flow-column');
	await expect(columns).toHaveCount(2);
	await expect(columns.first()).not.toHaveAttribute('aria-hidden', 'true');
	await expect(columns.nth(1)).not.toHaveAttribute('aria-hidden', 'true');
	await expect(columns.nth(1)).not.toHaveAttribute('role', 'tabpanel');

	// Now at phone width, where the switcher actually appears and the same mechanism legitimately
	// hides the non-selected column from assistive tech.
	await page.setViewportSize({ width: 390, height: 780 });
	await page.reload();

	const tabs = page.getByRole('tablist', { name: 'Spaltenauswahl' }).getByRole('tab');
	await expect(tabs).toHaveCount(2);
	await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
	await expect(tabs.first()).toHaveAttribute('tabindex', '0');
	await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');

	const mobileColumns = page.locator('.flow-column');
	await expect(mobileColumns.first()).toHaveAttribute('role', 'tabpanel');
	await expect(mobileColumns.nth(1)).toHaveAttribute('aria-hidden', 'true');

	// ArrowRight moves focus to the next tab and switches to it in the same step (automatic
	// activation), matching the existing click-to-switch behaviour. Read the focused id back from
	// the same round trip that dispatches the key, rather than polling for it afterwards: this
	// sandbox's headless browser can drop DOM focus asynchronously some time after a programmatic
	// `.focus()` call for reasons unrelated to the app (the handler itself sets it synchronously,
	// every time), and a later, separate assertion would be at the mercy of that.
	await tabs.first().focus();
	const focusedIdAfterArrowRight = await page.evaluate(() => {
		document.activeElement?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
		);
		return document.activeElement?.id;
	});
	expect(focusedIdAfterArrowRight).toBe('mobile-tab-1');
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
	await expect(mobileColumns.first()).toHaveAttribute('aria-hidden', 'true');
	await expect(mobileColumns.nth(1)).not.toHaveAttribute('aria-hidden', 'true');
});

test('legacy URLs from the previous site still resolve', async ({ page }) => {
	await page.goto('/async/Joh3');
	await expect(page).toHaveURL(/\/Joh3$/);

	await page.goto('/Joh3/trans/0_2');
	await expect(page).toHaveURL(/\/Joh3$/);
});

test('a reference percent-encoded as Latin-1 does not crash the page', async ({ page }) => {
	// "1K%F6n16" is "1Kön16" (1.Könige 16) with "ö" mis-encoded as Latin-1 (0xF6) instead of UTF-8
	// (%C3%B6) — something old browsers and stale bookmarks still produce.
	const response = await page.goto('/1K%F6n16');
	expect(response?.status()).toBeLessThan(400);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Könige');
});

test('the homepage link clears the remembered chapter instead of bouncing back to it', async ({
	page
}) => {
	await page.goto('/Joh3');
	await expect(page).toHaveURL(/\/Joh3$/);

	await page.getByRole('link', { name: 'Strongs.de – Startseite' }).click();

	await expect(page).toHaveURL(/\/Joh1$/);
});

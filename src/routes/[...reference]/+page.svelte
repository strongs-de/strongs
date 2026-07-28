<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { formatReference, referencePath } from '$lib/bible/reference';
	import { bookName } from '$lib/bible/book-names';
	import { segmentsToText } from '$lib/bible/segments';
	import { t } from '$lib/i18n';
	import ColumnPicker from '$lib/components/ColumnPicker.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import StudySidebar from '$lib/components/StudySidebar.svelte';
	import VerseMenu from '$lib/components/VerseMenu.svelte';
	import VerseText from '$lib/components/VerseText.svelte';
	import NoteEditor from '$lib/components/NoteEditor.svelte';
	import ResourceMenuItems from '$lib/components/ResourceMenuItems.svelte';

	let { data } = $props();

	/**
	 * The verse grid.
	 *
	 * One CSS grid holds every column, with each cell placed explicitly at its verse row. That gives
	 * true alignment across translations, including verses one translation merges and another does
	 * not — the job `jquery.matchHeight` used to do after paint, badly.
	 */
	const headings = $derived(new Map(data.chapter.headings));

	/**
	 * Which verses of this chapter are in which list, as `${verse}:${listId}`.
	 *
	 * A reactive set the verse menu writes to, so ticking a list flips the mark immediately; it is
	 * derived from page data, so it is rebuilt from the server's answer on every navigation.
	 */
	const marks = $derived(
		new SvelteSet(data.markedVerses.map((mark) => `${mark.verse}:${mark.listId}`))
	);

	/**
	 * Verses that sit in at least one list, which colours their number.
	 *
	 * Read back out of `marks` rather than from page data, so ticking a list in the menu recolours the
	 * number at once — the add does not re-run `load`, since the chapter itself has not changed.
	 */
	const inAnyList = $derived(new Set([...marks].map((key) => Number(key.split(':')[0]))));

	let verseMenu = $state<VerseMenu | undefined>();
	let addColumnMenu = $state<Menu | undefined>();

	const unusedResources = $derived(
		data.readerResources.filter(
			(resource) => !data.columns.some((column) => column.resource.id === resource.id)
		)
	);
	const canAddColumn = $derived(
		data.columns.length < data.maxColumns && unusedResources.length > 0
	);
	const visibleColumnCount = $derived(data.columns.length + (data.notesVisible ? 1 : 0));
	const notesColumnIndex = $derived(data.columns.length);

	function commentaryAt(resourceId: string, verse: number) {
		return data.referenceResources.commentaries.filter(
			(entry) => entry.resourceId === resourceId && (entry.verseStart ?? 1) === verse
		);
	}

	function crossReferencesAt(resourceId: string, verse: number) {
		return data.referenceResources.crossReferences.filter(
			(entry) => entry.resourceId === resourceId && entry.fromVerse === verse
		);
	}

	let draggedColumn = $state<number | null>(null);
	let dropColumn = $state<number | null>(null);
	let reorderForm = $state<HTMLFormElement | undefined>();
	let reorderFromInput = $state<HTMLInputElement | undefined>();
	let reorderToInput = $state<HTMLInputElement | undefined>();

	function startColumnDrag(event: DragEvent, index: number) {
		draggedColumn = index;
		event.dataTransfer?.setData('text/plain', String(index));
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function dropOnColumn(event: DragEvent, index: number) {
		event.preventDefault();
		const from = draggedColumn ?? Number(event.dataTransfer?.getData('text/plain'));
		draggedColumn = null;
		dropColumn = null;
		if (
			!Number.isInteger(from) ||
			from === index ||
			!reorderForm ||
			!reorderFromInput ||
			!reorderToInput
		)
			return;
		reorderFromInput.value = String(from);
		reorderToInput.value = String(index);
		reorderForm.requestSubmit();
	}

	/**
	 * Opens the verse menu, unless the reader meant to use the link.
	 *
	 * The verse number stays an `<a>` so it keeps working without scripting and still offers
	 * "open in new tab" and "copy link address"; only a plain left click is taken over.
	 */
	function onVerseNumberClick(
		event: MouseEvent & { currentTarget: HTMLAnchorElement },
		verse: number,
		verseEnd: number | null,
		segments: Parameters<typeof segmentsToText>[0]
	) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
			return;
		}

		event.preventDefault();
		const reference = {
			book: data.reference.book,
			chapter: data.reference.chapter,
			verse,
			...(verseEnd && verseEnd > verse ? { verseEnd } : {})
		};

		verseMenu?.openAt(event.currentTarget, verse, {
			reference: formatReference(reference),
			label: formatReference(reference, { style: 'full' }),
			path: referencePath(reference),
			text: segmentsToText(segments)
		});
	}

	/** Which column a reader is looking at on a phone, where only one fits. */
	let mobileColumn = $state(0);

	/** Strong's number shown in the study sidebar, kept in the URL hash so it can be shared. */
	let activeStrong = $state<{ strong: string; word: string; reference: string } | null>(null);

	// Restore the sidebar from the hash on load and on navigation.
	$effect(() => {
		const hash = page.url.hash.replace(/^#/, '');
		if (!hash) {
			activeStrong = null;
			return;
		}
		const [strong, word, verseValue] = hash.split('/');
		if (strong) {
			const verse = Number.parseInt(verseValue ?? '', 10);
			activeStrong = {
				strong: decodeURIComponent(strong),
				word: decodeURIComponent(word ?? ''),
				reference: formatReference({
					book: data.reference.book,
					chapter: data.reference.chapter,
					...(Number.isSafeInteger(verse) && verse > 0
						? { verse }
						: data.reference.verse !== undefined
							? { verse: data.reference.verse }
							: {})
				})
			};
		}
	});

	function openStrong(strong: string, word: string, verse: number) {
		activeStrong = {
			strong,
			word,
			reference: formatReference({
				book: data.reference.book,
				chapter: data.reference.chapter,
				verse
			})
		};
		replaceState(
			`${page.url.pathname}#${encodeURIComponent(strong)}/${encodeURIComponent(word)}/${verse}`,
			page.state
		);
	}

	function closeStrong() {
		activeStrong = null;
		replaceState(page.url.pathname, page.state);
	}

	const previousPath = $derived(
		data.navigation.previous ? referencePath(data.navigation.previous) : null
	);
	const nextPath = $derived(data.navigation.next ? referencePath(data.navigation.next) : null);
</script>

<svelte:head>
	<title>{data.fullTitle} — strongs.de</title>
	<meta
		name="description"
		content="{data.fullTitle} in {data.columns
			.map((column) => column.resource.abbrev)
			.join(', ')} — mit Strong-Nummern, Grammatik und Wörterbuch."
	/>
	{#if previousPath}<link rel="prev" href={previousPath} />{/if}
	{#if nextPath}<link rel="next" href={nextPath} />{/if}
</svelte:head>

<div class="flex min-h-0 flex-1">
	<!-- No `overflow-x` here: it would make this a scroll container, and every `sticky` inside it
	     would then stick to a box that never scrolls vertically. The grid's `minmax(0, 1fr)` tracks
	     cannot overflow anyway. -->
	<main class="min-w-0 flex-1 bg-white/65 dark:bg-stone-950/45">
		<div
			class="mx-auto max-w-[120rem] px-3 py-4 sm:px-5 sm:py-5"
			class:pb-sheet={activeStrong !== null}
		>
			<div
				class="mb-4 flex items-end justify-between gap-4 border-b border-stone-200 pb-3 dark:border-stone-800"
			>
				<h1
					class="font-serif text-2xl font-semibold tracking-tight text-stone-800 sm:text-3xl dark:text-stone-100"
				>
					{bookName(data.reference.book)}
					{data.reference.chapter}
				</h1>
				<p class="hidden text-xs text-stone-500 sm:block dark:text-stone-400">
					{t('search.hint.strong')}
				</p>
				<div
					class="flex shrink-0 items-center rounded-md border border-stone-200 bg-white/70
					       dark:border-stone-700 dark:bg-stone-900"
					aria-label={t('account.readerFontSize')}
				>
					<form method="POST" action="?/adjustFontSize" use:enhance>
						<input type="hidden" name="delta" value="-5" />
						<button
							type="submit"
							disabled={data.readerFontScale <= 85}
							class="inline-flex h-8 min-w-9 items-center justify-center rounded-l-md px-2
							       font-serif text-sm font-semibold text-stone-700 hover:bg-stone-100
							       disabled:cursor-not-allowed disabled:opacity-35 dark:text-stone-100
							       dark:hover:bg-stone-800"
							aria-label={t('reader.fontSmaller')}
							title={t('reader.fontSmaller')}
						>
							A−
						</button>
					</form>
					<span
						class="min-w-11 border-x border-stone-200 px-1 text-center text-[0.65rem]
						       text-stone-500 tabular-nums dark:border-stone-700 dark:text-stone-400"
					>
						{data.readerFontScale}%
					</span>
					<form method="POST" action="?/adjustFontSize" use:enhance>
						<input type="hidden" name="delta" value="5" />
						<button
							type="submit"
							disabled={data.readerFontScale >= 140}
							class="inline-flex h-8 min-w-9 items-center justify-center rounded-r-md px-2
							       font-serif text-base font-semibold text-stone-700 hover:bg-stone-100
							       disabled:cursor-not-allowed disabled:opacity-35 dark:text-stone-100
							       dark:hover:bg-stone-800"
							aria-label={t('reader.fontLarger')}
							title={t('reader.fontLarger')}
						>
							A+
						</button>
					</form>
				</div>
				{#if data.user}
					<form method="POST" action="?/toggleNotes" use:enhance>
						<button
							type="submit"
							class="inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-2.5 py-1.5
							       text-xs font-medium text-stone-600 hover:border-accent-400 hover:text-accent-700
							       dark:border-stone-700 dark:text-stone-300 dark:hover:text-accent-300"
							aria-pressed={data.notesVisible}
						>
							<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
								<path
									d="M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5C3 16.22 3.78 17 4.75 17h10.5c.97 0 1.75-.78 1.75-1.75V4.75C17 3.78 16.22 3 15.25 3H4.75Zm2 3.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm.75 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"
								/>
							</svg>
							{data.notesVisible ? t('reader.hideNotes') : t('reader.showNotes')}
						</button>
					</form>
				{/if}
			</div>

			<!-- Column headers double as the translation picker. The bar sticks as one piece; a single
			     header cell is never taller than itself and so could never stick on its own. -->
			<div
				class="sticky top-[var(--header-height)] z-10 mb-2 hidden gap-0 overflow-hidden rounded-md border
				       border-stone-200 bg-stone-50/95 py-1.5 shadow-sm backdrop-blur sm:grid
				       dark:border-stone-800 dark:bg-stone-950/95"
				style="grid-template-columns: repeat({visibleColumnCount}, minmax(0, 1fr))"
			>
				{#each data.columns as column (column.resource.id)}
					<div
						draggable="true"
						role="group"
						aria-label="{column.resource.abbrev}: {t('reader.dragColumn')}"
						class="min-w-0 border-r border-stone-200 last:border-r-0 dark:border-stone-800"
						class:opacity-40={draggedColumn === column.index}
						class:ring-2={dropColumn === column.index}
						class:ring-accent-400={dropColumn === column.index}
						ondragstart={(event) => startColumnDrag(event, column.index)}
						ondragover={(event) => {
							event.preventDefault();
							dropColumn = column.index;
						}}
						ondragleave={() => (dropColumn = null)}
						ondrop={(event) => dropOnColumn(event, column.index)}
						ondragend={() => {
							draggedColumn = null;
							dropColumn = null;
						}}
					>
						<ColumnPicker
							index={column.index}
							selected={column.resource}
							available={data.readerResources}
							chosen={data.columns.map((other) => other.resource.id)}
							canRemove={data.columns.length > 1}
							canAdd={canAddColumn && column.index === data.columns.length - 1}
						/>
					</div>
				{/each}
				{#if data.notesVisible}
					<div class="flex min-h-8 items-center justify-between gap-2 px-2">
						<span class="truncate text-sm font-semibold text-stone-700 dark:text-stone-200">
							{t('reader.notesColumn')}
						</span>
						<form method="POST" action="?/toggleNotes" use:enhance class="flex items-center">
							<button
								type="submit"
								class="inline-flex size-7 items-center justify-center rounded text-stone-400
								       hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800
								       dark:hover:text-stone-200"
								aria-label={t('reader.hideNotes')}
							>
								<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
									<path
										d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
									/>
								</svg>
							</button>
						</form>
					</div>
				{/if}
			</div>
			<form bind:this={reorderForm} method="POST" action="?/moveColumn" use:enhance class="hidden">
				<input bind:this={reorderFromInput} type="hidden" name="from" />
				<input bind:this={reorderToInput} type="hidden" name="to" />
			</form>

			<!-- On a phone one column fits; tabs switch between translations. -->
			<div
				class="sticky top-[var(--header-height)] z-10 -mx-3 flex gap-1 overflow-x-auto border-b
				       border-stone-200 bg-white/95 px-3 py-2 backdrop-blur sm:hidden
				       dark:border-stone-800 dark:bg-stone-950/95"
			>
				{#each data.columns as column (column.resource.id)}
					<button
						type="button"
						class="shrink-0 rounded-full px-3 py-1 text-sm"
						class:bg-accent-600={mobileColumn === column.index}
						class:text-white={mobileColumn === column.index}
						class:bg-stone-100={mobileColumn !== column.index}
						class:dark:bg-stone-800={mobileColumn !== column.index}
						onclick={() => (mobileColumn = column.index)}
					>
						{column.resource.abbrev}
					</button>
				{/each}
				{#if data.notesVisible}
					<button
						type="button"
						class="shrink-0 rounded-full px-3 py-1 text-sm"
						class:bg-accent-600={mobileColumn === notesColumnIndex}
						class:text-white={mobileColumn === notesColumnIndex}
						class:bg-stone-100={mobileColumn !== notesColumnIndex}
						class:dark:bg-stone-800={mobileColumn !== notesColumnIndex}
						onclick={() => (mobileColumn = notesColumnIndex)}
					>
						{t('lists.note')}
					</button>
				{/if}

				{#if canAddColumn}
					<form method="POST" action="?/addColumn" use:enhance>
						<button
							type="submit"
							title={t('reader.addColumn')}
							aria-label={t('reader.addColumn')}
							class="shrink-0 rounded-full border border-dashed border-stone-300 px-3 py-1
							       text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400"
							onclick={(event) => {
								event.preventDefault();
								addColumnMenu?.openAt(event.currentTarget);
							}}
						>
							+
						</button>
					</form>

					<Menu bind:this={addColumnMenu} label={t('reader.addColumn')}>
						<p class="menu-label">{t('reader.addColumn')}</p>
						<ResourceMenuItems
							resources={unusedResources}
							action="?/addColumn"
							onChoose={() => addColumnMenu?.close()}
						/>
					</Menu>
				{/if}
			</div>

			{#if data.chapter.empty}
				<p class="rounded-lg bg-stone-50 p-6 text-stone-600 dark:bg-stone-900 dark:text-stone-300">
					{t('reader.chapterEmpty')}
				</p>
			{:else}
				<div
					class="verse-grid"
					style="--columns: {visibleColumnCount}"
					data-mobile-column={mobileColumn}
				>
					{#if data.notesVisible}
						<aside
							class="chapter-note"
							class:hidden-on-mobile={mobileColumn !== notesColumnIndex}
							style="grid-column: {notesColumnIndex + 1}; grid-row: 1 / span {Math.max(
								1,
								data.chapter.rows.length * 2 + 1
							)}"
						>
							<h2 class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
								{t('reader.notesColumn')}
							</h2>
							<NoteEditor
								action="?/saveChapterNote"
								reference="{data.shortBookName}{data.reference.chapter}"
								html={data.chapterNote}
								placeholder={t('lists.chapterNotePlaceholder')}
							/>
						</aside>
					{/if}

					{#each data.chapter.rows as row, rowIndex (row.verse)}
						{#if headings.has(row.verse)}
							<h2
								class="heading"
								class:hidden-on-mobile={mobileColumn === notesColumnIndex}
								style="grid-column: 1 / span {data.columns.length}; grid-row: {rowIndex * 2 + 1}"
							>
								{headings.get(row.verse)}
							</h2>
						{/if}

						{#each data.columns as column, columnIndex (column.resource.id)}
							{@const cell =
								column.bibleCellIndex === null ? null : row.cells[column.bibleCellIndex]}
							{#if column.resource.kind === 'bible' && cell}
								<p
									class="verse"
									class:hidden-on-mobile={columnIndex !== mobileColumn}
									id={columnIndex === 0
										? `${data.shortBookName}${data.reference.chapter}_${cell.verse}`
										: undefined}
									style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 +
										2} / span {cell.span * 2 - 1}"
									class:highlighted={data.reference.verse !== undefined &&
										cell.verse <= data.reference.verse &&
										(cell.verseEnd ?? cell.verse) >= data.reference.verse}
								>
									<a
										class="verse-number"
										class:in-list={inAnyList.has(cell.verse)}
										href={referencePath({
											book: data.reference.book,
											chapter: data.reference.chapter,
											verse: cell.verse
										})}
										aria-haspopup="menu"
										aria-label={t('verse.menu', {
											reference: formatReference(
												{
													book: data.reference.book,
													chapter: data.reference.chapter,
													verse: cell.verse
												},
												{ style: 'full' }
											)
										})}
										onclick={(event) =>
											onVerseNumberClick(event, cell.verse, cell.verseEnd, cell.segments)}
									>
										{cell.verse}{#if cell.verseEnd && cell.verseEnd > cell.verse}-{cell.verseEnd}{/if}
									</a><span
										class="verse-text"
										lang={data.columns[columnIndex]?.resource.language}
										dir={data.columns[columnIndex]?.resource.direction}
									>
										<VerseText
											segments={cell.segments}
											onStrongClick={(strong, word) => openStrong(strong, word, cell.verse)}
											activeStrong={activeStrong?.strong ?? null}
										/>
									</span>
								</p>
							{:else if column.resource.kind === 'commentary'}
								{@const entries = commentaryAt(column.resource.id, row.verse)}
								{#if entries.length > 0}
									<article
										class="reference-cell"
										class:hidden-on-mobile={columnIndex !== mobileColumn}
										style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 + 2}"
									>
										<span class="verse-number">{row.verse}</span>
										{#each entries as entry (entry.id)}
											{#if entry.title}
												<h3 class="mb-1 font-semibold">{entry.title}</h3>
											{/if}
											<!-- Imported commentary is reduced to an allow-list by its parser. -->
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											<div class="commentary-body">{@html entry.bodyHtml}</div>
										{/each}
									</article>
								{/if}
							{:else if column.resource.kind === 'xrefs'}
								{@const references = crossReferencesAt(column.resource.id, row.verse)}
								{#if references.length > 0}
									<div
										class="reference-cell"
										class:hidden-on-mobile={columnIndex !== mobileColumn}
										style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 + 2}"
									>
										<span class="verse-number">{row.verse}</span>
										<ul class="flex flex-wrap gap-1">
											{#each references as target (target.id)}
												<li>
													<a
														class="inline-block rounded border border-stone-200 px-1.5 py-0.5 text-xs
														       hover:border-accent-500 hover:text-accent-700 dark:border-stone-700
														       dark:hover:text-accent-300"
														href={referencePath({
															book: target.toBook,
															chapter: target.toChapter,
															verse: target.toVerse,
															...(target.toVerseEnd > target.toVerse
																? { verseEnd: target.toVerseEnd }
																: {})
														})}
													>
														{formatReference({
															book: target.toBook,
															chapter: target.toChapter,
															verse: target.toVerse,
															...(target.toVerseEnd > target.toVerse
																? { verseEnd: target.toVerseEnd }
																: {})
														})}
													</a>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							{/if}
						{/each}
					{/each}
				</div>

				<!-- Licence notices stay in the same columns as their respective translations. -->
				<footer
					class="license-grid mt-6 grid text-xs text-stone-500 dark:text-stone-400"
					style="--columns: {visibleColumnCount}"
				>
					{#each data.columns as column (column.resource.id)}
						<div class:hidden-on-mobile={column.index !== mobileColumn}>
							{#if column.resource.licenseHtml}
								<p><strong>{column.resource.abbrev}:</strong> {column.resource.licenseHtml}</p>
							{/if}
						</div>
					{/each}
				</footer>
			{/if}
		</div>
	</main>

	{#if activeStrong}
		<StudySidebar
			strong={activeStrong.strong}
			word={activeStrong.word}
			reference={activeStrong.reference}
			resourceIds={data.columns.map((column) => column.resource.id)}
			onClose={closeStrong}
		/>
	{/if}
</div>

<!-- One menu for the whole chapter, opened with whichever verse number was clicked. -->
<VerseMenu bind:this={verseMenu} lists={data.lists} signedIn={data.user !== null} {marks} />

<style>
	.verse-grid {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		column-gap: 0;
		align-items: start;
		border-radius: 0.5rem;
		background: rgb(255 255 255 / 0.42);
		box-shadow: 0 1px 0 rgb(120 113 108 / 0.08);
	}

	:global(.dark) .verse-grid {
		background: rgb(28 25 23 / 0.28);
	}

	.license-grid {
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
	}

	.reference-cell {
		min-width: 0;
		padding: 0.45rem 0.75rem 0.8rem;
		border-right: 1px solid var(--color-stone-100);
		font-size: 0.875rem;
		line-height: 1.55;
	}

	:global(.dark) .reference-cell {
		border-color: var(--color-stone-800);
	}

	.commentary-body :global(p + p) {
		margin-top: 0.5rem;
	}

	/* One column on a phone: the inactive ones are hidden and every cell moves to column 1. */
	@media (max-width: 639px) {
		.verse-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.license-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.hidden-on-mobile {
			display: none;
		}

		.verse {
			grid-column: 1 !important;
		}
	}

	.heading {
		margin: 1.5rem 0 0.25rem;
		padding: 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-stone-500);
	}

	.chapter-note {
		position: sticky;
		top: calc(var(--header-height) + 3.75rem);
		align-self: start;
		min-width: 0;
		margin: 0;
		padding: 0.8rem;
		border-left: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
		font-family: var(--font-sans);
	}

	:global(.dark) .chapter-note {
		border-left-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
	}

	@media (max-width: 639px) {
		.chapter-note {
			position: static;
			grid-column: 1 !important;
			grid-row: 1 !important;
			border-left: 0;
		}
	}

	:global(.dark) .heading {
		color: var(--color-stone-400);
	}

	.verse {
		align-self: stretch;
		margin: 0;
		padding: 0.48rem 0.8rem;
		font-family: var(--font-serif);
		font-size: calc(1.035rem * var(--reader-font-scale, 1));
		line-height: 1.72;
		border-left: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
		hyphens: auto;
	}

	.verse:nth-of-type(1) {
		border-left-color: transparent;
	}

	:global(.dark) .verse {
		border-left-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
	}

	.verse.highlighted {
		background-color: color-mix(in oklab, var(--color-accent-500) 12%, transparent);
	}

	/* The number opens the verse menu, so it needs to look and feel like a control rather than a
	   superscript: a tap target with some padding around the two digits. */
	.verse-number {
		display: inline-block;
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 600;
		vertical-align: 0.35em;
		margin-right: 0.15em;
		padding: 0.15em 0.25em;
		min-width: 1.4em;
		text-align: center;
		border-radius: 0.25rem;
		color: var(--color-stone-400);
		text-decoration: none;
		cursor: pointer;
	}

	.verse-number:hover,
	.verse-number:focus-visible {
		background-color: var(--color-stone-100);
		color: var(--color-accent-600);
	}

	:global(.dark) .verse-number:hover,
	:global(.dark) .verse-number:focus-visible {
		background-color: var(--color-stone-800);
		color: var(--color-accent-400);
	}

	/* Already saved in a verse list. Replaces the star that used to sit beside the number and break
	   the line, because a <form> is block-level content inside inline text. */
	.verse-number.in-list {
		color: var(--color-accent-500);
	}

	.verse-text {
		/* No `overflow-x` on the reader any more, so an unbreakable original-language word has to be
		   allowed to break rather than widen the page. */
		overflow-wrap: anywhere;

		/* Greek and Hebrew need their own faces; the attribute is set from the resource language. */
		&:where([lang='grc']) {
			font-family: var(--font-greek);
		}
		&:where([lang='hbo']) {
			font-family: var(--font-hebrew);
			font-size: 1.25rem;
		}
	}

	/* Room to scroll the last verses clear of the mobile study sheet. */
	@media (max-width: 639px) {
		.pb-sheet {
			padding-bottom: 72dvh;
		}
	}
</style>

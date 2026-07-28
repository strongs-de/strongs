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

	const unusedBibles = $derived(
		data.bibles.filter((bible) => !data.columns.some((column) => column.resource.id === bible.id))
	);
	const canAddColumn = $derived(data.columns.length < data.maxColumns && unusedBibles.length > 0);

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
			</div>

			<!-- Column headers double as the translation picker. The bar sticks as one piece; a single
			     header cell is never taller than itself and so could never stick on its own. -->
			<div
				class="sticky top-[var(--header-height)] z-10 mb-2 hidden gap-0 overflow-hidden rounded-md border
				       border-stone-200 bg-stone-50/95 py-1.5 shadow-sm backdrop-blur sm:grid
				       dark:border-stone-800 dark:bg-stone-950/95"
				style="grid-template-columns: repeat({data.columns.length}, minmax(0, 1fr))"
			>
				{#each data.columns as column (column.resource.id)}
					<ColumnPicker
						index={column.index}
						selected={column.resource}
						available={data.bibles}
						chosen={data.columns.map((other) => other.resource.id)}
						canRemove={data.columns.length > 1}
						canAdd={canAddColumn && column.index === data.columns.length - 1}
					/>
				{/each}
			</div>

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
						{#each unusedBibles as bible (bible.id)}
							<form
								method="POST"
								action="?/addColumn"
								role="none"
								use:enhance={() => {
									addColumnMenu?.close();
									return async ({ update }) => update({ reset: false });
								}}
							>
								<input type="hidden" name="resource" value={bible.id} />
								<button type="submit" role="menuitem">{bible.name}</button>
							</form>
						{/each}
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
					style="--columns: {data.columns.length}"
					data-mobile-column={mobileColumn}
				>
					{#each data.chapter.rows as row, rowIndex (row.verse)}
						{#if headings.has(row.verse)}
							<h2 class="heading" style="grid-row: {rowIndex * 2 + 1}">
								{headings.get(row.verse)}
							</h2>
						{/if}

						{#each row.cells as cell, columnIndex (columnIndex)}
							{#if cell}
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
							{/if}
						{/each}
					{/each}
				</div>

				<!-- Licence notices, one per column that has one. -->
				<footer class="mt-6 grid gap-4 text-xs text-stone-500 sm:grid-cols-2 dark:text-stone-400">
					{#each data.columns as column (column.resource.id)}
						{#if column.resource.licenseHtml}
							<p><strong>{column.resource.abbrev}:</strong> {column.resource.licenseHtml}</p>
						{/if}
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

	/* One column on a phone: the inactive ones are hidden and every cell moves to column 1. */
	@media (max-width: 639px) {
		.verse-grid {
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
		grid-column: 1 / -1;
		margin: 1.5rem 0 0.25rem;
		padding: 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-stone-500);
	}

	:global(.dark) .heading {
		color: var(--color-stone-400);
	}

	.verse {
		margin: 0;
		padding: 0.48rem 0.8rem;
		font-family: var(--font-serif);
		font-size: 1.035rem;
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

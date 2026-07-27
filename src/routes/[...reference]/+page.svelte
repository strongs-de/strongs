<script lang="ts">
	import { page } from '$app/state';
	import { referencePath } from '$lib/bible/reference';
	import { bookName } from '$lib/bible/book-names';
	import { t } from '$lib/i18n';
	import ColumnPicker from '$lib/components/ColumnPicker.svelte';
	import StudySidebar from '$lib/components/StudySidebar.svelte';
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
		const [strong, word] = hash.split('/');
		if (strong) {
			activeStrong = {
				strong: decodeURIComponent(strong),
				word: decodeURIComponent(word ?? ''),
				reference: data.title
			};
		}
	});

	function openStrong(strong: string, word: string) {
		activeStrong = { strong, word, reference: data.title };
		history.replaceState(
			null,
			'',
			`${page.url.pathname}#${encodeURIComponent(strong)}/${encodeURIComponent(word)}`
		);
	}

	function closeStrong() {
		activeStrong = null;
		history.replaceState(null, '', page.url.pathname);
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
	<main class="min-w-0 flex-1 overflow-x-auto">
		<div class="mx-auto max-w-[120rem] px-3 py-3 sm:px-4">
			<div class="mb-3 flex items-baseline justify-between gap-4">
				<h1 class="text-xl font-semibold tracking-tight sm:text-2xl">
					{bookName(data.reference.book)}
					{data.reference.chapter}
				</h1>
				<p class="text-xs text-stone-500 dark:text-stone-400">
					{t('search.hint.strong')}
				</p>
			</div>

			<!-- Column headers double as the translation picker. -->
			<div
				class="hidden gap-4 sm:grid"
				style="grid-template-columns: repeat({data.columns.length}, minmax(0, 1fr))"
			>
				{#each data.columns as column (column.resource.id)}
					<ColumnPicker
						index={column.index}
						selected={column.resource}
						available={data.bibles}
						chosen={data.columns.map((other) => other.resource.id)}
						canRemove={data.columns.length > 1}
					/>
				{/each}
			</div>

			<!-- On a phone one column fits; tabs switch between translations. -->
			<div class="flex gap-1 overflow-x-auto pb-2 sm:hidden">
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
										href={referencePath({
											book: data.reference.book,
											chapter: data.reference.chapter,
											verse: cell.verse
										})}
										aria-label="Vers {cell.verse}"
									>
										{cell.verse}{#if cell.verseEnd && cell.verseEnd > cell.verse}-{cell.verseEnd}{/if}
									</a>
									<span
										class="verse-text"
										lang={data.columns[columnIndex]?.resource.language}
										dir={data.columns[columnIndex]?.resource.direction}
									>
										<VerseText
											segments={cell.segments}
											onStrongClick={openStrong}
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

<style>
	.verse-grid {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		column-gap: 1rem;
		align-items: start;
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
		margin: 1.25rem 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-stone-500);
	}

	:global(.dark) .heading {
		color: var(--color-stone-400);
	}

	.verse {
		margin: 0;
		padding: 0.35rem 0.25rem;
		font-family: var(--font-serif);
		font-size: 1.02rem;
		line-height: 1.65;
		border-radius: 0.375rem;
		hyphens: auto;
	}

	.verse.highlighted {
		background-color: color-mix(in oklab, var(--color-accent-500) 12%, transparent);
	}

	.verse-number {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 600;
		vertical-align: 0.35em;
		margin-right: 0.3em;
		color: var(--color-stone-400);
		text-decoration: none;
	}

	.verse-number:hover {
		color: var(--color-accent-600);
	}

	.verse-text {
		/* Greek and Hebrew need their own faces; the attribute is set from the resource language. */
		&:where([lang='grc']) {
			font-family: var(--font-greek);
		}
		&:where([lang='hbo']) {
			font-family: var(--font-hebrew);
			font-size: 1.25rem;
		}
	}
</style>

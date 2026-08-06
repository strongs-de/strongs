<script lang="ts">
	import { formatReference, referencePath } from '$lib/bible/reference';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { formatNumber, t } from '$lib/i18n';
	import { verseHoverPopover } from '$lib/actions/verse-hover-popover';
	import VerseText from '$lib/components/VerseText.svelte';
	import GlossChart from '$lib/components/GlossChart.svelte';
	import BookDistribution from '$lib/components/BookDistribution.svelte';
	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	const pageBase = $derived(`/${data.strong}`);

	function filterQuery(options: { book?: number | null; gloss?: string | null }): string {
		const query = new SvelteURLSearchParams();
		const book = options.book === undefined ? data.book : options.book;
		const gloss = options.gloss === undefined ? data.gloss : options.gloss;
		if (book) query.set('book', String(book));
		if (gloss) query.set('gloss', gloss);
		const value = query.toString();
		return value ? `?${value}` : '';
	}
</script>

<svelte:head>
	<title>{data.strong}{data.entry ? ` — ${data.entry.lemma}` : ''} — strongs.de</title>
	<meta
		name="description"
		content="{data.strong}: {data.entry?.definitionHtml
			? data.entry.definitionHtml.replace(/<[^>]*>/g, '')
			: 'Alle Bibelstellen'} — {formatNumber(data.statistics.occurrences)} Vorkommen."
	/>
</svelte:head>

<main class="mx-auto w-full max-w-[90rem] px-3 py-5 sm:px-5">
	<header class="mb-6">
		<p class="text-xs font-semibold tracking-wide text-stone-500 uppercase">
			{t('strong.title', { id: data.strong })}
		</p>

		{#if data.entry}
			<h1
				class="mt-1 text-3xl"
				lang={data.entry.language}
				dir={data.entry.language === 'hbo' ? 'rtl' : 'ltr'}
				style="font-family: var({data.entry.language === 'hbo' ? '--font-hebrew' : '--font-greek'})"
			>
				{data.entry.lemma}
			</h1>
			<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
				{#if data.entry.transliteration}{data.entry.transliteration}{/if}
				{#if data.entry.pronunciation}<span class="mx-1">·</span>[{data.entry.pronunciation}]{/if}
			</p>
		{:else}
			<h1 class="mt-1 text-2xl font-semibold">{data.strong}</h1>
		{/if}
	</header>

	<div class="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
		<section>
			<h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase">
				{t('strong.occurrences')}
			</h2>
			<p class="mb-3 text-sm text-stone-500 dark:text-stone-400">
				{t('strong.occurrencesCount', {
					count: formatNumber(data.statistics.occurrences),
					verses: formatNumber(data.statistics.verseCount)
				})}
				{#if data.resource}<span class="text-stone-400"> · {data.resource.abbrev}</span>{/if}
			</p>

			{#if data.glosses.length > 0}
				<details
					class="mb-5 rounded-lg border border-stone-200 p-3 lg:hidden dark:border-stone-800"
				>
					<summary class="cursor-pointer text-sm font-semibold">
						{t('strong.filterTranslation')}{data.gloss ? `: ${data.gloss}` : ''}
					</summary>
					<ul class="mt-3 flex flex-wrap gap-1.5">
						{#each data.glosses as gloss (gloss.display)}
							<li>
								<a
									class="inline-flex rounded-full border border-stone-300 px-2.5 py-1 text-xs dark:border-stone-700"
									class:border-accent-600={data.gloss?.toLocaleLowerCase('de') ===
										gloss.display.toLocaleLowerCase('de')}
									class:bg-accent-50={data.gloss?.toLocaleLowerCase('de') ===
										gloss.display.toLocaleLowerCase('de')}
									href="/{data.strong}{filterQuery({ gloss: gloss.display })}"
								>
									{gloss.display} · {formatNumber(gloss.occurrences)}
								</a>
							</li>
						{/each}
					</ul>
					{#if data.gloss}
						<Button
							href="/{data.strong}{filterQuery({ gloss: null })}"
							size="sm"
							variant="secondary"
							class="mt-3"
						>
							{t('strong.clearTranslationFilter')}
						</Button>
					{/if}
				</details>
			{/if}

			<div class="mb-6">
				<BookDistribution
					counts={data.bookCounts}
					hrefForBook={(book) => `/${data.strong}${filterQuery({ book })}`}
					activeBook={data.book}
				/>
				{#if data.book}
					<Button
						href="/{data.strong}{filterQuery({ book: null })}"
						size="sm"
						variant="secondary"
						class="mt-1"
					>
						{t('statistics.clearFilter')}
					</Button>
				{/if}
			</div>

			<ol class="space-y-3">
				{#each data.occurrences.occurrences as occurrence (`${occurrence.book}-${occurrence.chapter}-${occurrence.verse}`)}
					<li
						class="rounded-lg border border-stone-200 p-3 sm:rounded-none sm:border-0 sm:border-l-2 sm:py-0 sm:pr-0 dark:border-stone-700"
					>
						<a
							class="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400"
							href="{referencePath({
								book: occurrence.book,
								chapter: occurrence.chapter,
								verse: occurrence.verse
							})}#{encodeURIComponent(data.strong)}"
						>
							{formatReference(
								{ book: occurrence.book, chapter: occurrence.chapter, verse: occurrence.verse },
								{ style: 'full' }
							)}
						</a>
						<p class="scripture-sized mt-0.5 font-serif leading-relaxed">
							<VerseText segments={occurrence.segments} activeStrong={data.strong} />
						</p>
					</li>
				{/each}
			</ol>

			{#if data.occurrences.pageCount > 1}
				<nav class="mt-6 flex items-center gap-3 text-sm" aria-label="Seiten">
					{#if data.occurrences.page > 1}
						<a
							class="rounded border border-stone-300 px-3 py-1 hover:border-accent-500 dark:border-stone-700"
							href="{data.occurrences.page === 2
								? pageBase
								: `${pageBase}/${data.occurrences.page - 1}`}{filterQuery({})}"
							rel="prev">←</a
						>
					{/if}
					<span class="text-stone-500 dark:text-stone-400">
						{t('search.page', {
							page: data.occurrences.page,
							pages: data.occurrences.pageCount
						})}
					</span>
					{#if data.occurrences.page < data.occurrences.pageCount}
						<a
							class="rounded border border-stone-300 px-3 py-1 hover:border-accent-500 dark:border-stone-700"
							href="{pageBase}/{data.occurrences.page + 1}{filterQuery({})}"
							rel="next">→</a
						>
					{/if}
				</nav>
			{/if}
		</section>

		<aside class="space-y-6 text-sm">
			{#if data.entry?.definitionHtml}
				<section>
					<h2 class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t('strong.definition')}
					</h2>
					<!-- Built by our own parser with every source string escaped; see
					     src/lib/bible/parse/strongs-xml.ts. -->
					<div class="lexicon" use:verseHoverPopover={{ bibleId: data.primaryBibleId }}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html data.entry.definitionHtml}
					</div>
				</section>
			{/if}

			{#if data.entry?.derivationHtml}
				<section>
					<h2 class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t('strong.derivation')}
					</h2>
					<div class="lexicon" use:verseHoverPopover={{ bibleId: data.primaryBibleId }}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html data.entry.derivationHtml}
					</div>
				</section>
			{/if}

			{#if data.glosses.length > 0}
				<section>
					<h2 class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t('strong.translations')}
					</h2>
					<p class="mb-2 text-xs text-stone-500 dark:text-stone-400">
						{t('strong.translationsHint')}
					</p>
					<GlossChart
						glosses={data.glosses}
						hrefForGloss={(gloss) => `/${data.strong}${filterQuery({ gloss })}`}
						activeGloss={data.gloss}
					/>
					{#if data.gloss}
						<Button
							href="/{data.strong}{filterQuery({ gloss: null })}"
							size="sm"
							variant="secondary"
							class="mt-2"
						>
							{t('strong.clearTranslationFilter')}
						</Button>
					{/if}
				</section>
			{/if}

			{#if data.entry && data.entry.seeAlso.length > 0}
				<section>
					<h2 class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t('action.more')}
					</h2>
					<ul class="flex flex-wrap gap-1">
						{#each data.entry.seeAlso as reference (reference)}
							<li>
								<a
									class="inline-block rounded border border-stone-200 px-2 py-0.5 text-xs hover:border-accent-500 dark:border-stone-700"
									href="/{reference}">{reference}</a
								>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</aside>
	</div>
</main>

<style>
	.lexicon :global(a) {
		color: var(--color-accent-600);
		text-decoration: none;
	}

	.lexicon :global(a:hover) {
		text-decoration: underline;
	}

	:global(.dark) .lexicon :global(a) {
		color: var(--color-accent-400);
	}

	.lexicon :global(.original) {
		font-family: var(--font-greek);
	}

	.lexicon :global(abbr) {
		cursor: help;
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, currentColor 40%, transparent);
	}

	/* A real <a>, so it already gets the pointer cursor a link implies; only the underline needs to
	   read as distinct from the plain cross-reference links above. */
	.lexicon :global(.verse-ref) {
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, var(--color-accent-500) 50%, transparent);
	}

	.lexicon :global(.verse-ref:hover) {
		text-decoration-style: solid;
	}

	/* Groups the related words listed under a "Wortfamilie:" heading, so they read as belonging to it
	   rather than continuing the entry's own numbered senses above. */
	.lexicon :global(.wf-entry) {
		display: block;
		margin-top: 0.35rem;
		margin-left: 0.9rem;
		padding-left: 0.6rem;
		border-left: 2px solid var(--color-stone-200);
	}

	:global(.dark) .lexicon :global(.wf-entry) {
		border-left-color: var(--color-stone-700);
	}
</style>

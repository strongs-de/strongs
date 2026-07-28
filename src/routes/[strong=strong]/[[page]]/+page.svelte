<script lang="ts">
	import { formatReference, referencePath } from '$lib/bible/reference';
	import { formatNumber, t } from '$lib/i18n';
	import VerseText from '$lib/components/VerseText.svelte';
	import GlossChart from '$lib/components/GlossChart.svelte';
	import BookDistribution from '$lib/components/BookDistribution.svelte';

	let { data } = $props();

	const pageBase = $derived(`/${data.strong}`);
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

			<div class="mb-6">
				<BookDistribution
					counts={data.bookCounts}
					hrefForBook={(book) => `/${data.strong}?book=${book}`}
					activeBook={data.book}
				/>
				{#if data.book}
					<a
						class="mt-1 inline-block text-xs text-accent-600 hover:underline dark:text-accent-400"
						href="/{data.strong}"
					>
						{t('statistics.clearFilter')}
					</a>
				{/if}
			</div>

			<ol class="space-y-3">
				{#each data.occurrences.occurrences as occurrence (`${occurrence.book}-${occurrence.chapter}-${occurrence.verse}`)}
					<li class="border-l-2 border-stone-200 pl-3 dark:border-stone-700">
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
								: `${pageBase}/${data.occurrences.page - 1}`}{data.book
								? `?book=${data.book}`
								: ''}"
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
							href="{pageBase}/{data.occurrences.page + 1}{data.book ? `?book=${data.book}` : ''}"
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
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="lexicon">{@html data.entry.definitionHtml}</div>
				</section>
			{/if}

			{#if data.entry?.derivationHtml}
				<section>
					<h2 class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
						{t('strong.derivation')}
					</h2>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="lexicon">{@html data.entry.derivationHtml}</div>
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
					<GlossChart glosses={data.glosses} />
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
</style>

<script lang="ts">
	import { formatReference, referencePath } from '$lib/bible/reference';
	import VerseText from '$lib/components/VerseText.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.list.title} — strongs.de</title>
	<!-- A shared link is meant for the people it was given to, not for search engines. -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
	<header>
		<h1 class="text-2xl font-semibold">{data.list.title}</h1>
		{#if data.translation}
			<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{data.translation}</p>
		{/if}
	</header>

	<ol class="space-y-5">
		{#each data.items as item (item.id)}
			<li>
				<a
					class="text-sm font-semibold text-accent-600 hover:underline dark:text-accent-400"
					href={referencePath({ book: item.book, chapter: item.chapter, verse: item.verse })}
				>
					{formatReference(
						{ book: item.book, chapter: item.chapter, verse: item.verse },
						{ style: 'full' }
					)}
				</a>

				{#if item.segments}
					<p class="font-serif leading-relaxed">
						<VerseText segments={item.segments} />
					</p>
				{/if}

				{#if item.noteHtml}
					<!-- Sanitised when saved; see src/lib/notes/sanitize.ts. -->
					<div class="note mt-1 border-l-2 border-accent-300 pl-3 text-sm dark:border-accent-800">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html item.noteHtml}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</main>

<style>
	.note :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	.note :global(p) {
		margin: 0 0 0.5em;
	}
</style>

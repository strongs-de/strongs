<script lang="ts">
	import { segmentsToText, type VerseSegment } from '$lib/bible/segments';
	import { shouldHighlight } from '$lib/bible/search-query';

	/**
	 * A verse with the searched words marked.
	 *
	 * The text is split into words in the browser and compared against the query terms, rather than
	 * using PostgreSQL's `ts_headline`. That keeps result HTML out of the database layer and means the
	 * same component works for any text, but it is approximate: the index matches stems, and a stem
	 * cannot be mapped back to every form it covers, so matching is by shortened prefix.
	 */
	let { segments, needles }: { segments: VerseSegment[]; needles: string[] } = $props();

	const parts = $derived(
		segmentsToText(segments)
			.split(/(\s+)/)
			.map((part) => ({ text: part, mark: shouldHighlight(part, needles) }))
	);
</script>

{#each parts as part, index (index)}{#if part.mark}<mark>{part.text}</mark
		>{:else}{part.text}{/if}{/each}

<style>
	mark {
		background-color: color-mix(in oklab, var(--color-accent-500) 28%, transparent);
		color: inherit;
		border-radius: 0.15rem;
		padding: 0 0.1em;
	}
</style>

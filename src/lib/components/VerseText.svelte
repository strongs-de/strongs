<script lang="ts">
	import type { VerseSegment } from '$lib/bible/segments';
	// Imported for the recursive case (words of Jesus can contain tagged words). Svelte 5 prefers a
	// self-import over <svelte:self>.
	import VerseText from './VerseText.svelte';
	import Footnote from './Footnote.svelte';

	/**
	 * Renders a verse from its stored segments.
	 *
	 * Structure comes from the database, so there is no HTML parsing, no `{@html}` and no way for
	 * imported text to inject markup — the reason verse content is stored as segments rather than as
	 * the HTML soup the previous version rebuilt on every request.
	 */
	let {
		segments,
		onStrongClick,
		activeStrong = null
	}: {
		segments: VerseSegment[];
		/** Called when a tagged word is activated; the reader opens the study sidebar. */
		onStrongClick?: (strong: string, word: string) => void;
		/** Highlights every occurrence of the Strong's number currently shown in the sidebar. */
		activeStrong?: string | null;
	} = $props();
</script>

{#each segments as segment, index (index)}
	{#if typeof segment === 'string'}{segment}{:else if segment.kind === 'w'}<button
			type="button"
			class="strong"
			class:active={activeStrong !== null &&
				(segment.strong === activeStrong || segment.strongs?.includes(activeStrong))}
			data-strong={segment.strong}
			title={segment.morph ?? undefined}
			onclick={() => onStrongClick?.(segment.strong, segment.text)}>{segment.text}</button
		>{:else if segment.kind === 'em'}<em>{segment.text}</em
		>{:else if segment.kind === 'note'}<Footnote
			marker={segment.marker}
			text={segment.text}
		/>{:else if segment.kind === 'br'}<br />{:else if segment.kind === 'wj'}<span
			class="words-of-jesus"
			><VerseText
				segments={segment.children as VerseSegment[]}
				{onStrongClick}
				{activeStrong}
			/></span
		>{/if}{/each}

<style>
	/* Tagged words are darker and get an underline on hover, the affordance the old site used too. */
	.strong {
		display: inline;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-align: inherit;
		cursor: pointer;
		text-decoration-line: underline;
		text-decoration-style: dotted;
		text-decoration-color: color-mix(in oklab, currentColor 30%, transparent);
		text-underline-offset: 0.2em;
	}

	.strong:hover,
	.strong:focus-visible {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent-500);
	}

	.strong.active {
		background-color: color-mix(in oklab, var(--color-accent-500) 22%, transparent);
		border-radius: 0.2rem;
	}

	.words-of-jesus {
		color: oklch(0.5 0.17 25);
	}

	:global(.dark) .words-of-jesus {
		color: oklch(0.72 0.15 25);
	}
</style>

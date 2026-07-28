<script lang="ts">
	import { formatNumber } from '$lib/i18n';

	/**
	 * How often a translation renders a word each way, as a horizontal bar list.
	 *
	 * Bars are scaled to the most frequent rendering rather than to the total, because the interesting
	 * comparison is between the alternatives, and the long tail would otherwise be invisible.
	 */
	let { glosses }: { glosses: { display: string; occurrences: number }[] } = $props();

	const max = $derived(glosses.reduce((widest, gloss) => Math.max(widest, gloss.occurrences), 1));
</script>

<ul class="space-y-1">
	{#each glosses as gloss (gloss.display)}
		<li class="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2">
			<span class="truncate" title={gloss.display}>{gloss.display}</span>
			<span class="h-2 rounded-full bg-stone-100 dark:bg-stone-800">
				<span
					class="block h-2 rounded-full bg-accent-500/80"
					style="width: {Math.max(3, (gloss.occurrences / max) * 100)}%"
				></span>
			</span>
			<span class="text-right text-xs text-stone-500 tabular-nums dark:text-stone-400">
				{formatNumber(gloss.occurrences)}
			</span>
		</li>
	{/each}
</ul>

<script lang="ts">
	import { t, type MessageKey } from '$lib/i18n';
	import { de } from '$lib/i18n/de';

	/**
	 * Renders a decoded morphology code as a definition list.
	 *
	 * The decoder returns message keys rather than text, so this is where German appears. Values that
	 * have an explanation get it as a tooltip — the same Wikipedia summaries the old site pasted into
	 * `title` attributes, but from the message catalogue instead of from string concatenation in
	 * `grammar_parser.py`.
	 */
	let {
		morphology
	}: {
		morphology: {
			code: string;
			partOfSpeech: string;
			features: { feature: string; value: string }[];
			unknown: string[];
		};
	} = $props();

	/** `morph.mood.aorist` has an explanation at `morph.explain.aorist`, when one exists. */
	function explanation(valueKey: string): string | undefined {
		const name = valueKey.split('.').at(-1);
		const key = `morph.explain.${name}`;
		return key in de ? t(key as MessageKey) : undefined;
	}

	const label = (key: string) => t(key as MessageKey);
</script>

<p class="mb-1 font-medium">
	{label(morphology.partOfSpeech)}
	<span class="ml-1 font-mono text-xs text-stone-400">{morphology.code}</span>
</p>

{#if morphology.features.length > 0}
	<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
		{#each morphology.features as feature (feature.feature + feature.value)}
			<dt class="text-stone-500 dark:text-stone-400">{label(feature.feature)}</dt>
			<dd>
				{#if explanation(feature.value)}
					<abbr class="cursor-help decoration-dotted" title={explanation(feature.value)}>
						{label(feature.value)}
					</abbr>
				{:else}
					{label(feature.value)}
				{/if}
			</dd>
		{/each}
	</dl>
{/if}

{#if morphology.unknown.length > 0}
	<!-- Never hide a code fragment we could not interpret: it is a hint that the decoder needs work. -->
	<p class="mt-1 font-mono text-xs text-stone-400">{morphology.unknown.join(' · ')}</p>
{/if}

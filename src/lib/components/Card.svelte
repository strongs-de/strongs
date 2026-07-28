<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A titled panel.
	 *
	 * Settings and verse lists are lists of unrelated things, and a border around each one is what
	 * tells a reader where one ends and the next begins — the account page had none, so it read as one
	 * long column of forms.
	 */
	let {
		title,
		description,
		children,
		actions,
		footer
	}: {
		title?: string;
		description?: string;
		children: Snippet;
		/** Controls shown next to the title, e.g. a link out of the card. */
		actions?: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<section
	class="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_4px_18px_rgb(28_25_23/0.05)]
	       dark:border-stone-800 dark:bg-stone-900/70 dark:shadow-black/15"
>
	{#if title || actions}
		<header
			class="flex items-start justify-between gap-4 bg-stone-50/70 px-4 py-3.5 sm:px-5 dark:bg-stone-900/80"
		>
			<div class="min-w-0">
				{#if title}<h2 class="font-serif text-lg font-semibold text-stone-800 dark:text-stone-100">
						{title}
					</h2>{/if}
				{#if description}
					<p class="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>
				{/if}
			</div>
			{#if actions}<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}

	<div class="border-t border-stone-200 px-4 py-4 sm:px-5 dark:border-stone-800">
		{@render children()}
	</div>

	{#if footer}
		<footer class="border-t border-stone-200 px-4 py-3 text-sm sm:px-5 dark:border-stone-800">
			{@render footer()}
		</footer>
	{/if}
</section>

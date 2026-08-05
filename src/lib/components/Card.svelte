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
	class="overflow-hidden rounded-2xl border border-stone-200/80 bg-[color:var(--surface)] shadow-[var(--shadow-soft)]
	       dark:border-white/8"
>
	{#if title || actions}
		<header
			class="flex items-start justify-between gap-5 bg-stone-50/55 px-5 py-4 sm:px-6 dark:bg-white/2"
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

	<div class="border-t border-stone-200/80 px-5 py-5 sm:px-6 dark:border-white/8">
		{@render children()}
	</div>

	{#if footer}
		<footer class="border-t border-stone-200/80 px-5 py-3.5 text-sm sm:px-6 dark:border-white/8">
			{@render footer()}
		</footer>
	{/if}
</section>

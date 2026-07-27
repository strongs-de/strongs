<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Shared shell for the sign-in, registration and password-reset forms. */
	let {
		title,
		error = null,
		notice = null,
		submitLabel,
		children,
		footer
	}: {
		title: string;
		error?: string | null;
		notice?: string | null;
		submitLabel: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<main class="mx-auto w-full max-w-sm px-4 py-10">
	<h1 class="mb-5 text-xl font-semibold">{title}</h1>

	{#if error}
		<p
			class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800
			       dark:border-red-900 dark:bg-red-950 dark:text-red-200"
			role="alert"
		>
			{error}
		</p>
	{/if}

	{#if notice}
		<p
			class="mb-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm
			       dark:border-stone-800 dark:bg-stone-900"
		>
			{notice}
		</p>
	{/if}

	<form method="POST" class="space-y-4">
		{@render children()}

		<button
			type="submit"
			class="w-full rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white
			       hover:bg-accent-700 focus-visible:outline-2"
		>
			{submitLabel}
		</button>
	</form>

	{#if footer}
		<div class="mt-5 text-sm text-stone-600 dark:text-stone-300">{@render footer()}</div>
	{/if}
</main>

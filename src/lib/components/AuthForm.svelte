<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Shared shell for the sign-in, registration and password-reset forms. */
	let {
		title,
		error = null,
		notice = null,
		submitLabel,
		action = undefined,
		children,
		footer
	}: {
		title: string;
		error?: string | null;
		notice?: string | null;
		submitLabel: string;
		/** Targets a named action (e.g. `?/login`) instead of the route's default one. */
		action?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<main
	class="mx-auto my-8 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-stone-200 bg-white px-6 py-7
			 shadow-[0_12px_40px_rgb(28_25_23/0.08)] dark:border-stone-800 dark:bg-stone-900/70"
>
	<div class="mb-6 flex items-center gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
		<img src="/icon.png" alt="" class="size-9 rounded-sm" />
		<h1 class="font-serif text-2xl font-semibold text-stone-800 dark:text-stone-100">{title}</h1>
	</div>

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

	<form {action} method="POST" class="space-y-4">
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

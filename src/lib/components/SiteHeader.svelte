<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import ThemeToggle from './ThemeToggle.svelte';

	/**
	 * The single input that accepts everything: a reference, a word, or a Strong's number. Submitting
	 * navigates to `/<input>`, where the resolver decides what it was — the same idea as the old
	 * search box, minus the four different code paths behind it.
	 */
	let {
		query = '',
		previous = null,
		next = null,
		user = null
	}: {
		query?: string;
		previous?: string | null;
		next?: string | null;
		user?: { displayName: string | null; email: string; role: string } | null;
	} = $props();

	// A writable derived: it follows the current reference as you navigate, but typing overrides it.
	let value = $derived(query);
	let input: HTMLInputElement | undefined = $state();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;
		await goto(`/${encodeURIComponent(trimmed)}`);
		input?.blur();
	}

	/**
	 * Typing anywhere focuses the search box, as on the old site, and the arrow keys page through
	 * chapters. Both are skipped while a field or a modifier key is in play.
	 */
	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing =
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target?.isContentEditable === true;

		if (event.metaKey || event.ctrlKey || event.altKey) return;

		if (!typing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
			const destination = event.key === 'ArrowLeft' ? previous : next;
			if (destination) {
				event.preventDefault();
				void goto(destination);
			}
			return;
		}

		if (typing) return;

		if (event.key === '/' || (event.key.length === 1 && /\S/.test(event.key))) {
			event.preventDefault();
			value = event.key === '/' ? '' : event.key;
			input?.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<header
	class="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
>
	<div class="mx-auto flex max-w-[120rem] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
		<a
			href="/"
			class="shrink-0 text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100"
		>
			strongs<span class="text-accent-600 dark:text-accent-400">.de</span>
		</a>

		<form class="min-w-0 flex-1" onsubmit={submit} role="search">
			<label class="sr-only" for="site-search">{t('nav.search.placeholder')}</label>
			<input
				bind:this={input}
				bind:value
				id="site-search"
				type="search"
				autocomplete="off"
				spellcheck="false"
				enterkeyhint="search"
				placeholder={t('nav.search.placeholder')}
				class="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm
				       placeholder:text-stone-400 focus:border-accent-500 focus:bg-white focus:outline-none
				       dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-500 dark:focus:bg-stone-900"
			/>
		</form>

		<nav class="flex shrink-0 items-center gap-1">
			{#if previous}
				<a
					href={previous}
					rel="prev"
					title={t('nav.previousChapter')}
					aria-label={t('nav.previousChapter')}
					class="rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
					       dark:hover:bg-stone-800 dark:hover:text-stone-100"
				>
					<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M12.79 5.23a.75.75 0 0 1-.02 1.06L9.06 10l3.71 3.71a.75.75 0 1 1-1.06 1.06l-4.24-4.24a.75.75 0 0 1 0-1.06l4.24-4.25a.75.75 0 0 1 1.08.02Z"
						/>
					</svg>
				</a>
			{/if}
			{#if next}
				<a
					href={next}
					rel="next"
					title={t('nav.nextChapter')}
					aria-label={t('nav.nextChapter')}
					class="rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
					       dark:hover:bg-stone-800 dark:hover:text-stone-100"
				>
					<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.25a.75.75 0 0 1-1.08-.02Z"
						/>
					</svg>
				</a>
			{/if}

			<ThemeToggle />

			{#if user}
				<a
					href="/account"
					class="hidden rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100
					       sm:block dark:text-stone-300 dark:hover:bg-stone-800"
				>
					{user.displayName ?? user.email}
				</a>
				{#if user.role === 'admin'}
					<a
						href="/admin"
						class="hidden rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100
						       sm:block dark:text-stone-300 dark:hover:bg-stone-800"
					>
						{t('nav.admin')}
					</a>
				{/if}
			{:else}
				<a
					href="/login"
					class="rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100
					       dark:text-stone-300 dark:hover:bg-stone-800"
					data-active={page.url.pathname === '/login' ? 'true' : undefined}
				>
					{t('nav.login')}
				</a>
			{/if}
		</nav>
	</div>
</header>

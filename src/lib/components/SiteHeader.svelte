<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseReference } from '$lib/bible/reference';
	import { jumpToVerse } from '$lib/reader-location.svelte';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';
	import ReaderViewMenu from './ReaderViewMenu.svelte';
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
		user = null,
		readerPreferences = null
	}: {
		query?: string;
		previous?: string | null;
		next?: string | null;
		user?: { displayName: string | null; email: string; role: string } | null;
		readerPreferences?: { fontScale: number } | null;
	} = $props();

	/**
	 * Follows `query` as the reader navigates or scrolls — but only while the field is not focused.
	 * `query` now also moves in the background as the reader scrolls the reader (see
	 * `reader-location.svelte.ts`), and a plain `$derived` would silently overwrite whatever the reader
	 * had just typed the moment that next scroll update landed, before they got to press Enter.
	 */
	let value = $state(query);
	let focused = $state(false);
	$effect(() => {
		if (!focused) value = query;
	});
	let input: HTMLInputElement | undefined = $state();
	let userMenu: Menu | undefined = $state();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;

		// A reference already on screen — or already loaded via infinite scroll further up or down the
		// stream — would otherwise be a no-op: the URL `goto` below would navigate to is the one already
		// showing, and the reader may since have scrolled away from it. Scrolling there directly covers
		// that; anything not already loaded (a different chapter, a word, a Strong's number) falls
		// through to a real navigation exactly as before.
		const reference = parseReference(trimmed);
		if (reference && jumpToVerse?.(reference)) {
			input?.blur();
			return;
		}

		await goto(`/${encodeURIComponent(trimmed)}`, { noScroll: true });
		input?.blur();
	}

	/**
	 * `/` on its own resumes the last chapter read, via a cookie — useful when typed directly, but it
	 * means this link would otherwise just bounce a click straight back to wherever the reader already
	 * is. Clearing the cookie first makes "Startseite" actually mean home; `data-sveltekit-preload-data
	 * ="off"` on the link matters too, or hovering it would preload `/`'s data — reading the cookie —
	 * before this handler ever runs, and the click would reuse that stale, already-fetched redirect.
	 */
	function goHome(): void {
		document.cookie = 'location=; path=/; max-age=0; samesite=lax';
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
	class="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 shadow-[0_1px_8px_rgb(28_25_23/0.06)]
	       backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-accent-500
	       dark:border-stone-800 dark:bg-stone-950/95 dark:shadow-black/20"
>
	<div
		class="mx-auto flex h-[var(--header-height)] max-w-[var(--content-max-width)] items-center gap-2 px-3 pt-0.5 sm:gap-5 sm:px-5"
	>
		<a
			href="/"
			onclick={goHome}
			data-sveltekit-preload-data="off"
			class="group shrink-0 focus-visible:rounded-sm"
			aria-label="Strongs.de – Startseite"
		>
			<img src="/logo.png" alt="Strongs.de" class="hidden h-10 w-auto sm:block" />
			<img src="/icon.png" alt="" class="size-9 rounded-sm sm:hidden" />
		</a>

		<div class="flex min-w-0 flex-1 items-center justify-center gap-0.5">
			{#if previous}
				<a
					href={previous}
					rel="prev"
					title={t('nav.previousChapter')}
					aria-label={t('nav.previousChapter')}
					class="shrink-0 rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
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

			<form class="w-full max-w-sm min-w-0" onsubmit={submit} role="search">
				<label class="sr-only" for="site-search">{t('nav.search.placeholder')}</label>
				<div class="relative">
					<svg
						viewBox="0 0 20 20"
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M9 3.5a5.5 5.5 0 1 0 3.66 9.605l3.617 3.618a.75.75 0 1 0 1.06-1.06l-3.617-3.618A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
						/>
					</svg>
					<input
						bind:this={input}
						bind:value
						onfocus={() => (focused = true)}
						onblur={() => (focused = false)}
						id="site-search"
						type="search"
						autocomplete="off"
						spellcheck="false"
						enterkeyhint="search"
						placeholder={t('nav.search.placeholder')}
						class="w-full rounded-md border-2 border-stone-400 bg-stone-100/70 py-2 pr-3 pl-9 text-sm
						       shadow-inner shadow-stone-900/3 placeholder:text-stone-400 focus:border-accent-500
						       focus:bg-white focus:ring-3 focus:ring-accent-500/10 focus:outline-none dark:border-stone-600
						       dark:bg-stone-900 dark:shadow-black/20 dark:placeholder:text-stone-500 dark:focus:bg-stone-900"
					/>
				</div>
			</form>

			{#if next}
				<a
					href={next}
					rel="next"
					title={t('nav.nextChapter')}
					aria-label={t('nav.nextChapter')}
					class="shrink-0 rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
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
		</div>

		<nav class="flex shrink-0 items-center gap-0.5 sm:gap-1">
			{#if readerPreferences}
				<ReaderViewMenu fontScale={readerPreferences.fontScale} />
			{:else}
				<ThemeToggle />
			{/if}

			<button
				type="button"
				aria-label={t('nav.userMenu')}
				aria-haspopup="menu"
				class="flex items-center gap-1 rounded-md py-1.5 pr-1 pl-1.5 text-stone-600 hover:bg-stone-100
				       dark:text-stone-300 dark:hover:bg-stone-800"
				onclick={(event) => userMenu?.openAt(event.currentTarget)}
			>
				<svg viewBox="0 0 20 20" class="size-6 shrink-0" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm-6.503 6.855A5.501 5.501 0 0 1 10 12a5.5 5.5 0 0 1 4.001 2.355 6.478 6.478 0 0 1-8.004 0Z"
						clip-rule="evenodd"
					/>
				</svg>
				{#if user}
					<span class="hidden max-w-32 truncate text-sm font-medium sm:block">
						{user.displayName ?? user.email}
					</span>
				{/if}
				<svg viewBox="0 0 20 20" class="size-4 shrink-0 text-stone-400" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>

			<Menu bind:this={userMenu} label={t('nav.userMenu')}>
				{#if user}
					<a href="/account" role="menuitem" data-sveltekit-preload-data="hover"
						>{t('nav.account')}</a
					>
					{#if user.role === 'admin'}
						<a href="/admin" role="menuitem" data-sveltekit-preload-data="hover">{t('nav.admin')}</a
						>
					{/if}
					<hr />
					<a href="/help" role="menuitem">{t('nav.help')}</a>
				{:else}
					<a href="/help" role="menuitem">{t('nav.help')}</a>
					<hr />
					<a href="/login" role="menuitem">{t('nav.login')}</a>
				{/if}
				<hr />
				<a href="/impressum" role="menuitem">{t('nav.impressum')}</a>
				<a href="/datenschutz" role="menuitem">{t('nav.datenschutz')}</a>
				{#if user}
					<hr />
					<form method="POST" action="/logout" role="none">
						<button type="submit" role="menuitem">{t('auth.logout.submit')}</button>
					</form>
				{/if}
			</Menu>
		</nav>
	</div>
</header>

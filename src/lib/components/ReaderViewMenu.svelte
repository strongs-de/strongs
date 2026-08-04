<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';

	let {
		fontScale
	}: {
		fontScale: number;
	} = $props();

	let menu = $state<Menu | undefined>();
	let dark = $state(
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
	);

	function setTheme(next: boolean) {
		dark = next;
		document.documentElement.classList.toggle('dark', dark);
		const theme = dark ? 'dark' : 'light';
		try {
			document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
		} catch {
			// The choice still applies to this page when storage is unavailable.
		}
		void fetch('/api/theme', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ theme })
		});
	}
</script>

<button
	type="button"
	title={t('reader.view')}
	aria-label={t('reader.view')}
	aria-haspopup="menu"
	class="rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
	       dark:hover:bg-stone-800 dark:hover:text-stone-100"
	onclick={(event) => menu?.openAt(event.currentTarget)}
>
	<svg
		viewBox="0 0 24 24"
		class="size-5"
		fill="none"
		stroke="currentColor"
		stroke-width="1.6"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.397-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.712 7.712 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
		/>
		<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
	</svg>
</button>

<Menu bind:this={menu} label={t('reader.view')}>
	<p class="menu-label">{t('reader.textSize')}</p>
	<div
		class="mx-1 mb-1 flex items-center rounded-md border border-stone-200 dark:border-stone-700"
		aria-label={t('account.readerFontSize')}
	>
		<form method="POST" action="?/adjustFontSize" use:enhance role="none">
			<input type="hidden" name="delta" value="-5" />
			<button
				type="submit"
				role="menuitem"
				disabled={fontScale <= 85}
				aria-label={t('reader.fontSmaller')}
			>
				A−
			</button>
		</form>
		<span class="min-w-12 text-center text-xs text-stone-500 tabular-nums">{fontScale}%</span>
		<form method="POST" action="?/adjustFontSize" use:enhance role="none">
			<input type="hidden" name="delta" value="5" />
			<button
				type="submit"
				role="menuitem"
				disabled={fontScale >= 140}
				aria-label={t('reader.fontLarger')}
			>
				A+
			</button>
		</form>
	</div>

	<hr />
	<p class="menu-label">{t('reader.colorScheme')}</p>
	<button type="button" role="menuitemradio" aria-checked={!dark} onclick={() => setTheme(false)}>
		<span>{t('nav.theme.light')}</span>
		{#if !dark}<span class="menu-check" aria-hidden="true">✓</span>{/if}
	</button>
	<button type="button" role="menuitemradio" aria-checked={dark} onclick={() => setTheme(true)}>
		<span>{t('nav.theme.dark')}</span>
		{#if dark}<span class="menu-check" aria-hidden="true">✓</span>{/if}
	</button>
</Menu>

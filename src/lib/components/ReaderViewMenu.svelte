<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';

	let {
		layout,
		fontScale
	}: {
		layout: 'aligned' | 'flow';
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
	<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
		<path
			d="M3.25 4.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm0 5.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm.75 4.75a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5H4Z"
		/>
	</svg>
</button>

<Menu bind:this={menu} label={t('reader.view')}>
	<p class="menu-label">{t('reader.view')}</p>
	{#each [{ value: 'aligned', label: t('reader.viewAligned'), hint: t('reader.viewAlignedHint') }, { value: 'flow', label: t('reader.viewFlow'), hint: t('reader.viewFlowHint') }] as option (option.value)}
		<form
			method="POST"
			action="?/setReaderLayout"
			role="none"
			use:enhance={() => {
				menu?.close();
				return async ({ update }) => update();
			}}
		>
			<input type="hidden" name="layout" value={option.value} />
			<button type="submit" role="menuitem">
				<span>
					<span class="block font-medium">{option.label}</span>
					<span class="block text-[0.7rem] text-stone-500">{option.hint}</span>
				</span>
				{#if layout === option.value}
					<span class="menu-check" aria-hidden="true">✓</span>
				{/if}
			</button>
		</form>
	{/each}

	<hr />
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

<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';

	/**
	 * The site's global menu — reachable from a hamburger button that is always visible, regardless
	 * of viewport width.
	 *
	 * It holds two kinds of content: links that `SiteHeader` used to show only from `sm:` upward
	 * (lists/account/admin, for a signed-in visitor) so nothing is lost on narrow viewports, plus
	 * Impressum/Datenschutz, which live here exclusively now — they are no longer in the top bar at
	 * all, on any viewport.
	 */
	let {
		user = null
	}: {
		user?: { displayName: string | null; email: string; role: string } | null;
	} = $props();

	let menu: Menu | undefined = $state();

	/**
	 * `menu.isOpen()` reads a `$state` that lives inside `Menu`, but Svelte's reactivity tracks the
	 * signal itself, not which component reads it — so this stays in sync with the popover without
	 * `Menu` needing to expose an event for it.
	 */
	let expanded = $derived(menu?.isOpen() ?? false);
</script>

<button
	type="button"
	aria-label={t('nav.menuOpen')}
	aria-haspopup="menu"
	aria-expanded={expanded}
	class="rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
	       dark:hover:bg-stone-800 dark:hover:text-stone-100"
	onclick={(event) => menu?.openAt(event.currentTarget)}
>
	<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
		<path
			fill-rule="evenodd"
			d="M2.5 5.5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25A.75.75 0 0 1 2.5 10Zm0 4.5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75Z"
			clip-rule="evenodd"
		/>
	</svg>
</button>

<Menu bind:this={menu} label={t('nav.menu')}>
	{#if user}
		<a
			role="menuitem"
			href="/lists"
			data-active={page.url.pathname.startsWith('/lists') ? 'true' : undefined}
		>
			{t('nav.lists')}
		</a>
		<a role="menuitem" href="/account">
			{user.displayName ?? user.email}
		</a>
		{#if user.role === 'admin'}
			<a role="menuitem" href="/admin">{t('nav.admin')}</a>
		{/if}
		<hr />
	{/if}
	<a role="menuitem" href="/impressum">{t('nav.impressum')}</a>
	<a role="menuitem" href="/datenschutz">{t('nav.datenschutz')}</a>
</Menu>

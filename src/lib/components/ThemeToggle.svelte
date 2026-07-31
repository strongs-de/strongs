<script lang="ts">
	import { t } from '$lib/i18n';

	/**
	 * Switches between light and dark, remembering the choice.
	 *
	 * The class is applied before first paint by the inline script in `app.html`; this only has to keep
	 * it in step afterwards.
	 */
	// Read straight from the class the inline script in app.html already applied, so no effect and no
	// flash are needed. During server rendering there is no document; hydration corrects the icon.
	let dark = $state(
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
	);

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		const theme = dark ? 'dark' : 'light';
		try {
			document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
		} catch {
			// Private browsing can refuse storage; the toggle still works for this session.
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
	onclick={toggle}
	title={dark ? t('nav.theme.light') : t('nav.theme.dark')}
	aria-label={dark ? t('nav.theme.light') : t('nav.theme.dark')}
	class="rounded-md px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900
	       dark:hover:bg-stone-800 dark:hover:text-stone-100"
>
	{#if dark}
		<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
			<path
				d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2.75 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM15.75 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM4.4 4.4a.75.75 0 0 1 1.06 0l1.06 1.06A.75.75 0 1 1 5.46 6.52L4.4 5.46a.75.75 0 0 1 0-1.06ZM13.48 13.48a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM15.6 4.4a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06L14.54 4.4a.75.75 0 0 1 1.06 0ZM6.52 13.48a.75.75 0 0 1 0 1.06L5.46 15.6A.75.75 0 1 1 4.4 14.54l1.06-1.06a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
			/>
		</svg>
	{/if}
</button>

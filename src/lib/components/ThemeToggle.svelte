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
	class="icon-button"
>
	{#if dark}
		<svg
			viewBox="0 0 24 24"
			class="size-5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="3.5" />
			<path
				d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M18.55 5.45l-1.4 1.4M6.85 17.15l-1.4 1.4"
				stroke-linecap="round"
			/>
		</svg>
	{:else}
		<svg
			viewBox="0 0 24 24"
			class="size-5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			aria-hidden="true"
		>
			<path d="M20.3 15.1A8.7 8.7 0 0 1 8.9 3.7 8.7 8.7 0 1 0 20.3 15.1Z" stroke-linejoin="round" />
		</svg>
	{/if}
</button>

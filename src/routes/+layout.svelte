<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { referencePath } from '$lib/bible/reference';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	let { children, data } = $props();

	/**
	 * The header needs the current reference for its previous/next links and its search field, and the
	 * reader is the only route that has one. Reading it from page data keeps the header dumb.
	 */
	const reader = $derived(
		page.data.navigation as
			| {
					previous: { book: number; chapter: number } | null;
					next: { book: number; chapter: number } | null;
			  }
			| undefined
	);
</script>

<svelte:head><link rel="icon" href="/icon.png" /></svelte:head>

<div class="flex min-h-full flex-col" style="--reader-font-scale: {data.readerFontScale / 100}">
	<SiteHeader
		query={(page.data.title as string | undefined) ?? ''}
		previous={reader?.previous ? referencePath(reader.previous) : null}
		next={reader?.next ? referencePath(reader.next) : null}
		user={data?.user ?? null}
	/>

	{@render children()}
</div>

<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });

	function verseCount(count: number): string {
		if (count === 0) return t('lists.countNone');
		if (count === 1) return t('lists.countOne');
		return t('lists.count', { count });
	}
</script>

<svelte:head><title>{t('lists.title')} — strongs.de</title></svelte:head>

<main class="mx-auto w-full max-w-3xl px-4 py-8">
	<header class="mb-6">
		<h1 class="text-2xl font-semibold tracking-tight">{t('lists.title')}</h1>
		<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('lists.subtitle')}</p>
	</header>

	<form method="POST" action="?/createList" class="mb-6 flex gap-2">
		<label class="sr-only" for="new-list-title">{t('lists.titleLabel')}</label>
		<input
			id="new-list-title"
			name="title"
			placeholder={t('lists.defaultTitle')}
			class="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm
			       focus:border-accent-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900"
		/>
		<Button variant="primary">{t('lists.new')}</Button>
	</form>

	{#if data.lists.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-stone-700"
		>
			<p class="font-medium">{t('lists.overviewEmpty')}</p>
			<p class="mx-auto mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
				{t('lists.overviewEmptyHint')}
			</p>
		</div>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each data.lists as list (list.id)}
				<li
					class="rounded-xl border border-stone-200 transition-colors hover:border-stone-300
					       dark:border-stone-800 dark:hover:border-stone-700"
				>
					<!-- The whole card is the link; there is nothing else to do with a list from here. -->
					<a href="/lists/{list.id}" class="block px-4 py-3">
						<span class="flex items-baseline justify-between gap-2">
							<span class="truncate font-medium">{list.title}</span>
							{#if list.isPublic}
								<span
									class="shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-xs text-accent-700
									       dark:bg-accent-900/40 dark:text-accent-300"
								>
									{t('lists.isPublic')}
								</span>
							{/if}
						</span>
						<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
							{verseCount(list.itemCount)}
							<span aria-hidden="true"> · </span>
							{t('lists.updated', { date: dateFormat.format(new Date(list.updatedAt)) })}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>

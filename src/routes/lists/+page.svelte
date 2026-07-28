<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/components/Button.svelte';
	import { formatReference, referencePath } from '$lib/bible/reference';

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

	<section class="mt-10 border-t border-stone-200 pt-7 dark:border-stone-800">
		<h2 class="text-xl font-semibold tracking-tight">{t('lists.notesTitle')}</h2>

		{#if data.notes.length === 0}
			<p class="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('lists.notesEmpty')}</p>
		{:else}
			<ul class="mt-4 grid gap-3 sm:grid-cols-2">
				{#each data.notes as note (note.kind + note.id)}
					<li
						class="rounded-xl border border-stone-200 bg-white/50 p-4 dark:border-stone-800
						       dark:bg-stone-900/40"
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<a
									class="font-semibold text-accent-600 hover:underline dark:text-accent-400"
									href={note.kind === 'chapter' && note.verse === null
										? referencePath({ book: note.book, chapter: note.chapter })
										: `/lists/${note.listId}#note-${note.id}`}
								>
									{formatReference({
										book: note.book,
										chapter: note.chapter,
										...(note.verse !== null ? { verse: note.verse } : {})
									})}
								</a>
								<p class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
									{note.kind === 'chapter'
										? t('lists.chapterNote')
										: t('lists.verseNote', { list: note.listTitle ?? '' })}
								</p>
							</div>
							<time
								class="shrink-0 text-xs text-stone-400"
								datetime={new Date(note.updatedAt).toISOString()}
							>
								{dateFormat.format(new Date(note.updatedAt))}
							</time>
						</div>
						<!-- Both note types are sanitised when saved. -->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="note-preview mt-3 text-sm leading-relaxed">{@html note.html}</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	.note-preview {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 5;
		line-clamp: 5;
	}

	.note-preview :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
</style>

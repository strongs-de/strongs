<script lang="ts">
	import { page } from '$app/state';
	import { formatReference, referencePath } from '$lib/bible/reference';
	import { t } from '$lib/i18n';
	import NoteEditor from '$lib/components/NoteEditor.svelte';
	import VerseText from '$lib/components/VerseText.svelte';

	let { data } = $props();

	const shareUrl = $derived(
		data.list.slug ? new URL(`/l/${data.list.slug}`, page.url.origin).toString() : null
	);
</script>

<svelte:head><title>{data.list.title} — strongs.de</title></svelte:head>

<main class="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
	<header class="space-y-3">
		<form method="POST" action="?/rename" class="flex gap-2">
			<label class="sr-only" for="list-title">{t('lists.rename')}</label>
			<input
				id="list-title"
				name="title"
				value={data.list.title}
				class="flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-xl
				       font-semibold hover:border-stone-300 focus:border-accent-500 focus:outline-none
				       dark:hover:border-stone-700"
			/>
			<button
				type="submit"
				class="rounded-md border border-stone-300 px-3 py-1 text-sm hover:border-stone-400 dark:border-stone-700"
			>
				{t('action.save')}
			</button>
		</form>

		<div class="flex flex-wrap items-center gap-3 text-sm">
			<form method="POST" action="?/share">
				<input type="hidden" name="isPublic" value={data.list.isPublic ? 'false' : 'true'} />
				<button
					type="submit"
					class="rounded-md border border-stone-300 px-3 py-1 hover:border-stone-400 dark:border-stone-700"
				>
					{data.list.isPublic ? t('lists.shareOff') : t('lists.share')}
				</button>
			</form>

			{#if shareUrl}
				<input
					readonly
					value={shareUrl}
					onclick={(event) => event.currentTarget.select()}
					class="flex-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs
					       dark:border-stone-800 dark:bg-stone-900"
				/>
			{/if}

			<form method="POST" action="?/delete" class="ml-auto">
				<button
					type="submit"
					class="rounded-md px-3 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
				>
					{t('action.delete')}
				</button>
			</form>
		</div>
	</header>

	<form method="POST" action="?/addVerse" class="flex gap-2">
		<label class="sr-only" for="add-verse">{t('lists.addVerse')}</label>
		<input
			id="add-verse"
			name="reference"
			placeholder="Joh 3,16"
			class="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
		/>
		<button
			type="submit"
			class="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
		>
			{t('lists.addVerse')}
		</button>
	</form>

	{#if data.items.length === 0}
		<p class="rounded-lg bg-stone-50 p-6 text-stone-600 dark:bg-stone-900 dark:text-stone-300">
			{t('lists.empty')}
		</p>
	{:else}
		<ol class="space-y-5">
			{#each data.items as item (item.id)}
				<li class="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
					<div class="mb-1 flex items-baseline justify-between gap-3">
						<a
							class="text-sm font-semibold text-accent-600 hover:underline dark:text-accent-400"
							href={referencePath({ book: item.book, chapter: item.chapter, verse: item.verse })}
						>
							{formatReference(
								{ book: item.book, chapter: item.chapter, verse: item.verse },
								{ style: 'full' }
							)}
						</a>
						<form method="POST" action="?/removeVerse">
							<input
								type="hidden"
								name="reference"
								value="{item.book === 0 ? '' : ''}{formatReference({
									book: item.book,
									chapter: item.chapter,
									verse: item.verse
								})}"
							/>
							<button
								type="submit"
								aria-label={t('lists.removeVerse')}
								class="rounded px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700
								       dark:hover:bg-stone-800 dark:hover:text-stone-200">×</button
							>
						</form>
					</div>

					{#if item.segments}
						<p class="mb-2 font-serif leading-relaxed">
							<VerseText segments={item.segments} />
						</p>
					{/if}

					<NoteEditor itemId={item.id} html={item.noteHtml} />
				</li>
			{/each}
		</ol>
	{/if}
</main>

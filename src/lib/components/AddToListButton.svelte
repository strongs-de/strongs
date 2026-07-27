<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';

	/**
	 * Adds a verse to one of the reader's verse lists, from the chapter view.
	 *
	 * A form per list rather than a menu built in JavaScript: with one list — the common case — it is a
	 * single click, and it works without scripting either way.
	 */
	let {
		reference,
		lists,
		marked = false
	}: {
		reference: string;
		lists: { id: string; title: string }[];
		/** Already in the first list, so the marker is shown filled. */
		marked?: boolean;
	} = $props();

	let open = $state(false);
	// Writable derived: it follows the server's answer on navigation, and the click sets it optimistically.
	let added = $derived(marked);
</script>

<span class="add-to-list">
	{#if lists.length === 1}
		<form
			method="POST"
			action="?/addToList"
			use:enhance={() =>
				async ({ update }) => {
					added = true;
					await update({ reset: false, invalidateAll: false });
				}}
		>
			<input type="hidden" name="listId" value={lists[0]!.id} />
			<input type="hidden" name="reference" value={reference} />
			<button
				type="submit"
				class="marker"
				class:added
				title="{t('lists.addVerse')}: {lists[0]!.title}"
				aria-label="{t('lists.addVerse')}: {lists[0]!.title}">{added ? '★' : '☆'}</button
			>
		</form>
	{:else}
		<button
			type="button"
			class="marker"
			class:added
			onclick={() => (open = !open)}
			aria-expanded={open}
			title={t('lists.addVerse')}
			aria-label={t('lists.addVerse')}>{added ? '★' : '☆'}</button
		>

		{#if open}
			<div class="menu">
				{#each lists as list (list.id)}
					<form
						method="POST"
						action="?/addToList"
						use:enhance={() =>
							async ({ update }) => {
								added = true;
								open = false;
								await update({ reset: false, invalidateAll: false });
							}}
					>
						<input type="hidden" name="listId" value={list.id} />
						<input type="hidden" name="reference" value={reference} />
						<button type="submit">{list.title}</button>
					</form>
				{/each}
			</div>
		{/if}
	{/if}
</span>

<style>
	.add-to-list {
		position: relative;
		display: inline;
	}

	.marker {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		vertical-align: 0.35em;
		margin-right: 0.2em;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-stone-300);
		cursor: pointer;
	}

	.marker:hover {
		color: var(--color-accent-500);
	}

	.marker.added {
		color: var(--color-accent-500);
	}

	.menu {
		position: absolute;
		top: 1.2em;
		left: 0;
		z-index: 20;
		min-width: 10rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-stone-200);
		background: white;
		padding: 0.25rem;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
	}

	:global(.dark) .menu {
		background: var(--color-stone-900);
		border-color: var(--color-stone-700);
	}

	.menu button {
		display: block;
		width: 100%;
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		text-align: left;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		background: none;
		border: 0;
		cursor: pointer;
		color: inherit;
	}

	.menu button:hover {
		background: var(--color-stone-100);
	}

	:global(.dark) .menu button:hover {
		background: var(--color-stone-800);
	}
</style>

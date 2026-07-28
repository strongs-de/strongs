<script module lang="ts">
	/** The verse a menu is open for. */
	export type VerseContext = {
		/** Short form for the action's `reference` field and for the URL, e.g. `Joh3,16`. */
		reference: string;
		/** Full form for headings and copied text, e.g. `Johannes 3,16`. */
		label: string;
		path: string;
		text: string;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';

	/**
	 * What a verse number does when you click it.
	 *
	 * One instance for the whole chapter, opened with the verse in question — a menu per verse would
	 * mean a few hundred popovers and a few hundred forms per page. It replaces the star that used to
	 * sit next to every verse: that was a `<form>` inside inline text, which is block-level content in
	 * a `<p>` and therefore always broke the line.
	 */
	let {
		lists,
		signedIn,
		/** Keys are `${verse}:${listId}` for every verse of this chapter that sits in a list. */
		marks
	}: {
		lists: { id: string; title: string }[];
		signedIn: boolean;
		marks: Set<string>;
	} = $props();

	let menu: Menu | undefined = $state();
	let context = $state<VerseContext | null>(null);
	let verse = $state(0);
	let copied = $state<'text' | 'link' | null>(null);

	export function openAt(anchor: HTMLElement, verseNumber: number, next: VerseContext): void {
		context = next;
		verse = verseNumber;
		copied = null;
		menu?.openAt(anchor);
	}

	const linkUrl = $derived(context ? new URL(context.path, page.url.origin).toString() : '');

	const inList = $derived(
		new Set(lists.filter((list) => marks.has(`${verse}:${list.id}`)).map((list) => list.id))
	);

	async function copy(what: 'text' | 'link', value: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			copied = what;
		} catch {
			// A denied clipboard permission is not worth an error message; the menu just stays open.
			return;
		}
		setTimeout(() => menu?.close(), 700);
	}

	/** Optimistic, so the check mark flips at once instead of after a chapter reload. */
	function mark(listId: string, present: boolean): void {
		if (present) marks.add(`${verse}:${listId}`);
		else marks.delete(`${verse}:${listId}`);
	}
</script>

<Menu bind:this={menu} label={context ? t('verse.menu', { reference: context.label }) : ''}>
	{#if context}
		<p class="menu-label">{context.label}</p>

		<button
			type="button"
			role="menuitem"
			onclick={() => {
				menu?.close();
				void goto(context!.path);
			}}
		>
			{t('verse.showOnly')}
		</button>

		<button
			type="button"
			role="menuitem"
			onclick={() => copy('text', `${context!.label}\n${context!.text}`)}
		>
			{copied === 'text' ? t('action.copied') : t('verse.copyText')}
		</button>

		<button type="button" role="menuitem" onclick={() => copy('link', linkUrl)}>
			{copied === 'link' ? t('action.copied') : t('verse.copyLink')}
		</button>

		<hr />

		{#if !signedIn}
			<a role="menuitem" href="/login?redirectTo={encodeURIComponent(page.url.pathname)}">
				{t('verse.signInToSave')}
			</a>
		{:else}
			<p class="menu-label">{t('lists.title')}</p>

			{#each lists as list (list.id)}
				{@const present = inList.has(list.id)}
				<form
					method="POST"
					action={present ? '?/removeFromList' : '?/addToList'}
					role="none"
					use:enhance={() => {
						mark(list.id, !present);
						menu?.close();
						// The chapter itself has not changed, so nothing needs re-fetching.
						return async ({ update }) => update({ reset: false, invalidateAll: false });
					}}
				>
					<input type="hidden" name="listId" value={list.id} />
					<input type="hidden" name="reference" value={context.reference} />
					<button
						type="submit"
						role="menuitem"
						title={present ? t('lists.removeVerse') : t('lists.addVerse')}
					>
						<span class="truncate">{list.title}</span>
						{#if present}
							<svg
								viewBox="0 0 20 20"
								class="menu-check size-4 shrink-0"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 0 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
								/>
							</svg>
						{/if}
					</button>
				</form>
			{/each}

			<!-- The first verse a reader wants to keep is the moment they need a list, so the list is
			     created here rather than on the settings page. -->
			<form
				method="POST"
				action="?/addToList"
				role="none"
				use:enhance={() => {
					menu?.close();
					return async ({ update }) => update({ reset: false });
				}}
			>
				<input type="hidden" name="listId" value="" />
				<input type="hidden" name="reference" value={context.reference} />
				<input type="hidden" name="title" value={context.label} />
				<button type="submit" role="menuitem" class="new-list">
					<svg viewBox="0 0 20 20" class="size-4 shrink-0" fill="currentColor" aria-hidden="true">
						<path
							d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
						/>
					</svg>
					{t('lists.newWithVerse')}
				</button>
			</form>
		{/if}
	{/if}
</Menu>

<style>
	.new-list {
		color: var(--color-accent-600);
	}

	:global(.dark) .new-list {
		color: var(--color-accent-400);
	}
</style>

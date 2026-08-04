<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { ReadableResource } from '$lib/server/repositories/resources';

	/**
	 * Full-screen picker for a reader column's translation, opened from `ColumnPicker` (and from the
	 * mobile column tabs) instead of a small anchored dropdown — the list of Bibles, commentaries and
	 * cross-reference works is long enough, and important enough a choice, to deserve its own screen
	 * rather than a menu that clips at the edge of the viewport.
	 *
	 * One instance lives at the reader page level and is reused for every column: `openAt()` carries
	 * the per-call context (which column, what is already chosen) rather than that being static props,
	 * since which column is being edited changes on every open.
	 */
	let {
		resources,
		label
	}: {
		resources: ReadableResource[];
		label: string;
	} = $props();

	type Context = {
		action: '?/setColumn' | '?/addColumn';
		index?: number;
		selectedId?: string;
		chosen: string[];
	};

	const GROUPS = [
		{ kind: 'bible', labelKey: 'resource.group.bibles', icon: 'book' },
		{ kind: 'commentary', labelKey: 'resource.group.commentaries', icon: 'chat' },
		{ kind: 'xrefs', labelKey: 'resource.group.xrefs', icon: 'link' },
		{ kind: 'lexicon', labelKey: 'resource.kind.lexicon', icon: 'book' }
	] as const;

	let dialog: HTMLDialogElement | undefined = $state();
	let context: Context | undefined = $state();
	let activeKind: string | undefined = $state();
	let query = $state('');

	const groups = $derived(
		GROUPS.map((group) => ({
			...group,
			label: t(group.labelKey),
			resources: resources.filter((resource) => resource.kind === group.kind)
		})).filter((group) => group.resources.length > 0)
	);

	const activeGroup = $derived(groups.find((group) => group.kind === activeKind) ?? groups[0]);

	const visible = $derived(
		(activeGroup?.resources ?? []).filter((resource) => {
			// Adding a translation that is already a column would just be a no-op on the server, so it
			// is left out entirely here rather than shown disabled; switching a column's translation
			// (?/setColumn) instead swaps the two columns, which is worth offering.
			if (context?.action === '?/addColumn' && context.chosen.includes(resource.id)) return false;

			const needle = query.trim().toLowerCase();
			if (!needle) return true;
			return (
				resource.name.toLowerCase().includes(needle) ||
				resource.abbrev.toLowerCase().includes(needle)
			);
		})
	);

	export function openAt(next: Context): void {
		context = next;
		query = '';
		activeKind =
			GROUPS.find((group) => resources.find((r) => r.id === next.selectedId)?.kind === group.kind)
				?.kind ?? groups[0]?.kind;
		dialog?.showModal();
	}

	export function close(): void {
		dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	aria-label={label}
	class="translation-dialog"
	onclick={(event) => {
		if (event.target === dialog) close();
	}}
>
	{#if context}
		<div class="flex h-full min-h-0">
			<nav
				class="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-stone-200 p-3
				       sm:w-56 dark:border-stone-800"
			>
				<p
					class="mb-1 px-2 text-xs font-semibold tracking-wide text-stone-400 uppercase dark:text-stone-500"
				>
					{t('dialog.categories')}
				</p>
				{#each groups as group (group.kind)}
					<button
						type="button"
						class="category"
						class:active={group.kind === activeGroup?.kind}
						onclick={() => {
							activeKind = group.kind;
							query = '';
						}}
					>
						<svg viewBox="0 0 20 20" class="size-4 shrink-0" fill="currentColor" aria-hidden="true">
							{#if group.icon === 'book'}
								<path
									d="M3.5 3.75A1.75 1.75 0 0 1 5.25 2h2.5c.966 0 1.822.46 2.25 1.166A2.75 2.75 0 0 1 12.25 2h2.5a1.75 1.75 0 0 1 1.75 1.75v9.5a1.75 1.75 0 0 1-1.75 1.75h-2.19c-.7 0-1.368.29-1.849.8l-.336.355a.75.75 0 0 1-1.09 0l-.336-.355a2.5 2.5 0 0 0-1.849-.8H5.25a1.75 1.75 0 0 1-1.75-1.75v-9.5ZM9.25 5a1.25 1.25 0 0 0-1.25-1.25h-2.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2.19c.63 0 1.234.183 1.75.516L9.25 5Z"
								/>
							{:else if group.icon === 'chat'}
								<path
									fill-rule="evenodd"
									d="M2 10c0-3.5 3.36-6 8-6s8 2.5 8 6-3.36 6-8 6a9.7 9.7 0 0 1-2.4-.298L4.5 17l.6-2.87A5.6 5.6 0 0 1 2 10Z"
									clip-rule="evenodd"
								/>
							{:else}
								<path
									d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3ZM7.768 15.768a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 0 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3Z"
								/>
							{/if}
						</svg>
						<span class="truncate">{group.label}</span>
					</button>
				{/each}
			</nav>

			<div class="flex min-w-0 flex-1 flex-col">
				<div
					class="flex items-center justify-between gap-3 border-b border-stone-200 p-3 dark:border-stone-800"
				>
					<h2 class="font-serif text-lg font-semibold text-stone-800 dark:text-stone-100">
						{activeGroup?.label}
					</h2>
					<button
						type="button"
						onclick={close}
						aria-label={t('action.close')}
						class="inline-flex size-8 items-center justify-center rounded-md text-stone-400
						       hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
					>
						<svg viewBox="0 0 20 20" class="size-5" fill="currentColor" aria-hidden="true">
							<path
								d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
							/>
						</svg>
					</button>
				</div>

				<div class="p-3">
					<div class="relative">
						<svg
							viewBox="0 0 20 20"
							class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M9 3.5a5.5 5.5 0 1 0 3.66 9.605l3.617 3.618a.75.75 0 1 0 1.06-1.06l-3.617-3.618A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
							/>
						</svg>
						<input
							type="search"
							bind:value={query}
							placeholder={t('dialog.searchTranslation')}
							autocomplete="off"
							spellcheck="false"
							class="w-full rounded-md border-2 border-stone-300 bg-stone-50 py-2 pr-3 pl-9 text-sm
							       focus:border-accent-500 focus:bg-white focus:ring-3 focus:ring-accent-500/10
							       focus:outline-none dark:border-stone-700 dark:bg-stone-900"
						/>
					</div>
				</div>

				<ul class="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
					{#each visible as resource (resource.id)}
						{@const isSelected = resource.id === context.selectedId}
						{@const isChosen = !isSelected && context.chosen.includes(resource.id)}
						<li>
							<form
								method="POST"
								action={context.action}
								use:enhance={() =>
									async ({ update }) => {
										close();
										await update({ reset: false });
									}}
							>
								{#if context.index !== undefined}
									<input type="hidden" name="index" value={context.index} />
								{/if}
								<input type="hidden" name="resource" value={resource.id} />
								<button type="submit" class="entry" class:selected={isSelected}>
									<span class="min-w-0 flex-1">
										<span class="block truncate font-semibold">{resource.name}</span>
										{#if resource.abbrev !== resource.name}
											<span class="block truncate text-xs text-stone-400">{resource.abbrev}</span>
										{/if}
									</span>
									{#if isSelected}
										<svg
											viewBox="0 0 20 20"
											class="size-5 shrink-0 text-accent-600 dark:text-accent-400"
											fill="currentColor"
											aria-hidden="true"
										>
											<path
												fill-rule="evenodd"
												d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<span
											class="size-5 shrink-0 rounded-full border-2 border-stone-300 dark:border-stone-600"
											aria-hidden="true"
										></span>
									{/if}
									{#if isChosen}
										<span class="shrink-0 text-xs text-stone-400" title={t('resource.inUse')}
											>•</span
										>
									{/if}
								</button>
							</form>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.translation-dialog {
		box-sizing: border-box;
		/* The app's global CSS reset zeroes every element's margin, which is also how the UA stylesheet
		   centers an open <dialog> (`margin: auto` against `inset: 0`) — restoring both here explicitly
		   is what keeps it centered instead of pinned to the top-left corner. */
		position: fixed;
		inset: 0;
		margin: auto;
		width: min(48rem, calc(100vw - 2rem));
		height: min(34rem, calc(100dvh - 2rem));
		max-width: none;
		max-height: none;
		padding: 0;
		border: 1px solid var(--color-stone-200);
		border-radius: 0.75rem;
		background: white;
		box-shadow:
			0 20px 25px -5px rgb(0 0 0 / 0.15),
			0 8px 10px -6px rgb(0 0 0 / 0.1);
	}

	.translation-dialog::backdrop {
		background: rgb(28 25 23 / 0.45);
		backdrop-filter: blur(4px);
	}

	:global(.dark) .translation-dialog {
		border-color: var(--color-stone-700);
		background: var(--color-stone-900);
	}

	.category {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.375rem;
		border-left: 2px solid transparent;
		padding: 0.5rem 0.5rem;
		color: var(--color-stone-600);
		font-size: 0.875rem;
		font-weight: 500;
		text-align: left;
	}

	:global(.dark) .category {
		color: var(--color-stone-300);
	}

	.category:hover {
		background: var(--color-stone-100);
	}

	:global(.dark) .category:hover {
		background: var(--color-stone-800);
	}

	.category.active {
		border-left-color: var(--color-accent-500);
		background: color-mix(in oklab, var(--color-accent-500) 10%, transparent);
		color: var(--color-accent-700);
	}

	:global(.dark) .category.active {
		color: var(--color-accent-300);
	}

	.entry {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.75rem;
		border: 2px solid var(--color-stone-200);
		border-radius: 0.5rem;
		padding: 0.625rem 0.875rem;
		text-align: left;
	}

	:global(.dark) .entry {
		border-color: var(--color-stone-700);
	}

	.entry:hover {
		border-color: color-mix(in oklab, var(--color-accent-500) 50%, var(--color-stone-200));
	}

	.entry.selected {
		border-color: var(--color-accent-500);
		background: color-mix(in oklab, var(--color-accent-500) 6%, transparent);
	}
</style>

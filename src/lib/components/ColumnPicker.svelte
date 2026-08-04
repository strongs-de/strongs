<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';
	import ResourceMenuItems from './ResourceMenuItems.svelte';
	import type { ReadableResource } from '$lib/server/repositories/resources';

	/**
	 * Column header and translation switcher.
	 *
	 * A plain form, so changing a column works without JavaScript and the choice is stored server-side
	 * in a cookie that server rendering can already see. `use:enhance` upgrades it to a fetch when
	 * scripting is available.
	 *
	 * The sticky bar lives on the row wrapper in the reader, not here: a sticky element needs a
	 * containing block taller than itself, and one header cell never is.
	 */
	let {
		index,
		selected,
		available,
		chosen,
		canRemove,
		canAdd = false,
		flowSyncEnabled = true,
		showFlowSyncToggle = false
	}: {
		index: number;
		selected: ReadableResource;
		available: ReadableResource[];
		/** Ids currently in use, so the menu can mark them. */
		chosen: string[];
		canRemove: boolean;
		/** Shows the "add a column" button; set on the last column only, so the grid keeps its shape. */
		canAdd?: boolean;
		/** Whether this column currently takes part in the flow layout's cross-column scroll sync. */
		flowSyncEnabled?: boolean;
		/** Shows the sync toggle at all; only meaningful in the flow layout, where columns scroll
		 *  independently — the aligned layout has no per-column scrolling to opt out of. */
		showFlowSyncToggle?: boolean;
	} = $props();

	let selectMenu: Menu | undefined = $state();
	let addMenu: Menu | undefined = $state();

	const unused = $derived(available.filter((resource) => !chosen.includes(resource.id)));
</script>

<div class="flex min-h-8 min-w-0 items-center gap-0.5">
	<span
		class="drag-handle inline-flex cursor-grab touch-none items-center px-1 text-stone-300
		       active:cursor-grabbing dark:text-stone-600"
		title={t('reader.dragColumn')}
		aria-hidden="true"
	>
		<svg viewBox="0 0 12 20" class="h-5 w-3" fill="currentColor">
			<circle cx="3" cy="5" r="1.2" /><circle cx="9" cy="5" r="1.2" />
			<circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" />
			<circle cx="3" cy="15" r="1.2" /><circle cx="9" cy="15" r="1.2" />
		</svg>
	</span>

	{#if showFlowSyncToggle}
		<form
			method="POST"
			action="?/setColumnFlowSync"
			use:enhance
			class="flex items-center self-stretch"
		>
			<input type="hidden" name="resource" value={selected.id} />
			<button
				type="submit"
				title={flowSyncEnabled ? t('reader.flowSyncDisable') : t('reader.flowSyncEnable')}
				aria-label={flowSyncEnabled ? t('reader.flowSyncDisable') : t('reader.flowSyncEnable')}
				aria-pressed={flowSyncEnabled}
				class="inline-flex size-7 items-center justify-center rounded text-stone-400
				       hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
				class:text-accent-600={flowSyncEnabled}
				class:dark:text-accent-400={flowSyncEnabled}
			>
				<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"
						clip-rule="evenodd"
					/>
					<path
						fill-rule="evenodd"
						d="M7.768 15.768a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3Z"
						clip-rule="evenodd"
					/>
					{#if !flowSyncEnabled}
						<path
							d="M3.5 3.5l13 13"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							fill="none"
						/>
					{/if}
				</svg>
			</button>
		</form>
	{/if}

	<button
		id="column-{index}"
		type="button"
		class="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border-2
		       border-stone-300 px-2 py-1 text-left text-sm font-semibold text-stone-700 transition
		       hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2
		       focus-visible:ring-accent-500 dark:border-stone-600 dark:text-stone-200
		       dark:hover:bg-stone-800"
		aria-label={t('reader.chooseTranslation')}
		aria-haspopup="menu"
		onclick={(event) => selectMenu?.openAt(event.currentTarget)}
	>
		<span class="truncate">{selected.abbrev}</span>
		<svg viewBox="0 0 20 20" class="size-4 shrink-0 text-stone-400" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	<Menu bind:this={selectMenu} label={t('reader.chooseTranslation')}>
		<p class="menu-label">{t('reader.chooseTranslation')}</p>
		<ResourceMenuItems
			resources={available}
			action="?/setColumn"
			{index}
			selectedId={selected.id}
			{chosen}
			onChoose={() => selectMenu?.close()}
		/>
	</Menu>

	{#if canRemove}
		<form method="POST" action="?/removeColumn" use:enhance class="flex items-center self-stretch">
			<input type="hidden" name="index" value={index} />
			<button
				type="submit"
				title={t('reader.removeColumn')}
				aria-label="{t('reader.removeColumn')}: {selected.abbrev}"
				class="inline-flex size-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700
				       dark:hover:bg-stone-800 dark:hover:text-stone-200"
			>
				<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</form>
	{/if}

	{#if canAdd && unused.length > 0}
		<!-- Without scripting this submits without a `resource` and the server appends the next unused
		     translation; with scripting the menu asks which one. -->
		<form method="POST" action="?/addColumn" use:enhance class="flex items-center self-stretch">
			<button
				type="submit"
				title={t('reader.addColumn')}
				aria-label={t('reader.addColumn')}
				class="inline-flex size-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-accent-600
				       dark:hover:bg-stone-800 dark:hover:text-accent-400"
				onclick={(event) => {
					event.preventDefault();
					addMenu?.openAt(event.currentTarget);
				}}
			>
				<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
					<path
						d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
					/>
				</svg>
			</button>
		</form>

		<Menu bind:this={addMenu} label={t('reader.addColumn')}>
			<p class="menu-label">{t('reader.addColumn')}</p>
			<ResourceMenuItems
				resources={unused}
				action="?/addColumn"
				onChoose={() => addMenu?.close()}
			/>
		</Menu>
	{/if}
</div>

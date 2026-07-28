<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import Menu from './Menu.svelte';
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
		canAdd = false
	}: {
		index: number;
		selected: ReadableResource;
		available: ReadableResource[];
		/** Ids currently in use, so the menu can mark them. */
		chosen: string[];
		canRemove: boolean;
		/** Shows the "add a column" button; set on the last column only, so the grid keeps its shape. */
		canAdd?: boolean;
	} = $props();

	let menu: Menu | undefined = $state();

	const unused = $derived(available.filter((resource) => !chosen.includes(resource.id)));
</script>

<div class="flex min-w-0 items-center gap-0.5">
	<form method="POST" action="?/setColumn" use:enhance class="min-w-0 flex-1">
		<input type="hidden" name="index" value={index} />
		<label class="sr-only" for="column-{index}">{t('reader.chooseTranslation')}</label>
		<select
			id="column-{index}"
			name="resource"
			class="w-full cursor-pointer truncate rounded-md border-0 bg-transparent py-0.5 pr-6 pl-1
			       text-sm font-semibold text-stone-700 hover:bg-stone-100 focus:outline-none
			       dark:text-stone-200 dark:hover:bg-stone-800"
			onchange={(event) => event.currentTarget.form?.requestSubmit()}
		>
			{#each available as resource (resource.id)}
				<option value={resource.id} selected={resource.id === selected.id}>
					{resource.abbrev}{#if chosen.includes(resource.id) && resource.id !== selected.id}
						&nbsp;•{/if}
				</option>
			{/each}
		</select>
	</form>

	{#if canRemove}
		<form method="POST" action="?/removeColumn" use:enhance>
			<input type="hidden" name="index" value={index} />
			<button
				type="submit"
				title={t('reader.removeColumn')}
				aria-label="{t('reader.removeColumn')}: {selected.abbrev}"
				class="rounded px-1 py-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700
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
		<form method="POST" action="?/addColumn" use:enhance>
			<button
				type="submit"
				title={t('reader.addColumn')}
				aria-label={t('reader.addColumn')}
				class="rounded px-1 py-0.5 text-stone-400 hover:bg-stone-100 hover:text-accent-600
				       dark:hover:bg-stone-800 dark:hover:text-accent-400"
				onclick={(event) => {
					event.preventDefault();
					menu?.openAt(event.currentTarget);
				}}
			>
				<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
					<path
						d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
					/>
				</svg>
			</button>
		</form>

		<Menu bind:this={menu} label={t('reader.addColumn')}>
			<p class="menu-label">{t('reader.addColumn')}</p>
			{#each unused as resource (resource.id)}
				<form
					method="POST"
					action="?/addColumn"
					role="none"
					use:enhance={() =>
						async ({ update }) => {
							menu?.close();
							await update({ reset: false });
						}}
				>
					<input type="hidden" name="resource" value={resource.id} />
					<button type="submit" role="menuitem">{resource.name}</button>
				</form>
			{/each}
		</Menu>
	{/if}
</div>

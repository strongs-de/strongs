<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { ReadableResource } from '$lib/server/repositories/resources';

	/**
	 * Column header and translation switcher.
	 *
	 * A plain form, so changing a column works without JavaScript and the choice is stored server-side
	 * in a cookie that server rendering can already see. `use:enhance` upgrades it to a fetch when
	 * scripting is available.
	 */
	let {
		index,
		selected,
		available,
		chosen,
		canRemove
	}: {
		index: number;
		selected: ReadableResource;
		available: ReadableResource[];
		/** Ids currently in use, so the menu can mark them. */
		chosen: string[];
		canRemove: boolean;
	} = $props();
</script>

<div
	class="sticky top-[3.25rem] z-10 flex items-center gap-1 border-b border-stone-200 bg-white/95
	       py-1.5 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
>
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
</div>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { ReadableResource } from '$lib/server/repositories/resources';

	let {
		resources,
		action,
		index,
		selectedId,
		chosen = [],
		onChoose
	}: {
		resources: ReadableResource[];
		action: '?/setColumn' | '?/addColumn';
		index?: number;
		selectedId?: string;
		chosen?: string[];
		onChoose: () => void;
	} = $props();

	const groups = $derived(
		[
			{ kind: 'bible', label: t('resource.group.bibles') },
			{ kind: 'commentary', label: t('resource.group.commentaries') },
			{ kind: 'xrefs', label: t('resource.group.xrefs') }
		]
			.map((group) => ({
				...group,
				resources: resources.filter((resource) => resource.kind === group.kind)
			}))
			.filter((group) => group.resources.length > 0)
	);
</script>

{#snippet choices(items: ReadableResource[])}
	{#each items as resource (resource.id)}
		<form
			method="POST"
			{action}
			role="none"
			use:enhance={() =>
				async ({ update }) => {
					onChoose();
					await update({ reset: false });
				}}
		>
			{#if index !== undefined}<input type="hidden" name="index" value={index} />{/if}
			<input type="hidden" name="resource" value={resource.id} />
			<button type="submit" role="menuitem">
				<span class="min-w-0 flex-1">
					<span class="block truncate font-medium">{resource.name}</span>
					{#if resource.abbrev !== resource.name}
						<span class="block text-[0.7rem] text-stone-400">{resource.abbrev}</span>
					{/if}
				</span>
				{#if resource.id === selectedId}
					<span class="menu-check" aria-hidden="true">✓</span>
				{:else if chosen.includes(resource.id)}
					<span class="text-xs text-stone-400" title="Bereits sichtbar">•</span>
				{/if}
			</button>
		</form>
	{/each}
{/snippet}

{#if groups.length <= 1}
	{@render choices(groups[0]?.resources ?? [])}
{:else}
	{#each groups as group (group.kind)}
		<details class="resource-submenu">
			<summary role="menuitem" aria-haspopup="menu">
				<span>{group.label}</span><span aria-hidden="true">›</span>
			</summary>
			<div class="resource-submenu-panel" role="menu" aria-label={group.label}>
				{@render choices(group.resources)}
			</div>
		</details>
	{/each}
{/if}

<style>
	details {
		position: relative;
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 0.375rem 0.5rem;
		border-radius: 0.25rem;
		cursor: pointer;
		list-style: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	summary:focus-visible {
		background: var(--color-stone-100);
		outline: none;
	}

	:global(.dark) summary:hover,
	:global(.dark) summary:focus-visible {
		background: var(--color-stone-800);
	}

	.resource-submenu-panel {
		min-width: 14rem;
		margin: 0.125rem 0 0 0.75rem;
		padding-left: 0.25rem;
		border-left: 1px solid var(--color-stone-200);
	}

	:global(.dark) .resource-submenu-panel {
		border-color: var(--color-stone-700);
	}
</style>

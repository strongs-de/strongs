<script lang="ts">
	import { formatNumber, t, type MessageKey } from '$lib/i18n';

	let { data, form } = $props();

	const kindLabel = (kind: string) => t(`resource.kind.${kind}` as MessageKey);

	/** Which resource has its delete confirmation open. */
	let deleting = $state<string | null>(null);
</script>

<svelte:head><title>Ressourcen — Akribos</title></svelte:head>

<div class="mb-5 flex items-baseline justify-between gap-4">
	<h1 class="text-xl font-semibold">Ressourcen</h1>
	<form method="POST" action="?/refresh">
		<button
			type="submit"
			class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-400 dark:border-stone-700"
			title="Statistiken und Suchwortliste neu berechnen"
		>
			Statistiken neu berechnen
		</button>
	</form>
</div>

{#if form?.refreshed}
	<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">Statistiken neu berechnet.</p>
{/if}
{#if form?.deleted}
	<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">{form.deleted} wurde gelöscht.</p>
{/if}

{#if data.resources.length === 0}
	<p class="text-sm text-stone-600 dark:text-stone-300">
		Noch keine Ressourcen. <a class="text-accent-600 hover:underline" href="/admin/import"
			>Jetzt importieren</a
		>
	</p>
{/if}

<ul class="space-y-4">
	{#each data.resources as resource (resource.id)}
		<li class="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
			<div class="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span class="font-mono text-sm font-semibold">{resource.id}</span>
				<span class="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
					{kindLabel(resource.kind)}
				</span>
				<span class="text-xs text-stone-500 dark:text-stone-400">
					{resource.language}
					{#if resource.kind === 'bible'}
						· {formatNumber(resource.verseCount)} Verse
						{#if resource.hasStrongs}· {formatNumber(resource.wordCount)} Strong-Wörter{/if}
						{#if resource.hasMorphology}· mit Grammatik{/if}
					{:else}
						· {formatNumber(resource.wordCount)} Einträge
					{/if}
					{#if resource.status !== 'ready'}· {resource.status}{/if}
				</span>
				{#if form?.saved === resource.id}
					<span class="text-xs text-green-700 dark:text-green-300">gespeichert ✓</span>
				{/if}
			</div>

			<form method="POST" action="?/save" class="grid gap-3 sm:grid-cols-2">
				<input type="hidden" name="id" value={resource.id} />

				<div>
					<label class="mb-1 block text-xs font-medium" for="name-{resource.id}">Name</label>
					<input
						id="name-{resource.id}"
						name="name"
						value={resource.name}
						class="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
					/>
				</div>

				<div>
					<label class="mb-1 block text-xs font-medium" for="abbrev-{resource.id}">
						Spaltentitel
					</label>
					<input
						id="abbrev-{resource.id}"
						name="abbrev"
						value={resource.abbrev}
						class="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
					/>
				</div>

				<div>
					<label class="mb-1 block text-xs font-medium" for="order-{resource.id}">
						Reihenfolge
					</label>
					<input
						id="order-{resource.id}"
						name="sortOrder"
						type="number"
						min="0"
						value={resource.sortOrder}
						class="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
					/>
				</div>

				<div class="flex items-end">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name="isPublic" checked={resource.isPublic} class="size-4" />
						öffentlich sichtbar
					</label>
				</div>

				<div class="sm:col-span-2">
					<label class="mb-1 block text-xs font-medium" for="license-{resource.id}">
						Rechtehinweis (wird unter der Spalte angezeigt)
					</label>
					<textarea
						id="license-{resource.id}"
						name="licenseHtml"
						rows="2"
						class="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
						>{resource.licenseHtml ?? ''}</textarea
					>
				</div>

				<div class="flex items-center gap-3 sm:col-span-2">
					<button
						type="submit"
						class="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
					>
						{t('action.save')}
					</button>

					<button
						type="button"
						class="ml-auto text-sm text-red-700 hover:underline dark:text-red-300"
						onclick={() => (deleting = deleting === resource.id ? null : resource.id)}
					>
						{t('action.delete')}
					</button>
				</div>
			</form>

			{#if deleting === resource.id}
				<form
					method="POST"
					action="?/delete"
					class="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3
					       text-sm dark:border-red-900 dark:bg-red-950"
				>
					<input type="hidden" name="id" value={resource.id} />
					<span>
						Zum Löschen den Bezeichner <span class="font-mono font-semibold">{resource.id}</span>
						eingeben:
					</span>
					<input
						name="confirm"
						class="rounded border border-red-300 px-2 py-1 font-mono text-sm dark:border-red-800 dark:bg-stone-900"
					/>
					<button
						type="submit"
						class="rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
					>
						Endgültig löschen
					</button>
				</form>
			{/if}
		</li>
	{/each}
</ul>

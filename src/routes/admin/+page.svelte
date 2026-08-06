<script lang="ts">
	import { formatNumber, t, type MessageKey } from '$lib/i18n';
	import JobList from '$lib/components/admin/JobList.svelte';

	let { data } = $props();

	function formatBytes(bytes: number): string {
		const units = ['B', 'kB', 'MB', 'GB'];
		let value = bytes;
		let unit = 0;
		while (value >= 1024 && unit < units.length - 1) {
			value /= 1024;
			unit += 1;
		}
		return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
	}

	const kindLabel = (kind: string) => t(`resource.kind.${kind}` as MessageKey);
</script>

<svelte:head><title>Verwaltung — Akribos</title></svelte:head>

<h1 class="mb-5 text-xl font-semibold">Übersicht</h1>

<section class="mb-8">
	<h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase">Ressourcen</h2>
	{#if data.resources.length === 0}
		<p class="text-sm text-stone-600 dark:text-stone-300">
			Es ist noch nichts importiert. <a class="text-accent-600 hover:underline" href="/admin/import"
				>Jetzt importieren</a
			>
		</p>
	{:else}
		<table class="w-full text-sm">
			<thead class="text-left text-xs text-stone-500 dark:text-stone-400">
				<tr>
					<th class="py-1">Art</th>
					<th class="py-1 text-right">Anzahl</th>
					<th class="py-1 text-right">Verse</th>
					<th class="py-1 text-right">Wörter mit Strong</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-stone-200 dark:divide-stone-800">
				{#each data.resources as row (row.kind)}
					<tr>
						<td class="py-1.5">{kindLabel(row.kind)}</td>
						<td class="py-1.5 text-right tabular-nums">{row.count}</td>
						<td class="py-1.5 text-right tabular-nums">{formatNumber(row.verseCount)}</td>
						<td class="py-1.5 text-right tabular-nums">{formatNumber(row.wordCount)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="mb-8">
	<h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase">
		Datenbank · {data.databaseSize}
	</h2>
	<table class="w-full text-sm">
		<thead class="text-left text-xs text-stone-500 dark:text-stone-400">
			<tr>
				<th class="py-1">Tabelle</th>
				<th class="py-1 text-right">Zeilen</th>
				<th class="py-1 text-right">Größe mit Indizes</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-stone-200 dark:divide-stone-800">
			{#each data.tables as table (table.name)}
				<tr>
					<td class="py-1.5 font-mono text-xs">{table.name}</td>
					<td class="py-1.5 text-right tabular-nums">{formatNumber(table.rows)}</td>
					<td class="py-1.5 text-right tabular-nums">{formatBytes(table.bytes)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
		Zeilenzahlen sind Schätzungen des Planers und nach einem Import erst nach dem nächsten ANALYZE
		aktuell.
	</p>
</section>

<section>
	<h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase">Letzte Importe</h2>
	<JobList jobs={data.jobs} />
</section>

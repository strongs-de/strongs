<script lang="ts">
	import { formatNumber } from '$lib/i18n';
	import type { ImportJob } from '$lib/server/db/schema';

	/** Import history with progress, warnings and errors. */
	let { jobs, compact = false }: { jobs: ImportJob[]; compact?: boolean } = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' });

	const stateLabel: Record<string, string> = {
		queued: 'wartet',
		running: 'läuft',
		done: 'fertig',
		failed: 'fehlgeschlagen',
		cancelled: 'abgebrochen'
	};

	let expanded = $state<string | null>(null);
</script>

{#if jobs.length === 0}
	<p class="text-sm text-stone-600 dark:text-stone-300">Noch keine Importe.</p>
{:else}
	<ul class="divide-y divide-stone-200 text-sm dark:divide-stone-800">
		{#each jobs as job (job.id)}
			<li class="py-2">
				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span
						class="rounded px-1.5 py-0.5 text-xs font-medium"
						class:bg-stone-100={job.state === 'queued'}
						class:bg-accent-100={job.state === 'running'}
						class:text-accent-800={job.state === 'running'}
						class:bg-green-100={job.state === 'done'}
						class:text-green-800={job.state === 'done'}
						class:bg-red-100={job.state === 'failed'}
						class:text-red-800={job.state === 'failed'}
						class:dark:bg-stone-800={true}
					>
						{stateLabel[job.state] ?? job.state}
					</span>

					<span class="font-medium">{job.resourceId ?? job.sourceFormat ?? 'unbekannt'}</span>

					{#if job.state === 'running'}
						<span class="text-stone-500 dark:text-stone-400">
							{formatNumber(job.progress)}{#if job.message}
								· {job.message}{/if}
						</span>
					{:else if job.state === 'done'}
						<span class="text-stone-500 dark:text-stone-400">
							{formatNumber(job.total || job.progress)}
						</span>
					{/if}

					<span class="ml-auto text-xs text-stone-400">
						{timeFormat.format(new Date(job.createdAt))}
					</span>
				</div>

				{#if job.error}
					<p class="mt-1 text-xs text-red-700 dark:text-red-300">{job.error}</p>
				{/if}

				{#if !compact && job.warnings.length > 0}
					<button
						type="button"
						class="mt-1 text-xs text-stone-500 underline dark:text-stone-400"
						onclick={() => (expanded = expanded === job.id ? null : job.id)}
					>
						{job.warnings.length} Hinweise
					</button>
					{#if expanded === job.id}
						<ul
							class="mt-1 max-h-52 overflow-y-auto rounded bg-stone-50 p-2 text-xs dark:bg-stone-900"
						>
							{#each job.warnings as warning, index (index)}
								<li class="py-0.5">{warning}</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
{/if}

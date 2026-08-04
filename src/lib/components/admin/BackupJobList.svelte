<script lang="ts">
	import type { BackupJob } from '$lib/server/db/schema';

	/** Backup/restore history: a `backup_jobs` row per run. */
	let { jobs }: { jobs: BackupJob[] } = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' });

	const stateLabel: Record<string, string> = {
		queued: 'wartet',
		running: 'läuft',
		done: 'fertig',
		failed: 'fehlgeschlagen'
	};

	function typeLabel(job: BackupJob): string {
		switch (job.type) {
			case 'download':
				return 'Download';
			case 'scheduled':
				return job.trigger === 'schedule' ? 'Automatisch nach S3' : 'Manuell nach S3';
			case 'pre-restore':
				return 'Sicherung vor Wiederherstellung';
			case 'restore':
				return 'Wiederherstellung';
			default:
				return job.type;
		}
	}

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
</script>

{#if jobs.length === 0}
	<p class="text-sm text-stone-600 dark:text-stone-300">Noch keine Backups.</p>
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

					<span class="font-medium">{typeLabel(job)}</span>

					{#if job.sizeBytes}
						<span class="text-stone-500 dark:text-stone-400">{formatBytes(job.sizeBytes)}</span>
					{/if}

					{#if job.location && job.location !== 'download'}
						<span class="text-stone-500 dark:text-stone-400">{job.location}</span>
					{/if}

					<span class="ml-auto text-xs text-stone-400">
						{timeFormat.format(new Date(job.createdAt))}
					</span>
				</div>

				{#if job.message && job.state === 'running'}
					<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{job.message}</p>
				{/if}

				{#if job.message && job.state === 'done'}
					<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{job.message}</p>
				{/if}

				{#if job.error}
					<p class="mt-1 text-xs text-red-700 dark:text-red-300">{job.error}</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

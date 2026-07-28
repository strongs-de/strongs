<script lang="ts">
	let { data, form } = $props();

	const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' });
</script>

<svelte:head><title>Nutzer — strongs.de</title></svelte:head>

<h1 class="mb-5 text-xl font-semibold">Nutzer</h1>

{#if form?.error === 'self'}
	<p class="mb-4 text-sm text-red-700 dark:text-red-300" role="alert">
		Das eigene Konto kann nicht geändert werden.
	</p>
{/if}

{#if form?.resetLink}
	<div
		class="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<p class="mb-1">Einmal-Link zum Zurücksetzen (eine Stunde gültig):</p>
		<input
			readonly
			value={form.resetLink}
			onclick={(event) => event.currentTarget.select()}
			class="w-full rounded border border-stone-300 px-2 py-1 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
		/>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="w-full text-sm">
		<thead class="text-left text-xs text-stone-500 dark:text-stone-400">
			<tr>
				<th class="py-1">E-Mail</th>
				<th class="py-1">Name</th>
				<th class="py-1">Rolle</th>
				<th class="py-1 text-right">Listen</th>
				<th class="py-1">Registriert</th>
				<th class="py-1">Zuletzt aktiv</th>
				<th class="py-1"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-stone-200 dark:divide-stone-800">
			{#each data.users as user (user.id)}
				<tr class:opacity-50={user.disabledAt}>
					<td class="py-2 pr-3">{user.email}</td>
					<td class="py-2 pr-3">{user.displayName ?? '—'}</td>
					<td class="py-2 pr-3">
						<form method="POST" action="?/role" class="flex items-center gap-1">
							<input type="hidden" name="userId" value={user.id} />
							<select
								name="role"
								class="rounded border border-stone-300 px-1 py-0.5 text-xs dark:border-stone-700 dark:bg-stone-900"
								onchange={(event) => event.currentTarget.form?.requestSubmit()}
							>
								<option value="user" selected={user.role === 'user'}>Nutzer</option>
								<option value="admin" selected={user.role === 'admin'}>Verwaltung</option>
							</select>
						</form>
					</td>
					<td class="py-2 pr-3 text-right tabular-nums">{user.listCount}</td>
					<td class="py-2 pr-3 text-xs">{dateFormat.format(new Date(user.createdAt))}</td>
					<td class="py-2 pr-3 text-xs">
						{user.lastLoginAt ? dateFormat.format(new Date(user.lastLoginAt)) : '—'}
					</td>
					<td class="py-2">
						<div class="flex gap-2">
							<form method="POST" action="?/reset">
								<input type="hidden" name="userId" value={user.id} />
								<button type="submit" class="text-xs text-accent-600 hover:underline">
									Passwort-Link
								</button>
							</form>
							<form method="POST" action="?/disable">
								<input type="hidden" name="userId" value={user.id} />
								<input type="hidden" name="disabled" value={user.disabledAt ? 'false' : 'true'} />
								<button
									type="submit"
									class="text-xs text-red-700 hover:underline dark:text-red-300"
								>
									{user.disabledAt ? 'aktivieren' : 'sperren'}
								</button>
							</form>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

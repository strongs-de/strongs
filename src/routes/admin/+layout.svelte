<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const sections = [
		{ href: '/admin', label: 'Übersicht' },
		{ href: '/admin/resources', label: 'Ressourcen' },
		{ href: '/admin/import', label: 'Importieren' },
		{ href: '/admin/backup', label: 'Backup' },
		{ href: '/admin/users', label: 'Nutzer' }
	];
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6">
	<nav class="mb-6 flex flex-wrap gap-1 border-b border-stone-200 pb-2 dark:border-stone-800">
		{#each sections as section (section.href)}
			<a
				href={section.href}
				class="rounded-md px-3 py-1.5 text-sm"
				class:bg-stone-100={page.url.pathname === section.href}
				class:dark:bg-stone-800={page.url.pathname === section.href}
				class:font-medium={page.url.pathname === section.href}
			>
				{section.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>

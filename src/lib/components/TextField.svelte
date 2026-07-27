<script lang="ts">
	/** Labelled input with the site's field styling. */
	let {
		name,
		label,
		type = 'text',
		value = '',
		required = false,
		autocomplete,
		hint,
		minlength
	}: {
		name: string;
		label: string;
		type?: 'text' | 'email' | 'password';
		value?: string;
		required?: boolean;
		autocomplete?: HTMLInputElement['autocomplete'];
		hint?: string;
		minlength?: number;
	} = $props();
</script>

<div>
	<label class="mb-1 block text-sm font-medium" for={name}>{label}</label>
	<input
		{name}
		{type}
		{required}
		{minlength}
		{autocomplete}
		id={name}
		{value}
		class="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm
		       focus:border-accent-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900"
	/>
	{#if hint}
		<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{hint}</p>
	{/if}
</div>

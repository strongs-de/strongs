<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The site's button styling in one place.
	 *
	 * Every page used to spell out the same two Tailwind recipes — a bordered neutral button and an
	 * accent-filled one — which is why no two of them looked quite alike. Renders an `<a>` when `href`
	 * is set, so a link that looks like a button stays a link.
	 */
	let {
		variant = 'secondary',
		size = 'md',
		href,
		type = 'submit',
		disabled = false,
		title,
		ariaLabel,
		class: extra = '',
		onclick,
		children
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		/** Set to render an anchor instead of a button. */
		href?: string;
		type?: 'submit' | 'button';
		disabled?: boolean;
		title?: string;
		ariaLabel?: string;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const base =
		'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold ' +
		'whitespace-nowrap shadow-sm transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50';

	const sizes = {
		sm: 'px-2.5 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm'
	};

	const variants = {
		primary:
			'border border-accent-700/20 bg-accent-600 text-white hover:-translate-y-px hover:bg-accent-700 ' +
			'hover:shadow-md enabled:active:translate-y-0 enabled:active:bg-accent-800',
		secondary:
			'border border-stone-300 bg-[color:var(--surface-raised)] text-stone-800 hover:border-accent-400 hover:bg-accent-50/60 ' +
			'dark:border-white/12 dark:text-stone-100 dark:hover:border-white/20 dark:hover:bg-white/7',
		ghost:
			'text-stone-600 hover:bg-stone-100 hover:text-stone-900 ' +
			'dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100',
		danger: 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/60'
	};

	const classes = $derived(`${base} ${sizes[size]} ${variants[variant]} ${extra}`);
</script>

{#if href}
	<a {href} {title} aria-label={ariaLabel} class={classes} {onclick}>{@render children()}</a>
{:else}
	<button {type} {disabled} {title} aria-label={ariaLabel} class={classes} {onclick}>
		{@render children()}
	</button>
{/if}

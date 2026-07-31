<script lang="ts">
	import { t } from '$lib/i18n';

	let {
		marker,
		text
	}: {
		marker: string;
		text: string;
	} = $props();

	let popup = $state<HTMLSpanElement | undefined>();
	let trigger = $state<HTMLButtonElement | undefined>();

	function toggle(): void {
		if (!popup) return;
		if (popup.matches(':popover-open')) {
			popup.hidePopover();
			return;
		}
		popup.showPopover();
		place();
	}

	function place(): void {
		if (!popup || !trigger) return;
		const anchor = trigger.getBoundingClientRect();
		const box = popup.getBoundingClientRect();
		const margin = 8;
		const gap = 5;

		let left = anchor.left + anchor.width / 2 - box.width / 2;
		left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));

		let top = anchor.bottom + gap;
		if (top + box.height > window.innerHeight - margin) {
			top = Math.max(margin, anchor.top - box.height - gap);
		}

		popup.style.left = `${left}px`;
		popup.style.top = `${top}px`;
	}
</script>

<svelte:window onresize={() => popup?.matches(':popover-open') && place()} />

<button
	bind:this={trigger}
	type="button"
	class="footnote-marker"
	aria-label={t('verse.footnote', { marker: marker || '*' })}
	aria-haspopup="dialog"
	onclick={toggle}
>
	{marker || '*'}
</button>
<span bind:this={popup} popover="auto" role="note" class="footnote-popup">{text}</span>

<style>
	.footnote-marker {
		display: inline-block;
		/* A little extra room around the glyph, so the tap target is bigger than the rendered
		   character itself — `line-height: 0` used to collapse the button to a sliver a touch could
		   miss even though a mouse pointer, being pixel-precise, still landed on it. */
		padding: 0.35em 0.2em;
		margin: -0.35em -0.2em;
		border: none;
		background: none;
		vertical-align: super;
		font-family: var(--font-sans);
		font-size: 0.7em;
		font-weight: 700;
		line-height: 1;
		color: var(--color-accent-700);
		cursor: pointer;
		touch-action: manipulation;
	}

	.footnote-marker:hover,
	.footnote-marker:focus-visible {
		text-decoration: underline;
	}

	:global(.dark) .footnote-marker {
		color: var(--color-accent-300);
	}

	.footnote-popup {
		position: fixed;
		inset: auto;
		width: max-content;
		max-width: min(24rem, calc(100vw - 1rem));
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-stone-200);
		border-radius: 0.45rem;
		background: white;
		box-shadow: 0 10px 24px rgb(28 25 23 / 0.16);
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 400;
		line-height: 1.45;
		color: var(--color-stone-700);
	}

	.footnote-popup:not(:popover-open) {
		display: none;
	}

	:global(.dark) .footnote-popup {
		border-color: var(--color-stone-700);
		background: var(--color-stone-900);
		color: var(--color-stone-200);
	}
</style>

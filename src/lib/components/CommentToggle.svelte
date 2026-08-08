<script lang="ts">
	import { t } from '$lib/i18n';

	let {
		hasComment,
		active,
		onclick
	}: { hasComment: boolean; active: boolean; onclick: () => void } = $props();
</script>

<button
	type="button"
	class="comment-toggle"
	class:has-comment={hasComment}
	class:active
	aria-pressed={active}
	aria-label={hasComment ? (active ? t('comments.hide') : t('comments.show')) : t('comments.add')}
	{onclick}
>
	<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
		<path
			d="M4.5 3.5h11A1.5 1.5 0 0 1 17 5v7a1.5 1.5 0 0 1-1.5 1.5H9L5.2 16.7a.75.75 0 0 1-1.2-.6V13A1.5 1.5 0 0 1 3 11.6V5a1.5 1.5 0 0 1 1.5-1.5Z"
		/>
	</svg>
</button>

<style>
	.comment-toggle {
		display: inline-flex;
		width: 1.25em;
		height: 1.25em;
		margin-left: 0.25em;
		vertical-align: -0.12em;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		color: var(--color-stone-400);
		transition:
			color 120ms ease,
			background 120ms ease;
	}

	.comment-toggle svg {
		width: 0.82em;
		height: 0.82em;
	}

	.comment-toggle:hover,
	.comment-toggle:focus-visible,
	.comment-toggle.has-comment {
		color: var(--color-accent-600);
	}

	.comment-toggle.active {
		background: var(--color-accent-100);
		color: var(--color-accent-800);
	}

	:global(.dark) .comment-toggle.has-comment {
		color: var(--color-accent-400);
	}

	:global(.dark) .comment-toggle.active {
		background: color-mix(in oklab, var(--color-accent-800) 45%, transparent);
		color: var(--color-accent-200);
	}
</style>

<script lang="ts">
	import { t } from '$lib/i18n';
	import NoteEditor from './NoteEditor.svelte';

	let {
		html = null,
		action = '?/saveNote',
		itemId,
		reference,
		resourceId,
		startEditing = false,
		onSaved,
		onClose
	}: {
		html?: string | null;
		action?: string;
		itemId?: string;
		reference?: string;
		resourceId?: string;
		startEditing?: boolean;
		onSaved?: (html: string) => void;
		onClose?: () => void;
	} = $props();

	let editing = $state(false);
	let initialized = false;
	$effect(() => {
		if (!initialized) {
			editing = startEditing || !html;
			initialized = true;
		}
		if (startEditing) editing = true;
	});

	function saved(next: string) {
		html = next || null;
		editing = !html;
		onSaved?.(next);
	}

	function closeEditor() {
		editing = false;
		onClose?.();
	}
</script>

<aside class="comment-bubble" aria-label={t('comments.comment')}>
	{#if editing}
		<NoteEditor
			{action}
			{itemId}
			{reference}
			{resourceId}
			{html}
			autofocus={startEditing}
			placeholder={t('comments.placeholder')}
			onSaved={saved}
			onCancel={closeEditor}
		/>
	{:else if html}
		<button
			type="button"
			class="comment-display"
			onclick={() => (editing = true)}
			aria-label={t('comments.edit')}
		>
			<!-- Saved comment HTML is sanitised by the server. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<span class="comment-html">{@html html ?? ''}</span>
		</button>
	{:else}
		<button type="button" class="add-comment" onclick={() => (editing = true)}>
			{t('comments.add')}
		</button>
	{/if}
</aside>

<style>
	.comment-bubble {
		position: relative;
		min-width: 0;
		border-radius: 0.6rem;
		border: 1px solid color-mix(in oklab, var(--color-accent-300) 48%, var(--color-stone-200));
		background: color-mix(in oklab, var(--color-accent-50) 72%, var(--surface));
		padding: 0.7rem 0.85rem 0.7rem 1rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.comment-display {
		width: 100%;
		cursor: text;
		text-align: left;
		font-size: 0.875rem;
		line-height: 1.45;
	}
	.add-comment {
		font-size: 0.8rem;
		color: var(--color-stone-500);
	}
	.add-comment:hover {
		color: var(--color-accent-700);
	}
	.comment-html :global(p) {
		margin: 0 0 0.5em;
	}
	.comment-html :global(p:last-child) {
		margin-bottom: 0;
	}

	:global(.dark) .comment-bubble {
		border-color: color-mix(in oklab, var(--color-accent-700) 55%, var(--color-stone-700));
		background: color-mix(in oklab, var(--color-accent-900) 32%, var(--surface));
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';

	/**
	 * A small rich-text field for verse notes.
	 *
	 * A `contenteditable` element with three formatting buttons, replacing the CKEditor build the old
	 * site loaded on every page. The HTML is sanitised on the server regardless of what the browser
	 * produces, so the editor only has to be pleasant, not trustworthy.
	 */
	let {
		itemId,
		resourceId,
		html = null,
		action = '?/saveNote',
		reference,
		autofocus = false,
		placeholder = t('lists.notePlaceholder'),
		onSaved,
		onCancel
	}: {
		itemId?: string;
		resourceId?: string;
		html?: string | null;
		action?: string;
		reference?: string;
		autofocus?: boolean;
		placeholder?: string;
		onSaved?: (html: string) => void;
		onCancel?: () => void;
	} = $props();

	let form: HTMLFormElement | undefined = $state();
	let editor: HTMLDivElement | undefined = $state();
	let dirty = $state(false);
	let saved = $state(false);

	$effect(() => {
		if (autofocus && editor) editor.focus();
	});

	function format(command: 'bold' | 'italic' | 'insertUnorderedList') {
		// execCommand is deprecated but remains the only broadly supported way to do this without
		// shipping an editor framework; the fallback is that the buttons do nothing and typing works.
		document.execCommand(command);
		editor?.focus();
		dirty = true;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onCancel?.();
		} else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			form?.requestSubmit();
		}
	}
</script>

<form
	bind:this={form}
	method="POST"
	{action}
	use:enhance={({ formData }) => {
		// Read the editor at submit time. A contenteditable's `innerHTML` is not reactive, so binding it
		// to the hidden field would send whatever the last render happened to see.
		formData.set('note', editor?.innerHTML ?? html ?? '');

		return async ({ update }) => {
			await update({ reset: false });
			onSaved?.(editor?.innerHTML ?? html ?? '');
			dirty = false;
			saved = true;
			setTimeout(() => (saved = false), 2000);
		};
	}}
>
	{#if itemId}<input type="hidden" name="itemId" value={itemId} />{/if}
	{#if resourceId}<input type="hidden" name="resourceId" value={resourceId} />{/if}
	{#if reference}<input type="hidden" name="reference" value={reference} />{/if}
	<!-- Filled in by the submit handler above; the fallback covers a submit without JavaScript. -->
	<input type="hidden" name="note" value={html ?? ''} />

	<div class="mb-1 flex items-center gap-1">
		<button
			type="button"
			onclick={() => format('bold')}
			class="rounded px-2 py-0.5 text-sm font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
			aria-label={t('lists.noteBold')}>B</button
		>
		<button
			type="button"
			onclick={() => format('italic')}
			class="rounded px-2 py-0.5 text-sm italic hover:bg-stone-100 dark:hover:bg-stone-800"
			aria-label={t('lists.noteItalic')}>I</button
		>
		<button
			type="button"
			onclick={() => format('insertUnorderedList')}
			class="rounded px-2 py-0.5 text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
			aria-label={t('lists.noteList')}>•</button
		>

		<span class="flex-1"></span>

		{#if saved}
			<span class="text-xs text-stone-500 dark:text-stone-400">{t('action.save')} ✓</span>
		{/if}
		<button
			type="submit"
			disabled={!dirty}
			class="rounded border border-stone-300 px-2 py-0.5 text-xs enabled:hover:border-accent-500
			       disabled:opacity-40 dark:border-stone-700"
		>
			{t('action.save')}
		</button>
	</div>

	<div
		bind:this={editor}
		contenteditable="true"
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		aria-label={t('lists.note')}
		data-placeholder={placeholder}
		oninput={() => (dirty = true)}
		onkeydown={onKeydown}
		class="note-editor min-h-16 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm
		       focus:border-accent-500 focus:outline-none dark:border-stone-800 dark:bg-stone-950"
	>
		<!-- Server-sanitised on the way in and on the way out; see src/lib/notes/sanitize.ts. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html ?? ''}
	</div>
</form>

<style>
	.note-editor:empty::before {
		content: attr(data-placeholder);
		color: var(--color-stone-400);
	}

	.note-editor :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	.note-editor :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}

	.note-editor :global(p) {
		margin: 0 0 0.5em;
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { formatReference, referencePath } from '$lib/bible/reference';
	import { segmentsToText, splitVerseLead } from '$lib/bible/segments';
	import { t } from '$lib/i18n';
	import ColumnPicker from '$lib/components/ColumnPicker.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import StudySidebar from '$lib/components/StudySidebar.svelte';
	import VerseMenu from '$lib/components/VerseMenu.svelte';
	import VerseText from '$lib/components/VerseText.svelte';
	import NoteEditor from '$lib/components/NoteEditor.svelte';
	import ResourceMenuItems from '$lib/components/ResourceMenuItems.svelte';

	let { data } = $props();

	/**
	 * The verse grid.
	 *
	 * One CSS grid holds every column, with each cell placed explicitly at its verse row. That gives
	 * true alignment across translations, including verses one translation merges and another does
	 * not — the job `jquery.matchHeight` used to do after paint, badly.
	 */
	/**
	 * Which verses of this chapter are in which list, as `${verse}:${listId}`.
	 *
	 * A reactive set the verse menu writes to, so ticking a list flips the mark immediately; it is
	 * derived from page data, so it is rebuilt from the server's answer on every navigation.
	 */
	const marks = $derived(
		new SvelteSet(data.markedVerses.map((mark) => `${mark.verse}:${mark.listId}`))
	);

	/**
	 * Verses that sit in at least one list, which colours their number.
	 *
	 * Read back out of `marks` rather than from page data, so ticking a list in the menu recolours the
	 * number at once — the add does not re-run `load`, since the chapter itself has not changed.
	 */
	const inAnyList = $derived(new Set([...marks].map((key) => Number(key.split(':')[0]))));

	let verseMenu = $state<VerseMenu | undefined>();
	let addColumnMenu = $state<Menu | undefined>();

	const unusedResources = $derived(
		data.readerResources.filter(
			(resource) => !data.columns.some((column) => column.resource.id === resource.id)
		)
	);
	const canAddColumn = $derived(
		data.columns.length < data.maxColumns && unusedResources.length > 0
	);
	const visibleColumnCount = $derived(data.columns.length + (data.notesVisible ? 1 : 0));
	const notesColumnIndex = $derived(data.columns.length);

	function commentaryAt(
		referenceResources: typeof data.referenceResources,
		resourceId: string,
		verse: number
	) {
		return referenceResources.commentaries.filter(
			(entry) => entry.resourceId === resourceId && (entry.verseStart ?? 1) === verse
		);
	}

	function crossReferencesAt(
		referenceResources: typeof data.referenceResources,
		resourceId: string,
		verse: number
	) {
		return referenceResources.crossReferences.filter(
			(entry) => entry.resourceId === resourceId && entry.fromVerse === verse
		);
	}

	let draggedColumn = $state<number | null>(null);
	let dropColumn = $state<number | null>(null);
	let reorderForm = $state<HTMLFormElement | undefined>();
	let reorderFromInput = $state<HTMLInputElement | undefined>();
	let reorderToInput = $state<HTMLInputElement | undefined>();

	function startColumnDrag(event: DragEvent, index: number) {
		draggedColumn = index;
		event.dataTransfer?.setData('text/plain', String(index));
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function dropOnColumn(event: DragEvent, index: number) {
		event.preventDefault();
		const from = draggedColumn ?? Number(event.dataTransfer?.getData('text/plain'));
		draggedColumn = null;
		dropColumn = null;
		if (
			!Number.isInteger(from) ||
			from === index ||
			!reorderForm ||
			!reorderFromInput ||
			!reorderToInput
		)
			return;
		reorderFromInput.value = String(from);
		reorderToInput.value = String(index);
		reorderForm.requestSubmit();
	}

	/**
	 * Opens the verse menu, unless the reader meant to use the link.
	 *
	 * The verse number stays an `<a>` so it keeps working without scripting and still offers
	 * "open in new tab" and "copy link address"; only a plain left click is taken over.
	 */
	function onVerseNumberClick(
		event: MouseEvent & { currentTarget: HTMLAnchorElement },
		book: number,
		chapter: number,
		verse: number,
		verseEnd: number | null,
		segments: Parameters<typeof segmentsToText>[0]
	) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
			return;
		}

		event.preventDefault();
		const reference = {
			book,
			chapter,
			verse,
			...(verseEnd && verseEnd > verse ? { verseEnd } : {})
		};

		verseMenu?.openAt(event.currentTarget, verse, {
			reference: formatReference(reference),
			label: formatReference(reference, { style: 'full' }),
			path: referencePath(reference),
			text: segmentsToText(segments)
		});
	}

	/** Which column a reader is looking at on a phone, where only one fits. */
	let mobileColumn = $state(0);

	/** Strong's number shown in the study sidebar, kept in the URL hash so it can be shared. */
	let activeStrong = $state<{ strong: string; word: string; reference: string } | null>(null);

	// Restore the sidebar from the hash on load and on navigation.
	$effect(() => {
		const hash = page.url.hash.replace(/^#/, '');
		if (!hash) {
			activeStrong = null;
			return;
		}
		const [strong, word, verseValue] = hash.split('/');
		if (strong) {
			const verse = Number.parseInt(verseValue ?? '', 10);
			activeStrong = {
				strong: decodeURIComponent(strong),
				word: decodeURIComponent(word ?? ''),
				reference: formatReference({
					book: data.reference.book,
					chapter: data.reference.chapter,
					...(Number.isSafeInteger(verse) && verse > 0
						? { verse }
						: data.reference.verse !== undefined
							? { verse: data.reference.verse }
							: {})
				})
			};
		}
	});

	function openStrong(
		strong: string,
		word: string,
		verse: number,
		book = data.reference.book,
		chapter = data.reference.chapter
	) {
		activeStrong = {
			strong,
			word,
			reference: formatReference({
				book,
				chapter,
				verse
			})
		};
		replaceState(
			`${page.url.pathname}#${encodeURIComponent(strong)}/${encodeURIComponent(word)}/${verse}`,
			page.state
		);
	}

	function closeStrong() {
		activeStrong = null;
		replaceState(page.url.pathname, page.state);
	}

	const previousPath = $derived(
		data.navigation.previous ? referencePath(data.navigation.previous) : null
	);
	const nextPath = $derived(data.navigation.next ? referencePath(data.navigation.next) : null);

	type StreamChapter = {
		reference: { book: number; chapter: number };
		fullTitle: string;
		shortBookName: string;
		chapter: typeof data.chapter;
		chapterNote: string | null;
		referenceResources: typeof data.referenceResources;
		navigation: {
			previous: { book: number; chapter: number } | null;
			next: { book: number; chapter: number } | null;
		};
	};

	function initialStreamChapter(): StreamChapter {
		return {
			reference: { book: data.reference.book, chapter: data.reference.chapter },
			fullTitle: data.fullTitle,
			shortBookName: data.shortBookName,
			chapter: data.chapter,
			chapterNote: data.chapterNote,
			referenceResources: data.referenceResources,
			navigation: data.navigation
		};
	}

	let streamChapters = $state<StreamChapter[]>([initialStreamChapter()]);
	let flowColumns = $state<HTMLElement[]>([]);
	let loadingPrevious = $state(false);
	let loadingNext = $state(false);
	let activeFlowSource = 0;
	let visibleChapterKey = $state('');
	let streamSignature = '';
	let streamColumnsKey = data.columns.map((column) => column.resource.id).join(',');
	let jumpedSignature = '';
	let suppressFlowScroll = false;
	let suppressFlowTimer: ReturnType<typeof setTimeout> | undefined;
	let suppressReaderScroll = false;
	let flowSyncTimer: ReturnType<typeof setTimeout> | undefined;
	const visibleStreamChapter = $derived(
		streamChapters.find(
			(stream) => `${stream.reference.book}:${stream.reference.chapter}` === visibleChapterKey
		) ?? streamChapters[0]
	);

	$effect(() => {
		const columnsKey = data.columns.map((column) => column.resource.id).join(',');
		const signature = `${data.reference.book}:${data.reference.chapter}:${columnsKey}`;
		if (signature !== streamSignature) {
			const columnsChanged = columnsKey !== streamColumnsKey;
			streamSignature = signature;
			streamColumnsKey = columnsKey;
			streamChapters = [initialStreamChapter()];
			// The flow columns themselves are keyed on the resource id, so they only get torn down
			// (and their `bind:this` re-run) when the set of columns changes — not on every chapter
			// navigation. Clearing this on every navigation would leave it permanently empty, since
			// nothing would ever repopulate it for the still-mounted column elements.
			if (columnsChanged) flowColumns = [];
			visibleChapterKey = `${data.reference.book}:${data.reference.chapter}`;
			activeFlowSource = 0;
			jumpedSignature = '';
			if (data.reference.verse === undefined) {
				// Landing on a new chapter always starts at its top, so the reset itself must not be
				// mistaken by `onReaderWindowScroll` for the reader having scrolled near the top of an
				// accumulated stream — that would immediately prepend the previous chapter and scroll
				// back down again, undoing the reset.
				suppressProgrammaticReaderScroll();
				tick().then(() => window.scrollTo({ top: 0, behavior: 'instant' }));
			}
			if (data.readerLayout === 'aligned') {
				// Mirrors the flow layout's own eager preload below: a chapter short enough to leave the
				// page unscrolled would otherwise never reach the scroll threshold that loads the next one.
				tick().then(() => void loadAlignedNext());
			}
		}
	});

	function suppressProgrammaticFlowScroll() {
		suppressFlowScroll = true;
		if (suppressFlowTimer) clearTimeout(suppressFlowTimer);
		suppressFlowTimer = setTimeout(() => {
			suppressFlowScroll = false;
		}, 80);
	}

	/**
	 * Suppresses `onReaderWindowScroll` for the one scroll event our own `window.scrollTo` reset
	 * causes, the same way `suppressProgrammaticFlowScroll` shields the flow columns from their own
	 * sync. Two animation frames comfortably span the async scroll event a browser dispatches after
	 * `scrollTo`.
	 */
	function suppressProgrammaticReaderScroll() {
		suppressReaderScroll = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				suppressReaderScroll = false;
			});
		});
	}

	async function fetchStreamChapter(reference: { book: number; chapter: number }) {
		const response = await fetch(`/api/reader/${reference.book}/${reference.chapter}`);
		if (!response.ok) throw new Error(`Kapitel konnte nicht geladen werden (${response.status})`);
		return (await response.json()) as StreamChapter;
	}

	async function loadStreamPrevious() {
		const reference = streamChapters[0]?.navigation.previous;
		if (!reference || flowColumns.length === 0 || loadingPrevious) return;
		loadingPrevious = true;
		const oldHeights = flowColumns.map((column) => column?.scrollHeight ?? 0);
		try {
			const chapter = await fetchStreamChapter(reference);
			streamChapters.unshift(chapter);
			await tick();
			for (const [index, column] of flowColumns.entries()) {
				if (column) {
					const next = column.scrollTop + column.scrollHeight - (oldHeights[index] ?? 0);
					suppressProgrammaticFlowScroll();
					column.scrollTop = next;
				}
			}
		} finally {
			loadingPrevious = false;
		}
	}

	async function loadStreamNext() {
		const reference = streamChapters.at(-1)?.navigation.next;
		if (!reference || loadingNext) return;
		loadingNext = true;
		try {
			streamChapters.push(await fetchStreamChapter(reference));
			await tick();
			syncFlowColumns(activeFlowSource);
		} finally {
			loadingNext = false;
		}
	}

	async function loadAlignedPrevious() {
		const reference = streamChapters[0]?.navigation.previous;
		if (!reference || loadingPrevious) return;
		loadingPrevious = true;
		const oldHeight = document.documentElement.scrollHeight;
		try {
			streamChapters.unshift(await fetchStreamChapter(reference));
			await tick();
			window.scrollBy(0, document.documentElement.scrollHeight - oldHeight);
		} finally {
			loadingPrevious = false;
		}
	}

	async function loadAlignedNext() {
		const reference = streamChapters.at(-1)?.navigation.next;
		if (!reference || loadingNext) return;
		loadingNext = true;
		try {
			streamChapters.push(await fetchStreamChapter(reference));
		} finally {
			loadingNext = false;
		}
	}

	/**
	 * Mirrors the flow columns' own scroll-threshold check (`onFlowScroll`) rather than an
	 * IntersectionObserver: a fixed root margin either never re-fires for a chapter short enough that
	 * the page never scrolls past it, or only re-fires once the reader has scrolled back out of and
	 * into that margin — both of which left "scroll up to load the previous chapter" permanently
	 * unreachable on some chapters.
	 */
	function onReaderWindowScroll() {
		if (data.readerLayout !== 'aligned') return;
		if (suppressReaderScroll) return;
		if (window.scrollY < 500) void loadAlignedPrevious();
		if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 900) {
			void loadAlignedNext();
		}

		const pickerBottom =
			document
				.querySelector<HTMLElement>('[data-testid="column-picker-bar"]')
				?.getBoundingClientRect().bottom ?? 0;
		const chapters = [...document.querySelectorAll<HTMLElement>('.aligned-chapter')];
		const chapter =
			chapters.findLast((section) => section.getBoundingClientRect().top <= pickerBottom + 8) ??
			chapters[0];
		if (chapter?.dataset.chapterKey) visibleChapterKey = chapter.dataset.chapterKey;
	}

	function updateVisibleChapter(source: HTMLElement, inset: number) {
		const top = source.getBoundingClientRect().top + inset;
		const chapters = [...source.querySelectorAll<HTMLElement>('[data-chapter-key]')];
		const chapter =
			chapters.findLast((section) => section.getBoundingClientRect().top <= top) ?? chapters[0];
		if (chapter?.dataset.chapterKey) visibleChapterKey = chapter.dataset.chapterKey;
	}

	function syncFlowColumns(sourceIndex = 0) {
		const source = flowColumns[sourceIndex];
		if (!source || data.readerLayout !== 'flow') return;
		const anchorInset = 12;
		const sourceTop = source.getBoundingClientRect().top + anchorInset;
		updateVisibleChapter(source, anchorInset);
		const verses = [...source.querySelectorAll<HTMLElement>('[data-verse-key]')];
		const anchor = verses.find((verse) => verse.getBoundingClientRect().bottom > sourceTop);
		if (!anchor?.dataset.verseKey) return;
		const sourceAnchorOffset = anchor.getBoundingClientRect().top - sourceTop;

		for (let index = 0; index < flowColumns.length; index += 1) {
			if (index === sourceIndex) continue;
			const column = flowColumns[index];
			const target = column?.querySelector<HTMLElement>(
				`[data-verse-key="${anchor.dataset.verseKey}"]`
			);
			if (column && target) {
				const columnTop = column.getBoundingClientRect().top + anchorInset;
				const next =
					column.scrollTop + target.getBoundingClientRect().top - columnTop - sourceAnchorOffset;
				suppressProgrammaticFlowScroll();
				column.scrollTop = next;
			}
		}
	}

	function makeFlowSource(columnIndex: number) {
		activeFlowSource = columnIndex;
		if (suppressFlowTimer) clearTimeout(suppressFlowTimer);
		suppressFlowScroll = false;
		if (flowSyncTimer) clearTimeout(flowSyncTimer);
	}

	/**
	 * Debounces the cross-column sync so it runs once the scroll has settled rather than on every
	 * scroll event. On touch devices a drag fires continuous scroll events with no gaps, so this
	 * keeps the other columns still until the finger lifts and any momentum scrolling stops — synced
	 * columns jumping around mid-drag reads as jittery, not helpful.
	 */
	function scheduleFlowSync(columnIndex: number) {
		if (flowSyncTimer) clearTimeout(flowSyncTimer);
		flowSyncTimer = setTimeout(() => {
			flowSyncTimer = undefined;
			syncFlowColumns(columnIndex);
		}, 150);
	}

	/**
	 * Any scroll that was not caused by our own sync (`suppressFlowScroll`) makes that column the
	 * source, regardless of whether a preceding wheel/pointer/touch/focus event already marked it as
	 * one — those events do not fire for every way a column can be scrolled (e.g. some trackpads,
	 * scrollbar dragging, or keyboard paging), and this handler is the one signal that always fires.
	 */
	function onFlowScroll(columnIndex: number) {
		if (suppressFlowScroll) return;
		activeFlowSource = columnIndex;
		const source = flowColumns[columnIndex];
		if (!source) return;
		updateVisibleChapter(source, 12);
		scheduleFlowSync(columnIndex);
		if (source.scrollTop < 500) void loadStreamPrevious();
		if (source.scrollHeight - source.scrollTop - source.clientHeight < 900) void loadStreamNext();
	}

	$effect(() => {
		if (data.readerLayout === 'flow') {
			tick().then(() => {
				syncFlowColumns(activeFlowSource);
				void loadStreamNext();
			});
		}
	});

	$effect(() => {
		const verse = data.reference.verse;
		if (verse === undefined) return;
		const signature = `${data.readerLayout}:${data.reference.book}:${data.reference.chapter}:${verse}`;
		if (signature === jumpedSignature) return;
		jumpedSignature = signature;

		tick().then(() => {
			if (data.readerLayout === 'flow') {
				for (const column of flowColumns) {
					const target =
						column?.querySelector<HTMLElement>(
							`[data-verse-key="${data.reference.book}:${data.reference.chapter}:${verse}"]`
						) ?? column?.querySelector<HTMLElement>('.flow-verse.highlighted');
					if (column && target) {
						const next =
							column.scrollTop +
							target.getBoundingClientRect().top -
							column.getBoundingClientRect().top -
							12;
						suppressProgrammaticFlowScroll();
						column.scrollTop = next;
					}
				}
				visibleChapterKey = `${data.reference.book}:${data.reference.chapter}`;
			} else {
				document.querySelector<HTMLElement>('.verse.highlighted')?.scrollIntoView({
					block: 'start'
				});
			}
		});
	});

	function firstCellVerse(stream: StreamChapter, bibleCellIndex: number | null): number | null {
		if (bibleCellIndex === null) return null;
		for (const row of stream.chapter.rows) {
			const cell = row.cells[bibleCellIndex];
			if (cell) return cell.verse;
		}
		return null;
	}
</script>

<svelte:window onscroll={onReaderWindowScroll} />

<svelte:head>
	<title>{data.fullTitle} — strongs.de</title>
	<meta
		name="description"
		content="{data.fullTitle} in {data.columns
			.map((column) => column.resource.abbrev)
			.join(', ')} — mit Strong-Nummern, Grammatik und Wörterbuch."
	/>
	{#if previousPath}<link rel="prev" href={previousPath} />{/if}
	{#if nextPath}<link rel="next" href={nextPath} />{/if}
</svelte:head>

<div class="flex min-h-0 flex-1">
	<!-- No `overflow-x` here: it would make this a scroll container, and every `sticky` inside it
	     would then stick to a box that never scrolls vertically. The grid's `minmax(0, 1fr)` tracks
	     cannot overflow anyway. -->
	<main class="min-w-0 flex-1 bg-white/65 dark:bg-stone-950/45">
		<div
			class="mx-auto max-w-[120rem] px-3 py-4 sm:px-5 sm:py-5"
			class:pb-sheet={activeStrong !== null}
		>
			<div
				class="sticky top-[var(--header-height)] z-20 -mx-3 mb-2 flex h-11 items-center gap-2
				       border-b border-stone-200 bg-white/95 px-3 backdrop-blur sm:-mx-5 sm:px-5
				       dark:border-stone-800 dark:bg-stone-950/95"
				data-testid="reader-location"
			>
				<h1
					class="mr-auto truncate font-serif text-xl font-semibold tracking-tight text-stone-800 sm:text-2xl
					       dark:text-stone-100"
				>
					{visibleStreamChapter?.fullTitle ?? data.fullTitle}
				</h1>
				<p class="hidden text-xs text-stone-500 xl:block dark:text-stone-400">
					{t('search.hint.strong')}
				</p>
				{#if data.user}
					<form method="POST" action="?/toggleNotes" use:enhance>
						<button
							type="submit"
							class="inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-2.5 py-1.5
							       text-xs font-medium text-stone-600 hover:border-accent-400 hover:text-accent-700
							       dark:border-stone-700 dark:text-stone-300 dark:hover:text-accent-300"
							aria-pressed={data.notesVisible}
						>
							<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
								<path
									d="M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5C3 16.22 3.78 17 4.75 17h10.5c.97 0 1.75-.78 1.75-1.75V4.75C17 3.78 16.22 3 15.25 3H4.75Zm2 3.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm.75 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"
								/>
							</svg>
							<span class="hidden sm:inline">
								{data.notesVisible ? t('reader.hideNotes') : t('reader.showNotes')}
							</span>
						</button>
					</form>
				{/if}
			</div>

			<!-- Column headers double as the translation picker. The bar sticks as one piece; a single
			     header cell is never taller than itself and so could never stick on its own. -->
			<div
				class="sticky top-[calc(var(--header-height)+2.75rem)] z-10 mb-2 hidden gap-0 overflow-hidden rounded-md border
				       border-stone-200 bg-stone-50/95 py-1.5 shadow-sm backdrop-blur sm:grid
				       dark:border-stone-800 dark:bg-stone-950/95"
				data-testid="column-picker-bar"
				style="grid-template-columns: repeat({visibleColumnCount}, minmax(0, 1fr))"
			>
				{#each data.columns as column (column.resource.id)}
					<div
						draggable="true"
						role="group"
						aria-label="{column.resource.abbrev}: {t('reader.dragColumn')}"
						class="min-w-0 border-r border-stone-200 last:border-r-0 dark:border-stone-800"
						class:opacity-40={draggedColumn === column.index}
						class:ring-2={dropColumn === column.index}
						class:ring-accent-400={dropColumn === column.index}
						ondragstart={(event) => startColumnDrag(event, column.index)}
						ondragover={(event) => {
							event.preventDefault();
							dropColumn = column.index;
						}}
						ondragleave={() => (dropColumn = null)}
						ondrop={(event) => dropOnColumn(event, column.index)}
						ondragend={() => {
							draggedColumn = null;
							dropColumn = null;
						}}
					>
						<ColumnPicker
							index={column.index}
							selected={column.resource}
							available={data.readerResources}
							chosen={data.columns.map((other) => other.resource.id)}
							canRemove={data.columns.length > 1}
							canAdd={canAddColumn && column.index === data.columns.length - 1}
						/>
					</div>
				{/each}
				{#if data.notesVisible}
					<div class="flex min-h-8 items-center justify-between gap-2 px-2">
						<span class="truncate text-sm font-semibold text-stone-700 dark:text-stone-200">
							{t('reader.notesColumn')}
						</span>
						<form method="POST" action="?/toggleNotes" use:enhance class="flex items-center">
							<button
								type="submit"
								class="inline-flex size-7 items-center justify-center rounded text-stone-400
								       hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800
								       dark:hover:text-stone-200"
								aria-label={t('reader.hideNotes')}
							>
								<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true">
									<path
										d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
									/>
								</svg>
							</button>
						</form>
					</div>
				{/if}
			</div>
			<form bind:this={reorderForm} method="POST" action="?/moveColumn" use:enhance class="hidden">
				<input bind:this={reorderFromInput} type="hidden" name="from" />
				<input bind:this={reorderToInput} type="hidden" name="to" />
			</form>

			<!-- On a phone one column fits; tabs switch between translations. -->
			<div
				class="sticky top-[calc(var(--header-height)+2.75rem)] z-10 -mx-3 flex gap-1 overflow-x-auto border-b
				       border-stone-200 bg-white/95 px-3 py-2 backdrop-blur sm:hidden
				       dark:border-stone-800 dark:bg-stone-950/95"
				data-testid="column-picker-bar"
			>
				{#each data.columns as column (column.resource.id)}
					<button
						type="button"
						class="shrink-0 rounded-full px-3 py-1 text-sm"
						class:bg-accent-600={mobileColumn === column.index}
						class:text-white={mobileColumn === column.index}
						class:bg-stone-100={mobileColumn !== column.index}
						class:dark:bg-stone-800={mobileColumn !== column.index}
						onclick={() => (mobileColumn = column.index)}
					>
						{column.resource.abbrev}
					</button>
				{/each}
				{#if data.notesVisible}
					<button
						type="button"
						class="shrink-0 rounded-full px-3 py-1 text-sm"
						class:bg-accent-600={mobileColumn === notesColumnIndex}
						class:text-white={mobileColumn === notesColumnIndex}
						class:bg-stone-100={mobileColumn !== notesColumnIndex}
						class:dark:bg-stone-800={mobileColumn !== notesColumnIndex}
						onclick={() => (mobileColumn = notesColumnIndex)}
					>
						{t('lists.note')}
					</button>
				{/if}

				{#if canAddColumn}
					<form method="POST" action="?/addColumn" use:enhance>
						<button
							type="submit"
							title={t('reader.addColumn')}
							aria-label={t('reader.addColumn')}
							class="shrink-0 rounded-full border border-dashed border-stone-300 px-3 py-1
							       text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400"
							onclick={(event) => {
								event.preventDefault();
								addColumnMenu?.openAt(event.currentTarget);
							}}
						>
							+
						</button>
					</form>

					<Menu bind:this={addColumnMenu} label={t('reader.addColumn')}>
						<p class="menu-label">{t('reader.addColumn')}</p>
						<ResourceMenuItems
							resources={unusedResources}
							action="?/addColumn"
							onChoose={() => addColumnMenu?.close()}
						/>
					</Menu>
				{/if}
			</div>

			{#if data.chapter.empty}
				<p class="rounded-lg bg-stone-50 p-6 text-stone-600 dark:bg-stone-900 dark:text-stone-300">
					{t('reader.chapterEmpty')}
				</p>
			{:else if data.readerLayout === 'flow'}
				<div class="flow-reader" style="--columns: {visibleColumnCount}" data-testid="flow-reader">
					{#each data.columns as column, columnIndex (column.resource.id)}
						<div
							bind:this={flowColumns[columnIndex]}
							class="flow-column"
							class:hidden-on-mobile={columnIndex !== mobileColumn}
							role="region"
							aria-label={column.resource.name}
							onwheel={() => makeFlowSource(columnIndex)}
							ontouchstart={() => makeFlowSource(columnIndex)}
							onpointerdown={() => makeFlowSource(columnIndex)}
							onfocusin={() => makeFlowSource(columnIndex)}
							onscroll={() => onFlowScroll(columnIndex)}
						>
							{#if loadingPrevious}
								<p class="loading-chapter" aria-live="polite">…</p>
							{/if}
							{#each streamChapters as stream (`${stream.reference.book}:${stream.reference.chapter}`)}
								{@const streamHeadings = new Map(stream.chapter.headings)}
								{@const firstVerse = firstCellVerse(stream, column.bibleCellIndex)}
								<section
									class="flow-chapter"
									data-chapter-key={`${stream.reference.book}:${stream.reference.chapter}`}
								>
									{#each stream.chapter.rows as row (row.verse)}
										{@const cell =
											column.bibleCellIndex === null ? null : row.cells[column.bibleCellIndex]}
										{#if streamHeadings.has(row.verse) && column.resource.kind === 'bible'}
											<h3 class="flow-heading">{streamHeadings.get(row.verse)}</h3>
										{/if}
										{#if column.resource.kind === 'bible' && cell}
											{@const [leadSegments, remainingSegments] = splitVerseLead(cell.segments)}
											<p
												class="flow-verse"
												data-verse-key={`${stream.reference.book}:${stream.reference.chapter}:${cell.verse}`}
												id={columnIndex === 0
													? `${stream.shortBookName}${stream.reference.chapter}_${cell.verse}`
													: undefined}
												class:highlighted={stream.reference.book === data.reference.book &&
													stream.reference.chapter === data.reference.chapter &&
													data.reference.verse !== undefined &&
													cell.verse <= data.reference.verse &&
													(cell.verseEnd ?? cell.verse) >= data.reference.verse}
											>
												<span class="verse-lead">
													{#if cell.verse === firstVerse}
														<span class="flow-chapter-number" title={stream.fullTitle}>
															{stream.reference.chapter}
														</span>
													{/if}
													{#if cell.verse !== 1 || cell.verse !== firstVerse}
														<a
															class="verse-number"
															class:in-list={stream.reference.book === data.reference.book &&
																stream.reference.chapter === data.reference.chapter &&
																inAnyList.has(cell.verse)}
															href={referencePath({
																book: stream.reference.book,
																chapter: stream.reference.chapter,
																verse: cell.verse
															})}
															aria-haspopup="menu"
															aria-label={t('verse.menu', {
																reference: formatReference(
																	{
																		book: stream.reference.book,
																		chapter: stream.reference.chapter,
																		verse: cell.verse
																	},
																	{ style: 'full' }
																)
															})}
															onclick={(event) =>
																onVerseNumberClick(
																	event,
																	stream.reference.book,
																	stream.reference.chapter,
																	cell.verse,
																	cell.verseEnd,
																	cell.segments
																)}
														>
															{cell.verse}{#if cell.verseEnd && cell.verseEnd > cell.verse}-{cell.verseEnd}{/if}
														</a>
													{/if}<span
														class="verse-text"
														lang={column.resource.language}
														dir={column.resource.direction}
														><VerseText
															segments={leadSegments}
															onStrongClick={(strong, word) =>
																openStrong(
																	strong,
																	word,
																	cell.verse,
																	stream.reference.book,
																	stream.reference.chapter
																)}
															activeStrong={activeStrong?.strong ?? null}
														/></span
													></span
												><span
													class="verse-text"
													lang={column.resource.language}
													dir={column.resource.direction}
												>
													<VerseText
														segments={remainingSegments}
														onStrongClick={(strong, word) =>
															openStrong(
																strong,
																word,
																cell.verse,
																stream.reference.book,
																stream.reference.chapter
															)}
														activeStrong={activeStrong?.strong ?? null}
													/>
												</span>
											</p>
										{:else if column.resource.kind === 'commentary'}
											{@const entries = commentaryAt(
												stream.referenceResources,
												column.resource.id,
												row.verse
											)}
											{#if entries.length}
												<article
													class="flow-reference"
													data-verse-key={`${stream.reference.book}:${stream.reference.chapter}:${row.verse}`}
												>
													<span class="verse-number">{row.verse}</span>
													{#each entries as entry (entry.id)}
														{#if entry.title}<h3 class="commentary-title">{entry.title}</h3>{/if}
														<!-- Imported commentary is reduced to an allow-list by its parser. -->
														<!-- eslint-disable-next-line svelte/no-at-html-tags -->
														<div class="commentary-body">{@html entry.bodyHtml}</div>
													{/each}
												</article>
											{/if}
										{:else if column.resource.kind === 'xrefs'}
											{@const references = crossReferencesAt(
												stream.referenceResources,
												column.resource.id,
												row.verse
											)}
											{#if references.length}
												<div
													class="flow-reference"
													data-verse-key={`${stream.reference.book}:${stream.reference.chapter}:${row.verse}`}
												>
													<span class="verse-number">{row.verse}</span>
													{#each references as target (target.id)}
														<a
															class="mr-1 text-xs text-accent-700 dark:text-accent-300"
															href={referencePath({
																book: target.toBook,
																chapter: target.toChapter,
																verse: target.toVerse
															})}
														>
															{formatReference({
																book: target.toBook,
																chapter: target.toChapter,
																verse: target.toVerse
															})}
														</a>
													{/each}
												</div>
											{/if}
										{/if}
									{/each}
								</section>
							{/each}
							{#if loadingNext}
								<p class="loading-chapter" aria-live="polite">…</p>
							{/if}
						</div>
					{/each}
					{#if data.notesVisible}
						<aside
							class="flow-column flow-note"
							class:hidden-on-mobile={mobileColumn !== notesColumnIndex}
						>
							{#each streamChapters as stream (`note:${stream.reference.book}:${stream.reference.chapter}`)}
								<div
									class:hidden-note={`${stream.reference.book}:${stream.reference.chapter}` !==
										(visibleChapterKey || `${data.reference.book}:${data.reference.chapter}`)}
								>
									<h2 class="note-chapter-title">{stream.fullTitle}</h2>
									<NoteEditor
										action="?/saveChapterNote"
										reference="{stream.shortBookName}{stream.reference.chapter}"
										html={stream.chapterNote}
										placeholder={t('lists.chapterNotePlaceholder')}
										onSaved={(html) => (stream.chapterNote = html)}
									/>
								</div>
							{/each}
						</aside>
					{/if}
				</div>

				<!-- Each flow column scrolls endlessly on its own, so there is no natural "end of chapter"
				     point inside it to hang a licence notice on; shown once below the box instead. -->
				<footer
					class="license-grid grid text-xs text-stone-500 dark:text-stone-400"
					style="--columns: {visibleColumnCount}"
				>
					{#each data.columns as column (column.resource.id)}
						<div class:hidden-on-mobile={column.index !== mobileColumn}>
							{#if column.resource.licenseHtml}
								<p><strong>{column.resource.abbrev}:</strong> {column.resource.licenseHtml}</p>
							{/if}
						</div>
					{/each}
				</footer>
			{:else}
				<div class="infinite-edge" aria-hidden="true">
					{#if loadingPrevious}…{/if}
				</div>
				{#each streamChapters as stream (`${stream.reference.book}:${stream.reference.chapter}`)}
					{@const alignedHeadings = new Map(stream.chapter.headings)}
					<section
						class="aligned-chapter"
						data-chapter-key={`${stream.reference.book}:${stream.reference.chapter}`}
					>
						{#if stream.reference.book !== data.reference.book || stream.reference.chapter !== data.reference.chapter}
							<h2 class="aligned-chapter-title">{stream.fullTitle}</h2>
						{/if}
						<div
							class="verse-grid"
							style="--columns: {visibleColumnCount}"
							data-mobile-column={mobileColumn}
						>
							{#if data.notesVisible}
								<aside
									class="chapter-note"
									class:hidden-on-mobile={mobileColumn !== notesColumnIndex}
									style="grid-column: {notesColumnIndex + 1}; grid-row: 1 / span {Math.max(
										1,
										stream.chapter.rows.length * 2 + 1
									)}"
								>
									<h2 class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
										{t('reader.notesColumn')}
									</h2>
									<NoteEditor
										action="?/saveChapterNote"
										reference="{stream.shortBookName}{stream.reference.chapter}"
										html={stream.chapterNote}
										placeholder={t('lists.chapterNotePlaceholder')}
										onSaved={(html) => (stream.chapterNote = html)}
									/>
								</aside>
							{/if}

							{#each stream.chapter.rows as row, rowIndex (row.verse)}
								{#if alignedHeadings.has(row.verse)}
									<h2
										class="heading"
										class:hidden-on-mobile={mobileColumn === notesColumnIndex}
										style="grid-column: 1 / span {data.columns.length}; grid-row: {rowIndex * 2 +
											1}"
									>
										{alignedHeadings.get(row.verse)}
									</h2>
								{/if}

								{#each data.columns as column, columnIndex (column.resource.id)}
									{@const cell =
										column.bibleCellIndex === null ? null : row.cells[column.bibleCellIndex]}
									{#if column.resource.kind === 'bible' && cell}
										<p
											class="verse"
											class:hidden-on-mobile={columnIndex !== mobileColumn}
											id={columnIndex === 0
												? `${stream.shortBookName}${stream.reference.chapter}_${cell.verse}`
												: undefined}
											style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 +
												2} / span {cell.span * 2 - 1}"
											class:highlighted={stream.reference.book === data.reference.book &&
												stream.reference.chapter === data.reference.chapter &&
												data.reference.verse !== undefined &&
												cell.verse <= data.reference.verse &&
												(cell.verseEnd ?? cell.verse) >= data.reference.verse}
										>
											<a
												class="verse-number"
												class:in-list={inAnyList.has(cell.verse)}
												href={referencePath({
													book: stream.reference.book,
													chapter: stream.reference.chapter,
													verse: cell.verse
												})}
												aria-haspopup="menu"
												aria-label={t('verse.menu', {
													reference: formatReference(
														{
															book: stream.reference.book,
															chapter: stream.reference.chapter,
															verse: cell.verse
														},
														{ style: 'full' }
													)
												})}
												onclick={(event) =>
													onVerseNumberClick(
														event,
														stream.reference.book,
														stream.reference.chapter,
														cell.verse,
														cell.verseEnd,
														cell.segments
													)}
											>
												{cell.verse}{#if cell.verseEnd && cell.verseEnd > cell.verse}-{cell.verseEnd}{/if}
											</a><span
												class="verse-text"
												lang={data.columns[columnIndex]?.resource.language}
												dir={data.columns[columnIndex]?.resource.direction}
											>
												<VerseText
													segments={cell.segments}
													onStrongClick={(strong, word) =>
														openStrong(
															strong,
															word,
															cell.verse,
															stream.reference.book,
															stream.reference.chapter
														)}
													activeStrong={activeStrong?.strong ?? null}
												/>
											</span>
										</p>
									{:else if column.resource.kind === 'commentary'}
										{@const entries = commentaryAt(
											stream.referenceResources,
											column.resource.id,
											row.verse
										)}
										{#if entries.length > 0}
											<article
												class="reference-cell"
												class:hidden-on-mobile={columnIndex !== mobileColumn}
												style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 + 2}"
											>
												<span class="verse-number">{row.verse}</span>
												{#each entries as entry (entry.id)}
													{#if entry.title}
														<h3 class="commentary-title">{entry.title}</h3>
													{/if}
													<!-- Imported commentary is reduced to an allow-list by its parser. -->
													<!-- eslint-disable-next-line svelte/no-at-html-tags -->
													<div class="commentary-body">{@html entry.bodyHtml}</div>
												{/each}
											</article>
										{/if}
									{:else if column.resource.kind === 'xrefs'}
										{@const references = crossReferencesAt(
											stream.referenceResources,
											column.resource.id,
											row.verse
										)}
										{#if references.length > 0}
											<div
												class="reference-cell"
												class:hidden-on-mobile={columnIndex !== mobileColumn}
												style="grid-column: {columnIndex + 1}; grid-row: {rowIndex * 2 + 2}"
											>
												<span class="verse-number">{row.verse}</span>
												<ul class="flex flex-wrap gap-1">
													{#each references as target (target.id)}
														<li>
															<a
																class="inline-block rounded border border-stone-200 px-1.5 py-0.5 text-xs
														       hover:border-accent-500 hover:text-accent-700 dark:border-stone-700
														       dark:hover:text-accent-300"
																href={referencePath({
																	book: target.toBook,
																	chapter: target.toChapter,
																	verse: target.toVerse,
																	...(target.toVerseEnd > target.toVerse
																		? { verseEnd: target.toVerseEnd }
																		: {})
																})}
															>
																{formatReference({
																	book: target.toBook,
																	chapter: target.toChapter,
																	verse: target.toVerse,
																	...(target.toVerseEnd > target.toVerse
																		? { verseEnd: target.toVerseEnd }
																		: {})
																})}
															</a>
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									{/if}
								{/each}
							{/each}
						</div>

						<!-- Licence notices stay in the same columns as their respective translations. Shown
						     after every chapter — endless scrolling means the reader may never reach a single
						     footer at the very end of the loaded list otherwise. -->
						<footer
							class="license-grid grid text-xs text-stone-500 dark:text-stone-400"
							style="--columns: {visibleColumnCount}"
						>
							{#each data.columns as column (column.resource.id)}
								<div class:hidden-on-mobile={column.index !== mobileColumn}>
									{#if column.resource.licenseHtml}
										<p><strong>{column.resource.abbrev}:</strong> {column.resource.licenseHtml}</p>
									{/if}
								</div>
							{/each}
						</footer>
					</section>
				{/each}
				<div class="infinite-edge" aria-hidden="true">
					{#if loadingNext}…{/if}
				</div>
			{/if}
		</div>
	</main>

	{#if activeStrong}
		<StudySidebar
			strong={activeStrong.strong}
			word={activeStrong.word}
			reference={activeStrong.reference}
			resourceIds={data.columns.map((column) => column.resource.id)}
			onClose={closeStrong}
		/>
	{/if}
</div>

<!-- One menu for the whole chapter, opened with whichever verse number was clicked. -->
<VerseMenu bind:this={verseMenu} lists={data.lists} signedIn={data.user !== null} {marks} />

<style>
	.verse-grid {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		column-gap: 0;
		align-items: start;
		border-radius: 0.5rem;
		background: rgb(255 255 255 / 0.42);
		box-shadow: 0 1px 0 rgb(120 113 108 / 0.08);
	}

	:global(.dark) .verse-grid {
		background: rgb(28 25 23 / 0.28);
	}

	.license-grid {
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		margin-top: 1.5rem;
	}

	.aligned-chapter + .aligned-chapter {
		margin-top: 2rem;
	}

	.aligned-chapter-title {
		margin: 0 0 0.6rem;
		padding-top: 0.5rem;
		font-family: var(--font-serif);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-stone-700);
	}

	:global(.dark) .aligned-chapter-title {
		color: var(--color-stone-200);
	}

	.infinite-edge {
		min-height: 1px;
		padding: 0.25rem;
		text-align: center;
		color: var(--color-stone-400);
	}

	.flow-reader {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		height: max(28rem, calc(100dvh - var(--header-height) - 11.5rem));
		overflow: hidden;
		border: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
		border-radius: 0.5rem;
		background: rgb(255 255 255 / 0.42);
	}

	:global(.dark) .flow-reader {
		border-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
		background: rgb(28 25 23 / 0.28);
	}

	.flow-column {
		min-width: 0;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		scrollbar-width: none;
		border-left: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
	}

	.flow-column::-webkit-scrollbar {
		display: none;
	}

	.flow-column:first-child {
		border-left: 0;
	}

	/* Enough trailing room for the final verse to become the top anchor as well. Without this, a
	   shorter translation would hit its scroll limit before it could follow the first column. */
	.flow-column::after {
		display: block;
		height: calc(100% - 3rem);
		content: '';
	}

	:global(.dark) .flow-column {
		border-left-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
	}

	.flow-chapter {
		padding: 0.8rem 0.9rem 1.4rem;
	}

	.flow-chapter + .flow-chapter {
		padding-top: 1.5rem;
	}

	.flow-chapter-number {
		margin-right: 0.28em;
		font-family: var(--font-serif);
		font-size: 1.45em;
		font-weight: 800;
		line-height: 0;
		color: var(--color-stone-900);
	}

	:global(.dark) .flow-chapter-number {
		color: var(--color-stone-50);
	}

	.flow-heading {
		margin: 1rem 0 0.25rem;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-stone-500);
	}

	.flow-verse {
		display: inline;
		margin: 0;
		font-family: var(--font-serif);
		font-size: calc(1.035rem * var(--reader-font-scale, 1));
		line-height: 1.72;
		hyphens: auto;
	}

	.verse-lead {
		white-space: nowrap;
	}

	.flow-verse .verse-text {
		overflow-wrap: break-word;
		word-break: normal;
	}

	.flow-verse::after {
		content: ' ';
	}

	.flow-verse .verse-number {
		margin-right: 0.08em;
		padding-inline: 0.18em;
		font-size: 0.72em;
		font-weight: 750;
		color: var(--color-accent-700);
	}

	:global(.dark) .flow-verse .verse-number {
		color: var(--color-accent-300);
	}

	.flow-verse.highlighted {
		background-color: color-mix(in oklab, var(--color-accent-500) 12%, transparent);
	}

	.flow-reference {
		/* flow-root, not just overflow: hidden, so the floated verse number below is contained even
		   when an entry is shorter than the number's own line height. */
		display: flow-root;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.flow-note {
		padding: 0.8rem;
	}

	.hidden-note {
		display: none;
	}

	.note-chapter-title {
		margin-bottom: 0.6rem;
		font-family: var(--font-serif);
		font-size: 1rem;
		font-weight: 650;
		color: var(--color-stone-700);
	}

	:global(.dark) .note-chapter-title {
		color: var(--color-stone-200);
	}

	.loading-chapter {
		padding: 0.75rem;
		text-align: center;
		color: var(--color-stone-400);
	}

	.reference-cell {
		display: flow-root;
		min-width: 0;
		padding: 0.45rem 0.75rem 0.8rem;
		border-right: 1px solid var(--color-stone-100);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	:global(.dark) .reference-cell {
		border-color: var(--color-stone-800);
	}

	/* The verse number sits in the margin rather than on its own line above the text, matching how
	   the bible columns keep their number attached to the first word. */
	.flow-reference .verse-number,
	.reference-cell .verse-number {
		float: left;
		margin-top: 0.2em;
		margin-right: 0.4em;
	}

	.commentary-title {
		margin: 0 0 0.3rem;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--color-stone-700);
	}

	:global(.dark) .commentary-title {
		color: var(--color-stone-200);
	}

	.commentary-body :global(p) {
		margin: 0 0 0.6rem;
	}

	.commentary-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.commentary-body :global(ul),
	.commentary-body :global(ol) {
		margin: 0 0 0.6rem 1.1rem;
	}

	.commentary-body :global(li + li) {
		margin-top: 0.2rem;
	}

	.commentary-body :global(blockquote) {
		margin: 0.4rem 0 0.6rem;
		padding-left: 0.7rem;
		border-left: 2px solid var(--color-stone-300);
		font-style: italic;
		color: var(--color-stone-600);
	}

	:global(.dark) .commentary-body :global(blockquote) {
		border-left-color: var(--color-stone-600);
		color: var(--color-stone-400);
	}

	/* One column on a phone: the inactive ones are hidden and every cell moves to column 1. */
	@media (max-width: 639px) {
		.verse-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.license-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.flow-reader {
			grid-template-columns: minmax(0, 1fr);
			height: max(25rem, calc(100dvh - var(--header-height) - 10.5rem));
		}

		.hidden-on-mobile {
			display: none;
		}

		.verse {
			grid-column: 1 !important;
		}
	}

	.heading {
		margin: 1.5rem 0 0.25rem;
		padding: 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-stone-500);
	}

	.chapter-note {
		position: sticky;
		top: calc(var(--header-height) + 6.5rem);
		align-self: start;
		min-width: 0;
		margin: 0;
		padding: 0.8rem;
		border-left: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
		font-family: var(--font-sans);
	}

	:global(.dark) .chapter-note {
		border-left-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
	}

	@media (max-width: 639px) {
		.chapter-note {
			position: static;
			grid-column: 1 !important;
			grid-row: 1 !important;
			border-left: 0;
		}
	}

	:global(.dark) .heading {
		color: var(--color-stone-400);
	}

	.verse {
		align-self: stretch;
		margin: 0;
		padding: 0.48rem 0.8rem;
		font-family: var(--font-serif);
		font-size: calc(1.035rem * var(--reader-font-scale, 1));
		line-height: 1.72;
		border-left: 1px solid color-mix(in oklab, var(--color-stone-300) 55%, transparent);
		hyphens: auto;
		scroll-margin-top: calc(var(--header-height) + 6.5rem);
	}

	.verse:nth-of-type(1) {
		border-left-color: transparent;
	}

	:global(.dark) .verse {
		border-left-color: color-mix(in oklab, var(--color-stone-700) 65%, transparent);
	}

	.verse.highlighted {
		background-color: color-mix(in oklab, var(--color-accent-500) 12%, transparent);
	}

	/* The number opens the verse menu, so it needs to look and feel like a control rather than a
	   superscript: a tap target with some padding around the two digits. */
	.verse-number {
		display: inline-block;
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 700;
		vertical-align: 0.35em;
		margin-right: 0.15em;
		padding: 0.15em 0.25em;
		min-width: 1.4em;
		text-align: center;
		border-radius: 0.25rem;
		color: var(--color-accent-700);
		text-decoration: none;
		cursor: pointer;
	}

	.verse-number:hover,
	.verse-number:focus-visible {
		background-color: var(--color-stone-100);
		color: var(--color-accent-600);
	}

	:global(.dark) .verse-number:hover,
	:global(.dark) .verse-number:focus-visible {
		background-color: var(--color-stone-800);
		color: var(--color-accent-400);
	}

	:global(.dark) .verse-number {
		color: var(--color-accent-300);
	}

	/* Already saved in a verse list. Replaces the star that used to sit beside the number and break
	   the line, because a <form> is block-level content inside inline text. */
	.verse-number.in-list {
		color: var(--color-accent-500);
	}

	.verse-text {
		/* No `overflow-x` on the reader any more, so an unbreakable original-language word has to be
		   allowed to break rather than widen the page. */
		overflow-wrap: anywhere;

		/* Greek and Hebrew need their own faces; the attribute is set from the resource language. */
		&:where([lang='grc']) {
			font-family: var(--font-greek);
		}
		&:where([lang='hbo']) {
			font-family: var(--font-hebrew);
			font-size: 1.25rem;
		}
	}

	/* Room to scroll the last verses clear of the mobile study sheet. */
	@media (max-width: 639px) {
		.pb-sheet {
			padding-bottom: 72dvh;
		}
	}
</style>

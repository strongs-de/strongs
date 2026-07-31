import type { VerseRef } from './bible/reference';

/**
 * The reference currently visible in the reader, shared outside the component tree so the header's
 * search field — which lives in the root layout, a level above the reader page — can follow it while
 * scrolling.
 *
 * This has to be its own reactive store rather than reading `page.url` from `$app/state`: SvelteKit's
 * `replaceState` (used by the reader to keep the address bar in step while scrolling) only updates
 * `page.state`, by design — it deliberately does not touch the reactive `page.url`, so nothing outside
 * the component that called it would ever see the change.
 */
export const readerLocation: { reference: VerseRef | null } = $state({ reference: null });

/**
 * Lets the header ask the reader to scroll to a reference instead of navigating there, so pressing
 * Enter on a reference that is already on screen (or already loaded via infinite scroll) still does
 * something instead of being a no-op because the URL would not change.
 *
 * A plain exported `let` rather than a `$state` — it is a callback, not a value read during render, and
 * ES module bindings are already live across importers.
 */
export let jumpToVerse: ((reference: VerseRef) => boolean) | null = null;

export function setJumpToVerse(fn: ((reference: VerseRef) => boolean) | null): void {
	jumpToVerse = fn;
}

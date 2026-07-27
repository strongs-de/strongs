import type { ParamMatcher } from '@sveltejs/kit';
import { parseStrongId } from '$lib/bible/strong';

/**
 * Matches a Strong's number in a URL, so `/G26` gets its own route instead of competing with the
 * reference resolver in the catch-all.
 */
export const match: ParamMatcher = (param) => parseStrongId(param) !== null;

import { describe, expect, it } from 'vitest';
import { segmentsToText } from '../../bible/segments.ts';
import type { ParsedVerse } from '../../bible/parse/types.ts';
import { resolveDuplicate } from './duplicates.ts';

/**
 * The duplicate rule is derived from a real defect in `data/bibles/GER_ILGRDE.xml`, so the test
 * reproduces that shape rather than an invented one.
 */
function verse(chapter: number, number: number, text: string): ParsedVerse {
	return { book: 48, chapter, verse: number, segments: text ? [text] : [] };
}

describe('resolveDuplicate', () => {
	it('keeps the first text when both duplicates have content', () => {
		const first = verse(2, 1, 'Darauf nach vierzehn Jahren ging ich wieder hinauf');
		const second = verse(2, 1, 'Jude seiend, heidnisch und nicht jüdisch lebst');

		const outcome = resolveDuplicate(first, second);
		expect(outcome.keep).toBe('first');
		expect(segmentsToText(outcome.verse.segments)).toContain('vierzehn Jahren');
	});

	it('replaces an empty verse with a later one that has text', () => {
		const outcome = resolveDuplicate(verse(2, 15, ''), verse(2, 15, 'Wir sind von Natur Juden'));
		expect(outcome.keep).toBe('later');
		expect(segmentsToText(outcome.verse.segments)).toBe('Wir sind von Natur Juden');
	});

	it('keeps the first when both are empty', () => {
		const outcome = resolveDuplicate(verse(2, 5, ''), verse(2, 5, ''));
		expect(outcome.keep).toBe('first');
	});

	it('describes the decision for the import warning', () => {
		expect(resolveDuplicate(verse(2, 1, 'a'), verse(2, 1, 'b')).reason).toMatch(/first/);
		expect(resolveDuplicate(verse(2, 1, ''), verse(2, 1, 'b')).reason).toMatch(/later/);
	});
});

import { describe, expect, it } from 'vitest';
import {
	finalizeSegments,
	splitVerseLead,
	segmentsToText,
	tidySegmentSpacing,
	wordsFromSegments,
	type VerseSegment
} from './segments.ts';

describe('segmentsToText', () => {
	it('flattens words and plain runs', () => {
		expect(
			segmentsToText(['Im ', { kind: 'w', text: 'Anfang', strong: 'H7225' }, ' schuf Gott.'])
		).toBe('Im Anfang schuf Gott.');
	});

	it('leaves notes out, so a search cannot match editorial text', () => {
		expect(
			segmentsToText([
				'Und Adam erkannte sein Weib Eva',
				{ kind: 'note', marker: '', text: 'Hebr. Chawwa' }
			])
		).toBe('Und Adam erkannte sein Weib Eva');
	});

	it('includes emphasis and words of Jesus', () => {
		expect(
			segmentsToText([
				{ kind: 'em', text: 'ist' },
				' ',
				{ kind: 'wj', children: ['Ich bin ', { kind: 'em', text: 'der' }, ' Weg'] }
			])
		).toBe('ist Ich bin der Weg');
	});

	it('turns a line break into a space', () => {
		expect(segmentsToText(['Zeile eins', { kind: 'br' }, 'Zeile zwei'])).toBe(
			'Zeile eins Zeile zwei'
		);
	});
});

describe('splitVerseLead', () => {
	it('keeps the first word and its punctuation together', () => {
		expect(splitVerseLead(['Jesus, antwortete ihnen.'])).toEqual([
			['Jesus,'],
			[' antwortete ihnen.']
		]);
	});

	it('attaches punctuation from the next segment to a tagged word', () => {
		const word = { kind: 'w', text: 'Jesus', strong: 'G2424' } as const;
		expect(splitVerseLead([word, '? Danach'])).toEqual([[word, '?'], [' Danach']]);
	});
});

describe('tidySegmentSpacing', () => {
	it('removes the space that tagged-word markup leaves before punctuation', () => {
		// What Zefania produces: every tagged word ends with a space, including before a comma.
		const segments: VerseSegment[] = [
			{ kind: 'w', text: 'Christi', strong: 'G5547' },
			' , des ',
			{ kind: 'w', text: 'Sohnes', strong: 'G5207' },
			' .'
		];
		expect(segmentsToText(tidySegmentSpacing(segments))).toBe('Christi, des Sohnes.');
	});

	it('removes the space after an opening bracket', () => {
		expect(
			segmentsToText(tidySegmentSpacing(['( ', { kind: 'w', text: 'so', strong: 'G3779' }]))
		).toBe('(so');
	});

	it('never eats the single space that separates two words', () => {
		const segments: VerseSegment[] = [
			{ kind: 'w', text: 'schuf', strong: 'H1254' },
			' ',
			{ kind: 'w', text: 'Gott', strong: 'H430' }
		];
		expect(segmentsToText(tidySegmentSpacing(segments))).toBe('schuf Gott');
	});

	it('does not touch the words themselves', () => {
		const word = { kind: 'w', text: ' Gott ', strong: 'H430' } as const;
		expect(tidySegmentSpacing([word])[0]).toBe(word);
	});
});

describe('finalizeSegments', () => {
	it('trims the outer edges of a verse', () => {
		expect(finalizeSegments(['  Im Anfang', ' '])).toEqual(['Im Anfang']);
	});

	it('keeps interior separators', () => {
		expect(
			finalizeSegments([
				' ',
				{ kind: 'w', text: 'a', strong: 'G1' },
				' ',
				{ kind: 'w', text: 'b', strong: 'G2' },
				' '
			])
		).toEqual([
			{ kind: 'w', text: 'a', strong: 'G1' },
			' ',
			{ kind: 'w', text: 'b', strong: 'G2' }
		]);
	});
});

describe('wordsFromSegments', () => {
	it('numbers words in reading order and ignores plain text', () => {
		expect(
			wordsFromSegments([
				'Im ',
				{ kind: 'w', text: 'Anfang', strong: 'H7225' },
				' ',
				{ kind: 'w', text: 'schuf', strong: 'H1254', morph: 'V-QAL' }
			])
		).toEqual([
			{ position: 0, text: 'Anfang', strong: 'H7225' },
			{ position: 1, text: 'schuf', strong: 'H1254', morph: 'V-QAL' }
		]);
	});

	it('emits one row per number for a word carrying several, sharing the position', () => {
		expect(
			wordsFromSegments([
				{ kind: 'w', text: 'sechshundert', strong: 'H8337', strongs: ['H8337', 'H3967'] },
				' ',
				{ kind: 'w', text: 'Mann', strong: 'H376' }
			])
		).toEqual([
			{ position: 0, text: 'sechshundert', strong: 'H8337' },
			{ position: 0, text: 'sechshundert', strong: 'H3967' },
			{ position: 1, text: 'Mann', strong: 'H376' }
		]);
	});

	it('descends into words of Jesus', () => {
		expect(
			wordsFromSegments([{ kind: 'wj', children: [{ kind: 'w', text: 'εγω', strong: 'G1473' }] }])
		).toEqual([{ position: 0, text: 'εγω', strong: 'G1473' }]);
	});
});

import { describe, expect, it } from 'vitest';
import { foldForHighlight, parseSearchQuery, shouldHighlight } from './search-query.ts';

describe('parseSearchQuery', () => {
	it('treats each word as a prefix term, as the old substring search effectively did', () => {
		expect(parseSearchQuery('liebe gott').terms).toEqual([
			{ kind: 'prefix', text: 'liebe' },
			{ kind: 'prefix', text: 'gott' }
		]);
	});

	it('reads a quoted phrase as one term', () => {
		expect(parseSearchQuery('"am Anfang"').terms).toEqual([{ kind: 'phrase', text: 'am Anfang' }]);
	});

	it('mixes phrases and words', () => {
		expect(parseSearchQuery('gnade "und Wahrheit"').terms).toEqual([
			{ kind: 'prefix', text: 'gnade' },
			{ kind: 'phrase', text: 'und Wahrheit' }
		]);
	});

	it('reads a leading minus as an exclusion', () => {
		expect(parseSearchQuery('liebe -zorn').terms).toEqual([
			{ kind: 'prefix', text: 'liebe' },
			{ kind: 'exclude', text: 'zorn' }
		]);
	});

	it('strips characters that have meaning in tsquery', () => {
		// Anything that could change the query's structure has to be gone before interpolation.
		const parsed = parseSearchQuery(`liebe & gott | !(nicht) *:'`);
		expect(parsed.terms).toEqual([
			{ kind: 'prefix', text: 'liebe' },
			{ kind: 'prefix', text: 'gott' },
			{ kind: 'prefix', text: 'nicht' },
			{ kind: 'prefix', text: "'" }
		]);
		for (const term of parsed.terms) {
			expect(term.text).not.toMatch(/[&|!():*]/);
		}
	});

	it('keeps hyphens and apostrophes, which occur inside words', () => {
		expect(parseSearchQuery('Gottes-Sohn').terms).toEqual([
			{ kind: 'prefix', text: 'Gottes-Sohn' }
		]);
	});

	it('reports an empty query', () => {
		expect(parseSearchQuery('').empty).toBe(true);
		expect(parseSearchQuery('   ').empty).toBe(true);
		expect(parseSearchQuery('&&&').empty).toBe(true);
		// Only exclusions cannot select anything.
		expect(parseSearchQuery('-zorn').empty).toBe(true);
		expect(parseSearchQuery('liebe').empty).toBe(false);
	});

	it('lists the words to highlight, without the exclusions', () => {
		expect(parseSearchQuery('liebe "des Vaters" -zorn').highlight).toEqual([
			'liebe',
			'des',
			'Vaters'
		]);
	});
});

describe('foldForHighlight', () => {
	it('folds case, umlauts and eszett like the search configuration does', () => {
		expect(foldForHighlight('Liebe')).toBe('liebe');
		expect(foldForHighlight('GRÜßE')).toBe('grusse');
		expect(foldForHighlight('Höhe')).toBe('hohe');
	});
});

describe('shouldHighlight', () => {
	it('marks the searched word and its inflections', () => {
		expect(shouldHighlight('Liebe', ['liebe'])).toBe(true);
		expect(shouldHighlight('lieben', ['liebe'])).toBe(true);
		expect(shouldHighlight('geliebt', ['geliebt'])).toBe(true);
	});

	it('marks a word found by its beginning', () => {
		expect(shouldHighlight('Gerechtigkeit', ['gerecht'])).toBe(true);
	});

	it('ignores punctuation around a word', () => {
		expect(shouldHighlight('Gott,', ['gott'])).toBe(true);
		expect(shouldHighlight('(Gott)', ['gott'])).toBe(true);
	});

	it('ignores umlaut spelling', () => {
		expect(shouldHighlight('Römer', ['romer'])).toBe(true);
	});

	it('leaves unrelated words alone', () => {
		expect(shouldHighlight('Anfang', ['liebe'])).toBe(false);
		expect(shouldHighlight('Gott', [])).toBe(false);
		expect(shouldHighlight('', ['gott'])).toBe(false);
	});

	it('requires an exact match for very short terms', () => {
		expect(shouldHighlight('in', ['in'])).toBe(true);
		expect(shouldHighlight('ich', ['in'])).toBe(false);
	});
});

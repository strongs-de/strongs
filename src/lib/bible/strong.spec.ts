import { describe, expect, it } from 'vitest';
import {
	normalizeStrongId,
	otherLanguageId,
	parseStrongId,
	strongIdFromSource,
	strongIdsFromSource,
	strongLanguage,
	strongNumber
} from './strong.ts';

describe('parseStrongId', () => {
	it('accepts both prefixes in either case, with or without padding', () => {
		expect(parseStrongId('G26')).toEqual({ language: 'greek', number: 26 });
		expect(parseStrongId('g26')).toEqual({ language: 'greek', number: 26 });
		expect(parseStrongId('H430')).toEqual({ language: 'hebrew', number: 430 });
		expect(parseStrongId('G0026')).toEqual({ language: 'greek', number: 26 });
		expect(parseStrongId(' G 26 ')).toEqual({ language: 'greek', number: 26 });
	});

	it('rejects numbers beyond the end of each dictionary', () => {
		expect(parseStrongId('G5624')).not.toBeNull();
		expect(parseStrongId('G5625')).toBeNull();
		expect(parseStrongId('H8674')).not.toBeNull();
		expect(parseStrongId('H8675')).toBeNull();
		expect(parseStrongId('G0')).toBeNull();
	});

	it('rejects anything that is not a prefixed number', () => {
		expect(parseStrongId('26')).toBeNull();
		expect(parseStrongId('Liebe')).toBeNull();
		expect(parseStrongId('GG26')).toBeNull();
		expect(parseStrongId('')).toBeNull();
	});

	it('normalises to the canonical spelling', () => {
		expect(normalizeStrongId('g0026')).toBe('G26');
		expect(normalizeStrongId('h00430')).toBe('H430');
		expect(normalizeStrongId('nope')).toBeNull();
	});
});

describe('strongIdFromSource', () => {
	it('infers the dictionary from the book for the bare numbers used by Zefania XML', () => {
		// data/bibles/GER_ELB1905_STRONG.xml writes <gr str="430"> in both testaments.
		expect(strongIdFromSource('430', 1)).toBe('H430');
		expect(strongIdFromSource('430', 40)).toBe('G430');
		expect(strongIdFromSource('7225', 1)).toBe('H7225');
	});

	it('keeps an explicit prefix regardless of the book', () => {
		expect(strongIdFromSource('G26', 1)).toBe('G26');
		expect(strongIdFromSource('H430', 66)).toBe('H430');
	});

	it('understands the OSIS lemma form', () => {
		expect(strongIdFromSource('strong:G26', 43)).toBe('G26');
		expect(strongIdFromSource('strong:H430', 1)).toBe('H430');
	});

	it('rejects a bare number that exceeds the inferred dictionary', () => {
		// 7225 is a valid Hebrew number but far beyond the Greek dictionary.
		expect(strongIdFromSource('7225', 40)).toBeNull();
	});

	it('ignores empty and malformed values', () => {
		expect(strongIdFromSource('', 1)).toBeNull();
		expect(strongIdFromSource('  ', 1)).toBeNull();
		expect(strongIdFromSource('abc', 1)).toBeNull();
	});

	it('splits multi-number attributes', () => {
		expect(strongIdsFromSource('430 853', 1)).toEqual(['H430', 'H853']);
		expect(strongIdsFromSource('G2532-G1161', 43)).toEqual(['G2532', 'G1161']);
		expect(strongIdsFromSource('430, 853;3068', 1)).toEqual(['H430', 'H853', 'H3068']);
		expect(strongIdsFromSource('nonsense', 1)).toEqual([]);
	});
});

describe('id helpers', () => {
	it('reports language and number', () => {
		expect(strongLanguage('G26')).toBe('greek');
		expect(strongLanguage('H430')).toBe('hebrew');
		expect(strongNumber('G26')).toBe(26);
	});

	it('suggests the same number in the other dictionary', () => {
		// The old error page offered exactly this fallback when a number was not found.
		expect(otherLanguageId('G26')).toBe('H26');
		expect(otherLanguageId('H430')).toBe('G430');
	});

	it('keeps the id when the other dictionary has no such number', () => {
		expect(otherLanguageId('H8600')).toBe('H8600');
	});
});

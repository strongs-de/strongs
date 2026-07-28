import { describe, expect, it } from 'vitest';
import { betaCodeToGreek, stripGreekDiacritics } from './betacode.ts';

describe('betaCodeToGreek', () => {
	// Every expectation is a word taken from data/books/*.TSP with its known Greek form.
	const cases: [beta: string, greek: string][] = [
		['*BI/BLOS', 'Βίβλος'],
		['GENE/SEWS', 'γενέσεως'],
		['*)IHSOU=', 'Ἰησοῦ'],
		['*)IHSOU=S', 'Ἰησοῦς'],
		['*XRISTOU=', 'Χριστοῦ'],
		['UI(OU=', 'υἱοῦ'],
		['*)ABRAA/M', 'Ἀβραάμ'],
		['E)GE/NNHSEN', 'ἐγέννησεν'],
		['TO\\N', 'τὸν'],
		['DE\\', 'δὲ'],
		['O(', 'ὁ'],
		['A)GA/PH', 'ἀγάπη'],
		['QEO/S', 'θεός'],
		['LO/GOS', 'λόγος'],
		['*)IAKW/B', 'Ἰακώβ'],
		['A)DELFOU\\S', 'ἀδελφοὺς'],
		['AU)TOU=', 'αὐτοῦ']
	];

	it.each(cases)('converts %s', (beta, greek) => {
		expect(betaCodeToGreek(beta)).toBe(greek);
	});

	it('chooses final sigma at the end of a word', () => {
		expect(betaCodeToGreek('LO/GOS')).toBe('λόγος');
		expect(betaCodeToGreek('LO/GOS')).toMatch(/ς$/);
		// Medial sigma stays medial.
		expect(betaCodeToGreek('KO/SMOS')).toBe('κόσμος');
	});

	it('honours the explicit sigma variants', () => {
		expect(betaCodeToGreek('S1')).toBe('σ');
		expect(betaCodeToGreek('S2')).toBe('ς');
	});

	it('handles the iota subscript', () => {
		expect(betaCodeToGreek('TW=|')).toBe('τῷ');
		expect(betaCodeToGreek('A)RXH=|')).toBe('ἀρχῇ');
	});

	it('handles a diaeresis', () => {
		expect(betaCodeToGreek('*MWU+SH=S')).toBe('Μωϋσῆς');
	});

	it('composes to NFC, so comparisons with imported text succeed', () => {
		const converted = betaCodeToGreek('A)GA/PH');
		expect(converted).toBe(converted.normalize('NFC'));
		expect(converted.length).toBe(5);
	});

	it('passes unknown characters through untouched', () => {
		expect(betaCodeToGreek('LO/GOS,')).toBe('λόγος,');
		expect(betaCodeToGreek('123')).toBe('123');
		expect(betaCodeToGreek('')).toBe('');
	});
});

describe('stripGreekDiacritics', () => {
	it('reduces an accented word to its bare letters', () => {
		// The Textus Receptus text is unaccented, so alignment compares stripped forms.
		expect(stripGreekDiacritics('ἀγάπη')).toBe('αγαπη');
		expect(stripGreekDiacritics('Ἰησοῦς')).toBe('ιησους');
		expect(stripGreekDiacritics('βιβλος')).toBe('βιβλος');
	});

	it('makes an accented and an unaccented spelling comparable', () => {
		expect(stripGreekDiacritics(betaCodeToGreek('*BI/BLOS'))).toBe(stripGreekDiacritics('βιβλος'));
	});
});

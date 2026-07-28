import { describe, expect, it } from 'vitest';
import { parseDiathekeOutput } from './sword.ts';

describe('SWORD adapter', () => {
	it('finds references after SWORD section headings and joins continuation lines', () => {
		const output = [
			'a) Erstes Tagewerk: Die Urschöpfung Genesis 1:1: Im Anfang schuf Gott.',
			'Fortsetzung derselben Anmerkung.',
			'Genesis 1:2: Die Erde war wüst.',
			'(GerMenge)'
		].join('\n');

		expect([...parseDiathekeOutput(output)]).toEqual([
			{
				book: 1,
				chapter: 1,
				verse: 1,
				content: 'Im Anfang schuf Gott. Fortsetzung derselben Anmerkung.'
			},
			{ book: 1, chapter: 1, verse: 2, content: 'Die Erde war wüst.' }
		]);
	});

	it('recognises book names that contain a number', () => {
		expect([...parseDiathekeOutput('1 Samuel 3:10: Rede, denn dein Knecht hört.')]).toEqual([
			{ book: 9, chapter: 3, verse: 10, content: 'Rede, denn dein Knecht hört.' }
		]);
	});
});

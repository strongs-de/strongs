import { describe, expect, it } from 'vitest';
import { extractTitle, parseDiathekeOutput, swordCommentaryEntries } from './sword.ts';

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

describe('extractTitle', () => {
	it('isolates a heading merged in front of the body', () => {
		expect(
			extractTitle(
				'Der erste Tag Mitten in die Dunkelheit hinein ertönt eine mächtige Stimme.',
				'Mitten in die Dunkelheit hinein ertönt eine mächtige Stimme.'
			)
		).toBe('Der erste Tag');
	});

	it('finds no heading when both readings are identical', () => {
		expect(extractTitle('Mitten in die Dunkelheit.', 'Mitten in die Dunkelheit.')).toBeUndefined();
	});

	it('gives up when the heading is not a single leading chunk', () => {
		// A book/testament introduction can bundle several unrelated headings through the body, not just
		// at the front — the "without heading" reading is then not a trailing match of the "with heading"
		// one, so there is no single heading to isolate.
		expect(
			extractTitle(
				'Einleitung Das Ziel der Kommentare. Der Autor. Copyright.',
				'Das Ziel der Kommentare. Autor.'
			)
		).toBeUndefined();
	});
});

describe('swordCommentaryEntries', () => {
	it('merges consecutive verses with identical content into one ranged entry with its heading', () => {
		const withHeadings = [
			'Genesis 1:3: Der erste Tag Mitten in die Dunkelheit.',
			'Genesis 1:4: Der erste Tag Mitten in die Dunkelheit.',
			'Genesis 1:5: Der erste Tag Mitten in die Dunkelheit.',
			'Genesis 1:6: Der zweite Tag Durch das Licht.'
		].join('\n');
		const withoutHeadings = [
			'Genesis 1:3: Mitten in die Dunkelheit.',
			'Genesis 1:4: Mitten in die Dunkelheit.',
			'Genesis 1:5: Mitten in die Dunkelheit.',
			'Genesis 1:6: Durch das Licht.'
		].join('\n');

		expect([...swordCommentaryEntries(withHeadings, withoutHeadings)]).toEqual([
			{
				book: 1,
				chapter: 1,
				verseStart: 3,
				verseEnd: 5,
				title: 'Der erste Tag',
				bodyHtml: 'Mitten in die Dunkelheit.'
			},
			{
				book: 1,
				chapter: 1,
				verseStart: 6,
				verseEnd: 6,
				title: 'Der zweite Tag',
				bodyHtml: 'Durch das Licht.'
			}
		]);
	});

	it('does not merge across a chapter boundary even when the content matches', () => {
		const withHeadings = [
			'Genesis 1:31: Schluss Und es war sehr gut.',
			'Genesis 2:1: Schluss Und es war sehr gut.'
		].join('\n');
		const withoutHeadings = [
			'Genesis 1:31: Und es war sehr gut.',
			'Genesis 2:1: Und es war sehr gut.'
		].join('\n');

		expect([...swordCommentaryEntries(withHeadings, withoutHeadings)]).toEqual([
			{
				book: 1,
				chapter: 1,
				verseStart: 31,
				verseEnd: 31,
				title: 'Schluss',
				bodyHtml: 'Und es war sehr gut.'
			},
			{
				book: 1,
				chapter: 2,
				verseStart: 1,
				verseEnd: 1,
				title: 'Schluss',
				bodyHtml: 'Und es war sehr gut.'
			}
		]);
	});

	it('keeps a single verse as its own entry when neighbouring content differs', () => {
		const withHeadings = 'Genesis 1:1: Einleitung Am Anfang schuf Gott.';
		const withoutHeadings = 'Genesis 1:1: Am Anfang schuf Gott.';

		expect([...swordCommentaryEntries(withHeadings, withoutHeadings)]).toEqual([
			{
				book: 1,
				chapter: 1,
				verseStart: 1,
				verseEnd: 1,
				title: 'Einleitung',
				bodyHtml: 'Am Anfang schuf Gott.'
			}
		]);
	});

	it('falls back to the heading-included text with no title when the two readings do not line up verse for verse', () => {
		const withHeadings = 'Genesis 1:1: Einleitung Am Anfang.';
		const withoutHeadings = 'Genesis 1:1: Am Anfang.\nGenesis 1:2: Die Erde war wüst.';

		expect([...swordCommentaryEntries(withHeadings, withoutHeadings)]).toEqual([
			{ book: 1, chapter: 1, verseStart: 1, verseEnd: 1, bodyHtml: 'Einleitung Am Anfang.' }
		]);
	});
});

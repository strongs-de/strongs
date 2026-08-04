import { describe, expect, it } from 'vitest';
import { autoLinkProse } from './auto-link.ts';

describe('autoLinkProse', () => {
	it('links a simple comma-separated reference in a sentence', () => {
		expect(autoLinkProse('Siehe Joh 3,16 für mehr.')).toBe(
			'Siehe <a class="verse-ref" href="/Joh3,16" data-book="43" data-chapter="3" data-verse="16">Joh 3,16</a> für mehr.'
		);
	});

	it('links a colon-separated reference with a verse range', () => {
		expect(autoLinkProse('Vgl. Mt 5:3-4.')).toBe(
			'Vgl. <a class="verse-ref" href="/Mt5,3-4" data-book="40" data-chapter="5" data-verse="3" data-verse-end="4">Mt 5:3-4</a>.'
		);
	});

	it('links a bare continuation reference that repeats the preceding book', () => {
		expect(autoLinkProse('Joh 3,16; 4,2 sind bekannt.')).toBe(
			'<a class="verse-ref" href="/Joh3,16" data-book="43" data-chapter="3" data-verse="16">Joh 3,16</a>; ' +
				'<a class="verse-ref" href="/Joh4,2" data-book="43" data-chapter="4" data-verse="2">4,2</a> sind bekannt.'
		);
	});

	it('does not continue the reference across an unrelated word', () => {
		expect(autoLinkProse('Joh 3,16 und 4,2 sind bekannt.')).toBe(
			'<a class="verse-ref" href="/Joh3,16" data-book="43" data-chapter="3" data-verse="16">Joh 3,16</a> und 4,2 sind bekannt.'
		);
	});

	it('leaves plain text with no reference untouched', () => {
		const text = 'Dies ist ein ganz normaler Satz ohne jede Bibelstelle.';
		expect(autoLinkProse(text)).toBe(text);
	});

	it('does not mistake the book abbreviation "Mal" for the German filler word "mal"', () => {
		const text = 'Ich war mal in der Stadt und habe nichts Besonderes erlebt.';
		expect(autoLinkProse(text)).toBe(text);
	});

	it('does not mistake the book abbreviation "Ex" for the Latin word "ex" without a verse-shaped follow-up', () => {
		const text = 'Das Modell entsteht ex nihilo, ohne Vorbedingung.';
		expect(autoLinkProse(text)).toBe(text);
	});

	it('does link "Ex" when it is genuinely followed by a chapter,verse token', () => {
		expect(autoLinkProse('Siehe Ex 3,14 zur Selbstoffenbarung Gottes.')).toBe(
			'Siehe <a class="verse-ref" href="/2Mo3,14" data-book="2" data-chapter="3" data-verse="14">Ex 3,14</a> zur Selbstoffenbarung Gottes.'
		);
	});

	it('only matches inside text nodes and leaves surrounding tags and structure intact', () => {
		expect(autoLinkProse('<p>Text mit <em>Joh 3,16</em> Verweis.</p>')).toBe(
			'<p>Text mit <em><a class="verse-ref" href="/Joh3,16" data-book="43" data-chapter="3" data-verse="16">Joh 3,16</a></em> Verweis.</p>'
		);
	});

	it('does not nest a new link inside an existing <a> element', () => {
		const html = '<p>Siehe <a href="/Joh3,16">Joh 3,16</a> für mehr.</p>';
		expect(autoLinkProse(html)).toBe(html);
	});

	it('does not nest a new link inside an existing <abbr> element', () => {
		const html = '<p>Vgl. <abbr title="Sinngemäß">Joh 3,16</abbr> weiter unten.</p>';
		expect(autoLinkProse(html)).toBe(html);
	});

	it('resumes normal scanning for text after a closed <a> element', () => {
		const html = '<a href="/Joh3,16">Joh 3,16</a> und außerdem Mt 5,3.';
		expect(autoLinkProse(html)).toBe(
			'<a href="/Joh3,16">Joh 3,16</a> und außerdem ' +
				'<a class="verse-ref" href="/Mt5,3" data-book="40" data-chapter="5" data-verse="3">Mt 5,3</a>.'
		);
	});
});

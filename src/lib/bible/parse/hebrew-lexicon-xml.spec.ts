import { describe, expect, it } from 'vitest';
import { parseHebrewLexiconXml } from './hebrew-lexicon-xml.ts';
import type { ParsedLexiconEntry, ParseEvent } from './types.ts';

async function collect(xml: string) {
	const entries: ParsedLexiconEntry[] = [];
	const warnings: string[] = [];

	for await (const event of parseHebrewLexiconXml(xml) as AsyncGenerator<ParseEvent>) {
		if (event.type === 'lexiconEntry') entries.push(event.entry);
		else if (event.type === 'warning') warnings.push(event.message);
	}

	return { entries, warnings };
}

function wrap(entries: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<lexicon xmlns="http://openscriptures.github.com/morphhb/namespace">${entries}</lexicon>`;
}

describe('parseHebrewLexiconXml', () => {
	it('parses an entry copied from HebrewStrong.xml', async () => {
		const { entries } = await collect(
			wrap(`<entry id="H100">
				<w pos="n-m" pron="ag-mone'" xlit="ʼagmôwn" xml:lang="heb">אַגְמוֹן</w>
				<source>from the same as <w src="H98">98</w>; a marshy <def>pool</def> (others from a different root, a <def>kettle</def>); by implication</source>
				<meaning>a <def>rush</def> (as growing there); collectively a <def>rope</def> of rushes</meaning>
				<usage>bulrush, caldron, hook, rush.</usage>
			</entry>`)
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toEqual({
			strong: 'H100',
			language: 'hbo',
			lemma: 'אַגְמוֹן',
			transliteration: 'ʼagmôwn',
			pronunciation: "ag-mone'",
			definitionHtml: 'a <strong>rush</strong> (as growing there); collectively a <strong>rope</strong> of rushes',
			derivationHtml:
				'from the same as <a class="strong-link" href="/H98">H98</a>; a marshy <strong>pool</strong> (others from a different root, a <strong>kettle</strong>); by implication',
			kjvDefinitionHtml: 'bulrush, caldron, hook, rush.'
		});
	});

	it('recognises the entry id as the Strong number without a language prefix on the wire', async () => {
		const { entries } = await collect(
			wrap(`<entry id="H1"><w pos="n-m" pron="awb" xlit="ʼâb" xml:lang="heb">אָב</w></entry>`)
		);
		expect(entries[0]?.strong).toBe('H1');
	});

	it('handles an entry with no <meaning>, just a cross-reference and a usage', async () => {
		// Aramaic entries that merely point back to their Hebrew counterpart, like H2 -> H1.
		const { entries } = await collect(
			wrap(`<entry id="H2">
				<w pos="n-m" pron="ab" xlit="ʼab" xml:lang="arc">אַב</w>
				<source>(Aramaic) corresponding to <w src="H1">1</w></source>
				<usage>father.</usage>
			</entry>`)
		);

		expect(entries[0]).toMatchObject({ strong: 'H2', lemma: 'אַב', kjvDefinitionHtml: 'father.' });
		expect(entries[0]?.definitionHtml).toBeUndefined();
		expect(entries[0]?.derivationHtml).toContain('href="/H1"');
	});

	it('keeps an editorial note that sits inside a field, but drops one that annotates the entry itself', async () => {
		const { entries } = await collect(
			wrap(`<entry id="H269">
				<w pos="n-f" pron="aw-khoth'" xlit="ʼâchôwth" xml:lang="heb">אָחוֹת</w>
				<note>xlit correction irrelevant to the reader</note>
				<source>irregular feminine of <w src="H251">251</w>;</source>
				<meaning>a <def>sister</def> (used very widely [like <w src="H251">251</w><note>number 250, corrected to 251</note>], literally and figuratively)</meaning>
				<usage>(an-) other, sister, together.</usage>
			</entry>`)
		);

		expect(entries[0]?.definitionHtml).toContain('number 250, corrected to 251');
		expect(entries[0]?.definitionHtml).not.toContain('xlit correction irrelevant');
	});

	it('escapes text from the source', async () => {
		const { entries } = await collect(
			wrap(`<entry id="H1">
				<w pos="n-m" pron="awb" xlit="ʼâb" xml:lang="heb">אָב</w>
				<meaning>a &lt;script&gt; &amp; more</meaning>
			</entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe('a &lt;script&gt; &amp; more');
	});

	it('warns about an entry without a headword instead of silently dropping it', async () => {
		const { entries, warnings } = await collect(wrap(`<entry id="H1"><meaning>orphaned</meaning></entry>`));

		expect(entries).toEqual([]);
		expect(warnings).toHaveLength(1);
	});
});

import { describe, expect, it } from 'vitest';
import { parseStrongsXml } from './strongs-xml.ts';
import type { ParsedLexiconEntry, ParseEvent } from './types.ts';

async function collect(xml: string) {
	const entries: ParsedLexiconEntry[] = [];
	const warnings: string[] = [];

	for await (const event of parseStrongsXml(xml) as AsyncGenerator<ParseEvent>) {
		if (event.type === 'lexiconEntry') entries.push(event.entry);
		else if (event.type === 'warning') warnings.push(event.message);
	}

	return { entries, warnings };
}

function wrap(entries: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<strongsdictionary><prologue>Dictionary</prologue><entries>${entries}</entries></strongsdictionary>`;
}

describe('parseStrongsXml', () => {
	it('parses an entry copied from data/strongsgreek.xml', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00026">
 <strongs>26</strongs>   <greek BETA="A)GA/PH" unicode="ἀγάπη" translit="agápē"/>   <pronunciation strongs="ag-ah'-pay"/>
 <strongs_derivation>from <strongsref language="GREEK" strongs="25"/>;</strongs_derivation><strongs_def> love, i.e. affection or benevolence</strongs_def><kjv_def>:--(feast of) charity, dear, love.</kjv_def>
<see language="GREEK" strongs="25"/>
</entry>`)
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toEqual({
			strong: 'G26',
			language: 'grc',
			lemma: 'ἀγάπη',
			transliteration: 'agápē',
			pronunciation: "ag-ah'-pay",
			definitionHtml: 'love, i.e. affection or benevolence',
			derivationHtml: 'from <a class="strong-link" href="/G25">G25</a>;',
			kjvDefinitionHtml: '(feast of) charity, dear, love.',
			seeAlso: ['G25']
		});
	});

	it('strips the zero padding from the entry number', async () => {
		const { entries } = await collect(
			wrap(
				`<entry strongs="00001"><strongs>1</strongs><greek BETA="*A" unicode="Α" translit="A"/></entry>`
			)
		);
		expect(entries[0]?.strong).toBe('G1');
	});

	it('resolves a cross-reference into the other dictionary', async () => {
		// data/strongsgreek.xml points at Hebrew numbers: <see language="HEBREW" strongs="0175"/>.
		const { entries } = await collect(
			wrap(`<entry strongs="00002"><strongs>2</strongs>
				<greek BETA="*)AARW/N" unicode="Ἀαρών" translit="Aarṓn"/>
				<strongs_derivation>of Hebrew origin (<strongsref language="HEBREW" strongs="0175"/>);</strongs_derivation>
				<see language="HEBREW" strongs="0175"/></entry>`)
		);

		expect(entries[0]?.seeAlso).toEqual(['H175']);
		expect(entries[0]?.derivationHtml).toContain('href="/H175"');
	});

	it('renders a Greek word quoted inside a definition', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def>the first letter, often used with <greek BETA="A)/N" unicode="ἄν" translit="án"/> before a vowel</strongs_def>
			</entry>`)
		);

		// The headword is the first inline word; later ones belong to the definition text.
		expect(entries[0]?.lemma).toBe('Α');
		expect(entries[0]?.definitionHtml).toBe(
			'the first letter, often used with <span class="original">ἄν</span> before a vowel'
		);
	});

	it('escapes text from the source', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def>a &lt;script&gt; &amp; more</strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe('a &lt;script&gt; &amp; more');
	});

	it('skips the "Not Used" gaps in Strong numbering without reporting them', async () => {
		// There are 101 of these in the Greek dictionary; they are not defects.
		const { entries, warnings } = await collect(
			wrap(`<entry strongs="003215"><strongs>3215</strongs>  Not Used</entry>
				<entry strongs="00026"><strongs>26</strongs><greek BETA="A)GA/PH" unicode="ἀγάπη" translit="agápē"/></entry>`)
		);

		expect(entries.map((entry) => entry.strong)).toEqual(['G26']);
		expect(warnings).toEqual([]);
	});

	it('warns about an entry that is broken rather than merely unused', async () => {
		const { entries, warnings } = await collect(
			wrap(
				`<entry strongs="00099"><strongs>99</strongs><strongs_def>no headword here</strongs_def></entry>`
			)
		);

		expect(entries).toEqual([]);
		expect(warnings).toHaveLength(1);
	});

	it('turns a <br/> into a literal line break, for sources with a structured definition', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def>I.) first sense<br/>II.) second sense</strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe('I.) first sense<br/>II.) second sense');
	});

	it('turns an <abbr> into a native tooltip, for sources that gloss recurring abbreviations', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def><abbr title="Septuaginta">LXX</abbr>: also used in the papyri</strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe(
			'<abbr title="Septuaginta">LXX</abbr>: also used in the papyri'
		);
	});

	it('turns a <verseref> into a link carrying the reference, for click-to-jump and hover-preview', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def>see <verseref href="/Joh3,16" book="43" chapter="3" verse="16">Joh 3:16</verseref></strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe(
			'see <a class="verse-ref" href="/Joh3,16" data-book="43" data-chapter="3" data-verse="16">Joh 3:16</a>'
		);
	});

	it('carries a verse range end when a <verseref> has one', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def><verseref href="/Joh3,16-18" book="43" chapter="3" verse="16" end="18">3:16-18</verseref></strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe(
			'<a class="verse-ref" href="/Joh3,16-18" data-book="43" data-chapter="3" data-verse="16" data-verse-end="18">3:16-18</a>'
		);
	});

	it('turns <indent> into a block-styled span, for grouping a "Wortfamilie"-style list', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def>Wortfamilie:<br/><indent>related word</indent></strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe(
			'Wortfamilie:<br/><span class="wf-entry">related word</span>'
		);
	});

	it('turns <b> and <i> into bold/italic typesetting, for sources that carry that from the original', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00001"><strongs>1</strongs>
				<greek BETA="*A" unicode="Α" translit="A"/>
				<strongs_def><b>d. Erbarmen</b>: mildert, was <i>unverschuldetes</i> Leid folgt</strongs_def></entry>`)
		);

		expect(entries[0]?.definitionHtml).toBe(
			'<b>d. Erbarmen</b>: mildert, was <i>unverschuldetes</i> Leid folgt'
		);
	});

	it('recognises a Hebrew dictionary from its inline elements', async () => {
		const { entries } = await collect(
			wrap(`<entry strongs="00430"><strongs>430</strongs>
				<hebrew unicode="אֱלֹהִים" translit="ʼĕlôhîym"/>
				<pronunciation strongs="el-o-heem'"/>
				<strongs_def>gods, God</strongs_def></entry>`)
		);

		expect(entries[0]).toMatchObject({ strong: 'H430', language: 'hbo', lemma: 'אֱלֹהִים' });
	});
});

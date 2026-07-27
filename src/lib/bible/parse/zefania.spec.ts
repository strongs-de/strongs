import { describe, expect, it } from 'vitest';
import { parseZefania } from './zefania.ts';
import { segmentsToText } from '../segments.ts';
import type { ParsedVerse, ParseEvent, ResourceMetadata } from './types.ts';

async function collect(xml: string) {
	const verses: ParsedVerse[] = [];
	const warnings: string[] = [];
	let metadata: ResourceMetadata | undefined;

	for await (const event of parseZefania(xml) as AsyncGenerator<ParseEvent>) {
		if (event.type === 'verse') verses.push(event.verse);
		else if (event.type === 'warning') warnings.push(event.message);
		else if (event.type === 'metadata') metadata = event.metadata;
	}

	return { verses, warnings, metadata };
}

function wrap(information: string, books: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<XMLBIBLE biblename="Test" type="x-bible">
  <INFORMATION>${information}</INFORMATION>
  ${books}
</XMLBIBLE>`;
}

describe('parseZefania', () => {
	it('reads metadata and maps the Zefania language code', async () => {
		const { metadata } = await collect(
			wrap(
				`<title>Elberfelder 1905</title><identifier>ELB1905STR</identifier>
				 <language>GER</language><rights>Public Domain</rights>`,
				`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS vnumber="1">Text</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(metadata).toMatchObject({
			id: 'ELB1905STR',
			name: 'Elberfelder 1905',
			language: 'de',
			licenseHtml: 'Public Domain',
			direction: 'ltr'
		});
	});

	it('derives a usable column header from a descriptive title', async () => {
		const cases: [title: string, abbrev: string][] = [
			['Schlachter Bibel 1951 with Strong', 'Schlachter 1951'],
			['Textus Receptus NT(Strongs)', 'Textus Receptus NT'],
			['Elberfelder 1905', 'Elberfelder 1905'],
			['Interlinearübersetzung', 'Interlinearübersetzung']
		];

		for (const [title, abbrev] of cases) {
			const { metadata } = await collect(
				wrap(
					`<title>${title}</title><identifier>X</identifier><language>GER</language>`,
					`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS vnumber="1">Text</VERS></CHAPTER></BIBLEBOOK>`
				)
			);
			expect(metadata?.abbrev, title).toBe(abbrev);
			expect(metadata?.name, title).toBe(title);
		}
	});

	it('discards a placeholder rights notice', async () => {
		// data/bibles/GER_ILGRDE.xml has <rights>unknown</rights>, which is not a licence.
		const { metadata } = await collect(
			wrap(
				`<title>Interlinear</title><identifier>ILGRDE</identifier><language>GER</language>
				 <rights>unknown</rights>`,
				`<BIBLEBOOK bnumber="40"><CHAPTER cnumber="1"><VERS vnumber="1">Text</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(metadata?.licenseHtml).toBeUndefined();
	});

	it('parses Genesis 1:1 from the Elberfelder source verbatim', async () => {
		// Copied from data/bibles/GER_ELB1905_STRONG.xml.
		const { verses } = await collect(
			wrap(
				`<identifier>ELB1905STR</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS vnumber="1">Im <gr str="7225">Anfang </gr><gr str="1254">schuf </gr><gr str="430">Gott </gr> die <gr str="8064">Himmel </gr><gr str="853">und </gr> die <gr str="776">Erde </gr>.</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		const verse = verses[0]!;
		expect(verse).toMatchObject({ book: 1, chapter: 1, verse: 1 });

		// Old Testament, so the bare numbers are Hebrew.
		expect(verse.segments).toEqual([
			'Im ',
			{ kind: 'w', text: 'Anfang', strong: 'H7225' },
			' ',
			{ kind: 'w', text: 'schuf', strong: 'H1254' },
			' ',
			{ kind: 'w', text: 'Gott', strong: 'H430' },
			' die ',
			{ kind: 'w', text: 'Himmel', strong: 'H8064' },
			' ',
			{ kind: 'w', text: 'und', strong: 'H853' },
			' die ',
			{ kind: 'w', text: 'Erde', strong: 'H776' },
			'.'
		]);

		// The space that Zefania keeps inside each tagged word must not end up before the full stop.
		expect(segmentsToText(verse.segments)).toBe('Im Anfang schuf Gott die Himmel und die Erde.');
	});

	it('takes Strong numbers in the New Testament from the Greek dictionary', async () => {
		const { verses } = await collect(
			wrap(
				`<identifier>ELB1905STR</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="40"><CHAPTER cnumber="1"><VERS vnumber="1"><gr str="976">Buch </gr> des <gr str="1078">Geschlechts </gr><gr str="2424">Jesu </gr><gr str="5547">Christi </gr>, des <gr str="5207">Sohnes </gr><gr str="1138">Davids </gr>.</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		const verse = verses[0]!;
		expect(verse.segments[0]).toEqual({ kind: 'w', text: 'Buch', strong: 'G976' });
		expect(segmentsToText(verse.segments)).toBe(
			'Buch des Geschlechts Jesu Christi, des Sohnes Davids.'
		);
	});

	it('keeps the morphology code where the source has one', async () => {
		// Copied from data/bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml.
		const { verses } = await collect(
			wrap(
				`<identifier>GNTTR</identifier><language>GRC</language>`,
				`<BIBLEBOOK bnumber="40" bname="Matthäus" bsname="Mt"><CHAPTER cnumber="1"><VERS vnumber="1">
					<gr str="976" rmac="n-nsf">βιβλος </gr>
					<gr str="1078" rmac="n-gsf">γενεσεως </gr>
				</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(verses[0]?.segments).toEqual([
			{ kind: 'w', text: 'βιβλος', strong: 'G976', morph: 'N-NSF' },
			' ',
			{ kind: 'w', text: 'γενεσεως', strong: 'G1078', morph: 'N-GSF' }
		]);
	});

	it('extracts study notes instead of inlining them into the verse text', async () => {
		// Luther 1912 wraps notes in <DIV><NOTE type="x-studynote">.
		const { verses } = await collect(
			wrap(
				`<identifier>LUTH1912</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="4"><VERS vnumber="1">Und Adam erkannte sein Weib Eva<DIV><NOTE type="x-studynote">Hebr. Chawwa, die Lebendige</NOTE></DIV></VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		const verse = verses[0]!;
		expect(verse.segments).toEqual([
			'Und Adam erkannte sein Weib Eva',
			{ kind: 'note', marker: '', text: 'Hebr. Chawwa, die Lebendige' }
		]);
		expect(segmentsToText(verse.segments)).toBe('Und Adam erkannte sein Weib Eva');
	});

	it('handles verses with no Strong markup at all', async () => {
		const { verses, warnings } = await collect(
			wrap(
				`<identifier>LUTH1912</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS vnumber="1">Am Anfang schuf Gott Himmel und Erde.</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(verses[0]?.segments).toEqual(['Am Anfang schuf Gott Himmel und Erde.']);
		expect(warnings).toEqual([]);
	});

	it('records a verse range when the source merges verses', async () => {
		const { verses } = await collect(
			wrap(
				`<identifier>X</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="43"><CHAPTER cnumber="3"><VERS vnumber="16" vnumber_end="17">Zusammengefasster Vers</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(verses[0]).toMatchObject({ verse: 16, verseEnd: 17 });
	});

	it('keeps every number of a word that carries several', async () => {
		// Elberfelder writes "sechshundert" as str="8337-H3967": six (H8337) times hundred (H3967).
		// There are 2,726 such words in data/bibles/GER_ELB1905_STRONG.xml.
		const { verses, warnings } = await collect(
			wrap(
				`<identifier>ELB1905STR</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="2"><CHAPTER cnumber="12"><VERS vnumber="37"><gr str="8337-H3967">sechshundert </gr>Mann</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(verses[0]?.segments[0]).toEqual({
			kind: 'w',
			text: 'sechshundert',
			strong: 'H8337',
			strongs: ['H8337', 'H3967']
		});
		expect(warnings).toEqual([]);
	});

	it('keeps a word whose Strong number is unusable, and says so', async () => {
		const { verses, warnings } = await collect(
			wrap(
				`<identifier>X</identifier><language>GER</language>`,
				// 7225 is a valid Hebrew number but out of range for the Greek dictionary.
				`<BIBLEBOOK bnumber="40"><CHAPTER cnumber="1"><VERS vnumber="1"><gr str="7225">Anfang </gr>des Buches</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(segmentsToText(verses[0]!.segments)).toBe('Anfang des Buches');
		expect(verses[0]?.segments.every((segment) => typeof segment === 'string')).toBe(true);
		expect(warnings.join(' ')).toContain('7225');
	});

	it('emits duplicated verses in source order so the later one can win', async () => {
		// data/bibles/GER_ILGRDE.xml has two <CHAPTER cnumber="2"> blocks in Galatians; the second is
		// the complete chapter, so the ingester must be able to overwrite the first.
		const { verses } = await collect(
			wrap(
				`<identifier>ILGRDE</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="48">
					<CHAPTER cnumber="2"><VERS vnumber="1">Erste Fassung</VERS></CHAPTER>
					<CHAPTER cnumber="2"><VERS vnumber="1">Zweite Fassung</VERS></CHAPTER>
				</BIBLEBOOK>`
			)
		);

		expect(verses.map((verse) => segmentsToText(verse.segments))).toEqual([
			'Erste Fassung',
			'Zweite Fassung'
		]);
	});

	it('skips a verse whose reference cannot be determined', async () => {
		const { verses, warnings } = await collect(
			wrap(
				`<identifier>X</identifier><language>GER</language>`,
				`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS>Kein vnumber</VERS></CHAPTER></BIBLEBOOK>`
			)
		);

		expect(verses).toEqual([]);
		expect(warnings).toHaveLength(1);
	});

	it('reads a stream of chunks identically to a whole string', async () => {
		const xml = wrap(
			`<identifier>X</identifier><language>GER</language>`,
			`<BIBLEBOOK bnumber="1"><CHAPTER cnumber="1"><VERS vnumber="1">Im <gr str="7225">Anfang </gr>schuf Gott.</VERS></CHAPTER></BIBLEBOOK>`
		);

		async function* chunks() {
			// Deliberately split inside tags and inside text.
			for (let index = 0; index < xml.length; index += 7) yield xml.slice(index, index + 7);
		}

		const streamed: ParsedVerse[] = [];
		for await (const event of parseZefania(chunks()) as AsyncGenerator<ParseEvent>) {
			if (event.type === 'verse') streamed.push(event.verse);
		}

		const whole = await collect(xml);
		expect(streamed).toEqual(whole.verses);
	});
});

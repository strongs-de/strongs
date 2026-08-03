/**
 * Converts Gerhard Kautz' German Greek-Strong lexicon (plain text, published at sermon-online.com) into
 * the `strongsdictionary` XML format that `data/strongsgreek.xml` already uses, so it can be imported
 * through the normal `pnpm data:import` path with no parser changes.
 *
 * Kautz' source has no Greek unicode headwords, only German transliteration, so this borrows the
 * lemma, BETA code, SBL transliteration and pronunciation from the existing public-domain
 * `data/strongsgreek.xml` by Strong's number, and carries Kautz' German text over as the definition.
 *
 * Only the dictionary body (Strong's numbers 1-5624) is converted. The trailing "Liste der Synonyme"
 * appendix reuses the same numbered-block layout for synonym groups rather than individual entries and
 * is out of scope; the two placeholder numbers 5625/5626 ("word has more than one number" / "not
 * translated") are dropped the same way the English dictionary's "Not Used" gaps are.
 *
 * Kautz' licence permits personal use and PDF redistribution, but not republishing a converted/altered
 * version — see the licence text at the top of the source file. The output of this script is for local,
 * personal use only until that is separately cleared with the copyright holder. For the same reason,
 * this script contains no text of Kautz' own: the glossary of abbreviations it can gloss as `<abbr>`
 * tooltips (see {@link loadAbbreviations}) is read from a JSON file kept outside this repository, e.g.
 * `data/private/kautz-abbreviations.json` (a plain `{ "Gräz.": "explanation", ... }` map) — without one,
 * conversion still works, just without tooltips.
 *
 *   node scripts/convert-kautz-lexicon.ts data/private/kautz-source.txt data/private/stronggreek_de_kautz.xml
 */

import { readFile, writeFile } from 'node:fs/promises';
import { attribute, readXml } from '../src/lib/bible/parse/xml.ts';
import { findBookId } from '../src/lib/bible/book-names.ts';
import { referencePath } from '../src/lib/bible/reference.ts';

const MAX_GREEK_NUMBER = 5624;
const DEFAULT_ABBREVIATIONS_PATH = 'data/private/kautz-abbreviations.json';

type Enrichment = {
	beta?: string;
	unicode: string;
	translit?: string;
	pronunciation?: string;
};

type KautzEntry = {
	number: number;
	/** Everything after the headword line: etymology, Gräz./LXX/Synonyme notes, meaning block. */
	body: string;
};

/** Reads `data/strongsgreek.xml` and indexes it by Strong's number for the fields Kautz lacks. */
async function loadEnrichment(path: string): Promise<Map<number, Enrichment>> {
	const xml = await readFile(path, 'utf8');
	const map = new Map<number, Enrichment>();

	let number: number | undefined;
	let current: Partial<Enrichment> = {};

	for await (const event of readXml(xml)) {
		if (event.type === 'open' && event.name === 'entry') {
			number = toNumber(attribute(event.attributes, 'strongs'));
			current = {};
		} else if (event.type === 'open' && event.name === 'greek' && !current.unicode) {
			current.beta = attribute(event.attributes, 'beta');
			current.unicode = attribute(event.attributes, 'unicode');
			current.translit = attribute(event.attributes, 'translit');
		} else if (event.type === 'open' && event.name === 'pronunciation') {
			current.pronunciation ??= attribute(event.attributes, 'strongs');
		} else if (event.type === 'close' && event.name === 'entry') {
			if (number !== undefined && current.unicode) map.set(number, current as Enrichment);
			number = undefined;
		}
	}

	return map;
}

/** Splits the raw text into entries at 7-digit zero-padded number lines, keeping only 1-5624. */
function splitEntries(text: string): KautzEntry[] {
	const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
	const entries: KautzEntry[] = [];

	let number: number | undefined;
	let buffer: string[] = [];

	const flush = () => {
		if (number !== undefined && number >= 1 && number <= MAX_GREEK_NUMBER) {
			const firstContent = buffer.findIndex((line) => line.trim().length > 0);
			// No headword line at all means this is one of Kautz' own gap placeholders.
			if (firstContent !== -1) {
				const body = buffer
					.slice(firstContent + 1)
					.join('\n')
					.trim();
				if (body) entries.push({ number, body });
			}
		}
		number = undefined;
		buffer = [];
	};

	for (const raw of lines) {
		const trimmed = raw.trim();
		if (trimmed.length === 7 && /^\d{7}$/.test(trimmed)) {
			flush();
			number = Number.parseInt(trimmed, 10);
			continue;
		}
		buffer.push(raw);
	}
	flush();

	return entries;
}

/** The `√ ...` etymology line, and everything else (Gräz./LXX/Synonyme + the meaning block). */
function splitHeader(body: string): { etymology: string; rest: string } {
	const lines = body.split('\n');
	let index = 0;
	while (index < lines.length && lines[index]!.trim() === '') index += 1;

	if (!lines[index]?.trim().startsWith('√')) return { etymology: '', rest: body };

	// Gräz./LXX/Synonyme notes sit right below the etymology with no blank line in between, but belong
	// in the definition, not the derivation.
	const followsAsNote = /^(Gräz\.|LXX[.:]|Synonyme siehe:|Wortfamilie:)/i;
	const etymologyLines: string[] = [];
	while (
		index < lines.length &&
		lines[index]!.trim() !== '' &&
		!followsAsNote.test(lines[index]!.trim())
	) {
		etymologyLines.push(lines[index]!);
		index += 1;
	}

	return {
		etymology: etymologyLines.join(' ').trim(),
		rest: lines.slice(index).join('\n').trim()
	};
}

function escapeXml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function strongsRefTag(language: 'GREEK' | 'HEBREW', number: number): string {
	return `<strongsref language="${language}" strongs="${number}"/>`;
}

/** Links every number in a short reference-only clause, e.g. an etymology or a "Synonyme siehe" list. */
function linkReferenceClause(text: string): string {
	let result = '';
	let lastIndex = 0;
	const pattern = /(hebr\.\s*)?0*(\d{1,4})\b/g;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text))) {
		result += escapeXml(text.slice(lastIndex, match.index));
		const language = match[1] ? 'HEBREW' : 'GREEK';
		result += strongsRefTag(language, Number.parseInt(match[2]!, 10));
		lastIndex = match.index + match[0].length;
	}
	result += escapeXml(text.slice(lastIndex));
	return result;
}

/** Matches a `chapter:verse[,verse|.verse]*[-verseEnd]?` token, e.g. "24:12" or "2:1,8,12,18" or "11:21.33". */
const VERSE_TOKEN = /^(\d{1,3}):(\d{1,3}(?:[.,]\d{1,3})*(?:-\d{1,3})?)$/;

/** Splits trailing punctuation (closing parens, sentence stops) off a word so the core can be matched. */
function stripTrailingPunctuation(word: string): { core: string; suffix: string } {
	const match = /^(.*?)([.,;:)\]]*)$/.exec(word)!;
	return { core: match[1]!, suffix: match[2]! };
}

/**
 * Wraps every verse number in a `chapter:verse[,verse…][-end]` token in its own `<verseref>` link, so
 * clicking jumps straight to that verse. The first one absorbs `bookLabel` (the book abbreviation plus
 * the space after it, or `''` for a bare continuation reference) and the chapter, so the *whole* first
 * citation — not just its trailing verse number — is one highlighted, clickable unit; the punctuation
 * between later verses in the same list stays untouched, and only their bare number becomes a link.
 */
function renderVerseToken(
	book: number,
	bookLabel: string,
	match: RegExpExecArray,
	placeholder: (tag: string) => string
): string {
	const chapter = Number.parseInt(match[1]!, 10);
	const verseList = match[2]!;
	let first = true;

	return verseList.replace(/(\d{1,3})(?:-(\d{1,3}))?/g, (whole, verse: string, end?: string) => {
		const verseNumber = Number.parseInt(verse, 10);
		const verseEnd = end ? Number.parseInt(end, 10) : undefined;
		const href = referencePath({
			book,
			chapter,
			verse: verseNumber,
			...(verseEnd ? { verseEnd } : {})
		});
		const attrs = [
			`href="${escapeXml(href)}"`,
			`book="${book}"`,
			`chapter="${chapter}"`,
			`verse="${verseNumber}"`,
			verseEnd ? `end="${verseEnd}"` : ''
		]
			.filter(Boolean)
			.join(' ');
		const label = first ? `${bookLabel}${chapter}:${whole}` : whole;
		first = false;
		return placeholder(`<verseref ${attrs}>`) + label + placeholder('</verseref>');
	});
}

/**
 * Scans free text for Bible references, e.g. "Mt 24:12 Röm 5:8" or "Offb 1:20 2:1,8,12,18 3:1,7,14"
 * (the last two chapters reuse the book named at the start of the run, as Kautz's own citation style
 * does throughout). A token only starts a reference when it matches a known book abbreviation *and* the
 * following token is verse-shaped — that double condition is what keeps ordinary prose containing a
 * word that also happens to be a book abbreviation (e.g. "Mal", "Ex") from being mistaken for one.
 */
function scanVerseReferences(text: string, placeholder: (tag: string) => string): string {
	const parts = text.match(/\S+|\s+/g) ?? [];
	let out = '';
	let currentBook: number | undefined;

	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i]!;
		if (/^\s/.test(part)) {
			out += part;
			continue;
		}

		const bookId = findBookId(part);
		const afterSpace = parts[i + 1];
		const lookaheadWord = afterSpace && /^\s/.test(afterSpace) ? parts[i + 2] : undefined;
		const lookahead = lookaheadWord ? stripTrailingPunctuation(lookaheadWord) : undefined;
		const verseMatch = bookId !== undefined && lookahead ? VERSE_TOKEN.exec(lookahead.core) : null;

		if (bookId !== undefined && verseMatch) {
			currentBook = bookId;
			const bookLabel = escapeXml(part) + afterSpace;
			out +=
				renderVerseToken(bookId, bookLabel, verseMatch, placeholder) + escapeXml(lookahead!.suffix);
			i += 2;
			continue;
		}

		const { core, suffix } = stripTrailingPunctuation(part);
		const bareMatch = VERSE_TOKEN.exec(core);
		if (bareMatch && currentBook !== undefined) {
			out += renderVerseToken(currentBook, '', bareMatch, placeholder) + escapeXml(suffix);
			continue;
		}

		currentBook = undefined;
		out += escapeXml(part);
	}

	return out;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Abbreviation glossary, e.g. `{ "Gräz.": "Gräzität; …", "Subst.Fem.": "…" }` — kept out of this
 * repository (see {@link loadAbbreviations}) because it is transcribed from Kautz' own text, unlike
 * this script. Empty until `main` loads it; every entry is optional, so an empty glossary just means
 * no `<abbr>` tooltips are added, not a broken conversion.
 */
let abbreviations: Record<string, string> = {};
/** Matches any glossary key, longest first, so e.g. "Subst.Fem." wins over the shorter "Subst.". */
let abbreviationPattern: RegExp = /(?!)/g;

function setAbbreviations(glossary: Record<string, string>): void {
	abbreviations = glossary;
	const keysByLength = Object.keys(glossary).sort((a, b) => b.length - a.length);
	abbreviationPattern =
		keysByLength.length > 0
			? new RegExp(`(?<!\\p{L})(?:${keysByLength.map(escapeRegExp).join('|')})(?!\\p{L})`, 'gu')
			: /(?!)/g; // Matches nothing: there is nothing to glossarise.
}

/** Reads the abbreviation glossary JSON, or returns an empty one if the file isn't there. */
async function loadAbbreviations(path: string): Promise<Record<string, string>> {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			console.log(`no abbreviation glossary at ${path}; entries will have no <abbr> tooltips`);
			return {};
		}
		throw error;
	}
}

/** Wraps every recurring Kautz abbreviation ("Gräz.", "Subst.Fem.", "ua." …) in a native tooltip. */
function wrapAbbreviationTokens(text: string, placeholder: (tag: string) => string): string {
	let out = '';
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	abbreviationPattern.lastIndex = 0;

	while ((match = abbreviationPattern.exec(text))) {
		out += text.slice(lastIndex, match.index);
		const title = abbreviations[match[0]]!;
		out +=
			placeholder(`<abbr title="${escapeXml(title).replaceAll('"', '&quot;')}">`) +
			match[0] +
			placeholder('</abbr>');
		lastIndex = match.index + match[0].length;
	}
	out += text.slice(lastIndex);
	return out;
}

/**
 * Renders a run of descriptive prose: Bible references become hoverable `<verseref>`s, explicit
 * "Strong Nr. N" mentions become links, recurring abbreviations get a tooltip, and everything else is
 * escaped. Each pass hands the next one a string that may already contain `\uE000<index>\uE000`
 * placeholders standing in for raw tags \u2014 `\uE000` is a Private Use Area code point, so it is pure
 * placeholder-and-digits as far as any of these patterns (all letters, or `Strong Nr. `, or book-name
 * lookups) are concerned; none of them can match through one, so the passes are safe to run in sequence
 * without stepping on each other's tags. The placeholders are swapped back for the real tags only after
 * the whole thing has been escaped, once and uniformly.
 */
function renderProse(text: string): string {
	const tags: string[] = [];
	const placeholder = (tag: string): string => {
		tags.push(tag);
		return `\uE000${tags.length - 1}\uE000`;
	};

	const withVerseRefs = scanVerseReferences(text, placeholder);

	let withStrongMentions = '';
	{
		let lastIndex = 0;
		const pattern = /Strong\s*Nr\.?\s*0*(\d{1,4})/g;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(withVerseRefs))) {
			withStrongMentions += withVerseRefs.slice(lastIndex, match.index);
			withStrongMentions += `Strong Nr. ${placeholder(strongsRefTag('GREEK', Number.parseInt(match[1]!, 10)))}`;
			lastIndex = match.index + match[0].length;
		}
		withStrongMentions += withVerseRefs.slice(lastIndex);
	}

	const withAbbreviations = wrapAbbreviationTokens(withStrongMentions, placeholder);

	return withAbbreviations.replace(
		/\uE000(\d+)\uE000/g,
		(_, index: string) => tags[Number(index)]!
	);
}

/** Escapes text and glosses any Kautz abbreviations in it, without the reference- or verse-scanning
 *  {@link renderProse} also does — for spots such as a part-of-speech clause that only ever has
 *  abbreviations in it, never a Strong's or Bible reference. */
function wrapAbbreviations(text: string): string {
	const tags: string[] = [];
	const placeholder = (tag: string): string => {
		tags.push(tag);
		return `\uE000${tags.length - 1}\uE000`;
	};
	const withAbbreviations = wrapAbbreviationTokens(escapeXml(text), placeholder);
	return withAbbreviations.replace(
		/\uE000(\d+)\uE000/g,
		(_, index: string) => tags[Number(index)]!
	);
}

/**
 * Renders the etymology line: the reference clause up to the last `;` is linkified, the part-of-speech
 * and frequency count that follows is not (its `(116)` is an occurrence count, not a Strong's number).
 * The last `;` is the right split point rather than the first: a derivation can itself contain a `;`
 * (e.g. "wahrscheinlich verwandt mit 29; Subst.Mask. (176)" has two), but the trailing POS/frequency
 * clause never does.
 */
function renderEtymology(etymology: string): string {
	if (!etymology) return '';
	const semicolon = etymology.lastIndexOf(';');
	if (semicolon === -1) return linkReferenceClause(etymology);
	return (
		linkReferenceClause(etymology.slice(0, semicolon + 1)) +
		wrapAbbreviations(etymology.slice(semicolon + 1))
	);
}

/** Lines that open a new logical unit in the meaning block, as opposed to merely wrapping the previous one. */
const SENSE_MARKER =
	/^(Gräz\.|LXX[.:]|Synonyme siehe:|Wortfamilie:|[IVXLCDM]+\.?\)|\d{1,2}[a-z]?\))/;

/**
 * Re-joins hard-wrapped continuation lines into one logical line per sense, so a `<br/>` can be placed
 * between senses without also breaking mid-sentence where the source merely wrapped at ~70 columns.
 *
 * Inside a "Wortfamilie:" block the rule is different from the rest of the entry: each related word
 * restarts its own "I.)"/"II.)" sense numbering from scratch (it is a condensed copy of *that word's*
 * own entry, not a continuation of the numbering above), so those lines must stay attached to the
 * `number transliteration` line that introduces the word rather than starting fresh top-level groups.
 * Only a new `number transliteration` line starts a new group there.
 */
function groupIntoSenses(rest: string): string[] {
	const groups: string[] = [];
	let inWortfamilieBlock = false;

	for (const raw of rest.split('\n')) {
		const trimmed = raw.trim();
		if (!trimmed) continue;

		if (/^Wortfamilie:$/i.test(trimmed)) {
			groups.push(trimmed);
			inWortfamilieBlock = true;
			continue;
		}

		if (inWortfamilieBlock) {
			const startsNewWord = /^0*\d{1,4}\s+\S/.test(trimmed);
			if (groups.length === 0 || startsNewWord) groups.push(trimmed);
			else groups[groups.length - 1] += ` ${trimmed}`;
			continue;
		}

		if (groups.length === 0 || SENSE_MARKER.test(trimmed)) groups.push(trimmed);
		else groups[groups.length - 1] += ` ${trimmed}`;
	}

	return groups;
}

/**
 * Renders a `number transliteration [√ etymology;] [I.) gloss [II.) gloss …]]` group from inside a
 * "Wortfamilie:" block. The word's own senses are kept, but rendered as light `<br/>`-separated lines
 * under its own etymology rather than as major sections, since they belong to that word, not this entry.
 */
function renderWortfamilieWord(sense: string): string {
	const head = /^0*(\d{1,4})\s+(\S+)\s*(.*)$/.exec(sense);
	if (!head) return renderProse(sense);

	const [, number, word, remainder] = head;
	const linkedNumber = strongsRefTag('GREEK', Number.parseInt(number!, 10));
	if (!remainder) return `${linkedNumber} ${escapeXml(word!)}`;

	const senseMarker = /[IVXLCDM]+\.?\)/g;
	const firstSense = senseMarker.exec(remainder!);
	const etymology = (firstSense ? remainder!.slice(0, firstSense.index) : remainder!).trim();
	const head1 = etymology
		? `${linkedNumber} ${escapeXml(word!)} ${renderEtymology(etymology)}`
		: `${linkedNumber} ${escapeXml(word!)}`;
	if (!firstSense) return head1;

	const senseText = remainder!.slice(firstSense.index);
	const starts: number[] = [];
	senseMarker.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = senseMarker.exec(senseText))) starts.push(match.index);

	const senses = starts.map((start, index) => {
		const end = index + 1 < starts.length ? starts[index + 1]! : senseText.length;
		return renderProse(senseText.slice(start, end).trim());
	});

	return [head1, ...senses].join('<br/>');
}

/**
 * Renders one already-merged sense. Beyond generic inline "Strong Nr. N" mentions, two labelled forms get
 * their number list linkified: "Synonyme siehe: …" and the inline form of "Wortfamilie: …" (a plain
 * comma-separated list of numbers, as opposed to the block form with one `number transliteration` line
 * per related word, which is delegated to {@link renderWortfamilieWord}).
 */
function renderSense(sense: string): string {
	const labelledList = /^(Synonyme siehe|Wortfamilie):\s*([\d,\s]+)$/i.exec(sense);
	if (labelledList) return `${labelledList[1]}: ${linkReferenceClause(labelledList[2]!)}`;

	if (/^Wortfamilie:$/i.test(sense)) return escapeXml(sense);
	if (/^0*\d{1,4}\s+\S/.test(sense)) return `<indent>${renderWortfamilieWord(sense)}</indent>`;

	return renderProse(sense);
}

/** Roman-numeral senses and the "Wortfamilie:" label read as new sections; everything else as one line. */
function isMajorBreak(sense: string): boolean {
	return /^([IVXLCDM]+\.?\)|Wortfamilie:)/i.test(sense);
}

function renderBody(rest: string): string {
	const senses = groupIntoSenses(rest);
	return senses
		.map((sense, index) => {
			if (index === 0) return renderSense(sense);
			return `${isMajorBreak(sense) ? '<br/><br/>' : '<br/>'}${renderSense(sense)}`;
		})
		.join('');
}

function toNumber(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value.replace(/^0+/, '') || '0', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function main() {
	const [inputPath, outputPath] = process.argv.slice(2);
	if (!inputPath || !outputPath) {
		console.error(
			'usage: node scripts/convert-kautz-lexicon.ts <kautz-source.txt> <output.xml> ' +
				'[--enrichment path] [--abbreviations path]'
		);
		process.exit(1);
	}

	const enrichmentIndex = process.argv.indexOf('--enrichment');
	const enrichmentPath =
		enrichmentIndex !== -1 ? process.argv[enrichmentIndex + 1]! : 'data/strongsgreek.xml';

	const abbreviationsIndex = process.argv.indexOf('--abbreviations');
	const abbreviationsPath =
		abbreviationsIndex !== -1 ? process.argv[abbreviationsIndex + 1]! : DEFAULT_ABBREVIATIONS_PATH;

	const enrichment = await loadEnrichment(enrichmentPath);
	console.log(`loaded ${enrichment.size} enrichment entries from ${enrichmentPath}`);

	setAbbreviations(await loadAbbreviations(abbreviationsPath));
	console.log(`loaded ${Object.keys(abbreviations).length} abbreviation glossary entries`);

	const source = await readFile(inputPath, 'utf8');
	const entries = splitEntries(source);
	console.log(`found ${entries.length} entries in the range 1-${MAX_GREEK_NUMBER}`);

	const xmlEntries: string[] = [];
	let missingEnrichment = 0;

	for (const { number, body } of entries) {
		const info = enrichment.get(number);
		if (!info) {
			missingEnrichment += 1;
			continue;
		}

		const { etymology, rest } = splitHeader(body);
		const padded = String(number).padStart(5, '0');
		const greekAttrs = [
			info.beta ? `BETA="${escapeXml(info.beta)}"` : '',
			`unicode="${escapeXml(info.unicode)}"`,
			info.translit ? `translit="${escapeXml(info.translit)}"` : ''
		]
			.filter(Boolean)
			.join(' ');

		xmlEntries.push(
			[
				`<entry strongs="${padded}">`,
				`<strongs>${number}</strongs>`,
				`<greek ${greekAttrs}/>`,
				info.pronunciation ? `<pronunciation strongs="${escapeXml(info.pronunciation)}"/>` : '',
				etymology ? `<strongs_derivation>${renderEtymology(etymology)}</strongs_derivation>` : '',
				`<strongs_def>${renderBody(rest)}</strongs_def>`,
				`</entry>`
			]
				.filter(Boolean)
				.join('\n ')
		);
	}

	if (missingEnrichment > 0) {
		console.log(
			`skipped ${missingEnrichment} entries with no matching number in ${enrichmentPath} (no Greek unicode available)`
		);
	}

	const prologue =
		'Griechisch-Deutsches Strong-Lexikon von Gerhard Kautz (Update 2026), konvertiert aus dem ' +
		'Klartext-Original fuer den privaten Import. Copyright (c) Gerhard Kautz -- Weitergabe der ' +
		'konvertierten Fassung nur mit gesonderter Genehmigung des Autors (gskautz@gmail.com).';

	const xml = [
		`<?xml version='1.0' encoding='utf-8' standalone='yes'?>`,
		`<strongsdictionary><prologue>${escapeXml(prologue)}</prologue><entries>`,
		` ${xmlEntries.join('\n ')}`,
		`</entries></strongsdictionary>`
	].join('\n');

	await writeFile(outputPath, xml, 'utf8');
	console.log(`wrote ${xmlEntries.length} entries to ${outputPath}`);
}

await main();

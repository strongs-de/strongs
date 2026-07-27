/**
 * Verse-per-line and delimited-table parser.
 *
 * The lowest common denominator, and what most "plain text bible" downloads and database dumps look
 * like. Every accepted shape is one verse per line:
 *
 *   Gen 1:1  Im Anfang schuf Gott Himmel und Erde.
 *   1.Mose 1,1|Im Anfang schuf Gott Himmel und Erde.
 *   "Joh 3:16","Denn also hat Gott die Welt geliebt …"
 *   43\t3\t16\tDenn also hat Gott die Welt geliebt …
 *
 * References are resolved through the same parser the URLs use, so every German book name and
 * abbreviation the site accepts works here too. Lines that are not verses — headers, comments, blank
 * lines — are skipped, and anything that looks like a verse but cannot be resolved is reported.
 */

import { isValidBookId } from '../books.ts';
import { parseReference } from '../reference.ts';
import type { ParseEvent, ParseStream, ResourceMetadata, SourceInput } from './types.ts';
import { readLines } from './usfm.ts';
import { splitDelimited } from './detect.ts';

export type VplOptions = {
	metadata?: Partial<ResourceMetadata>;
};

export function parseVpl(input: SourceInput, options: VplOptions = {}): ParseStream {
	return parse(input, options);
}

async function* parse(input: SourceInput, options: VplOptions): ParseStream {
	let versesSeen = 0;
	let skipped = 0;
	let metadataEmitted = false;

	const emitMetadata = (): ParseEvent => ({
		type: 'metadata',
		metadata: {
			id: (options.metadata?.id ?? 'VPL').replace(/[^\w]+/g, '').toUpperCase() || 'VPL',
			name: options.metadata?.name ?? 'Unbenannte Übersetzung',
			abbrev: options.metadata?.abbrev ?? 'VPL',
			language: options.metadata?.language ?? 'de',
			...(options.metadata?.licenseHtml ? { licenseHtml: options.metadata.licenseHtml } : {})
		}
	});

	for await (const rawLine of readLines(input)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#') || line.startsWith('//')) continue;

		const parsed = parseLine(line);
		if (!parsed) {
			skipped += 1;
			// Report the first few, then stay quiet: a file with a preamble would otherwise drown the
			// import log in warnings about its own header.
			if (skipped <= 5) {
				yield { type: 'warning', message: `skipped unrecognised line: ${truncate(line)}` };
			}
			continue;
		}

		if (!metadataEmitted) {
			yield emitMetadata();
			metadataEmitted = true;
		}

		versesSeen += 1;
		yield {
			type: 'verse',
			verse: {
				book: parsed.book,
				chapter: parsed.chapter,
				verse: parsed.verse,
				...(parsed.verseEnd !== undefined ? { verseEnd: parsed.verseEnd } : {}),
				segments: [parsed.text]
			}
		};

		if (versesSeen % 500 === 0) yield { type: 'progress', done: versesSeen };
	}

	if (skipped > 5) {
		yield { type: 'warning', message: `${skipped} lines in total could not be read as verses` };
	}
	if (!metadataEmitted) yield emitMetadata();
	yield { type: 'progress', done: versesSeen, total: versesSeen };
}

type ParsedLine = {
	book: number;
	chapter: number;
	verse: number;
	verseEnd?: number;
	text: string;
};

/**
 * Reads one line in either of two layouts: a reference and text, or numeric book/chapter/verse
 * columns followed by text.
 */
export function parseLine(line: string): ParsedLine | null {
	const fields = splitDelimited(line);

	// Numeric columns: 43 | 3 | 16 | text
	if (fields.length >= 4) {
		const book = Number.parseInt(fields[0] ?? '', 10);
		const chapter = Number.parseInt(fields[1] ?? '', 10);
		const verse = Number.parseInt(fields[2] ?? '', 10);
		const text = fields.slice(3).join(' ').trim();

		if (isValidBookId(book) && chapter > 0 && verse > 0 && text) {
			return { book, chapter, verse, text: unquote(text) };
		}
	}

	if (fields.length < 2) return null;

	const reference = parseReference(fields[0] ?? '');
	const text = unquote(fields.slice(1).join(' ').trim());
	if (!reference || reference.verse === undefined || !text) return null;

	return {
		book: reference.book,
		chapter: reference.chapter,
		verse: reference.verse,
		...(reference.verseEnd !== undefined ? { verseEnd: reference.verseEnd } : {}),
		text
	};
}

function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1).replaceAll('""', '"').trim();
	}
	return trimmed;
}

function truncate(value: string): string {
	return value.length > 60 ? `${value.slice(0, 60)}…` : value;
}

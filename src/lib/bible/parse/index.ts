/**
 * Parser registry: maps a detected format to the generator that reads it.
 */

import type { ParseStream, SourceFormat, SourceInput } from './types.ts';
import { parseOsis } from './osis.ts';
import { parseStrongsXml } from './strongs-xml.ts';
import { parseTsk } from './tsk.ts';
import { parseTsp } from './tsp.ts';
import { parseUsfm } from './usfm.ts';
import { parseUsfx, parseUsx } from './usx.ts';
import { parseVpl } from './vpl.ts';
import { parseCommentaryCsv, parseCommentaryThml } from './commentary.ts';
import { parseZefania } from './zefania.ts';

export type Parser = (input: SourceInput) => ParseStream;

const parsers: Record<SourceFormat, Parser> = {
	zefania: parseZefania,
	osis: parseOsis,
	usfm: (input) => parseUsfm(input),
	usx: (input) => parseUsx(input),
	usfx: (input) => parseUsfx(input),
	vpl: (input) => parseVpl(input),
	'strongs-xml': parseStrongsXml,
	tsp: parseTsp,
	tsk: parseTsk,
	'commentary-csv': (input) => parseCommentaryCsv(input),
	'commentary-thml': parseCommentaryThml
};

export function parserFor(format: SourceFormat): Parser {
	const parser = parsers[format];
	if (!parser) throw new Error(`no parser is registered for the format "${format}"`);
	return parser;
}

export function supportedFormats(): SourceFormat[] {
	return Object.keys(parsers) as SourceFormat[];
}

export { detectFormat } from './detect.ts';
export type { ParseEvent, ParseStream, SourceFormat, SourceInput } from './types.ts';

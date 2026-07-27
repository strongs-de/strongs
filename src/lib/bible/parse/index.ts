/**
 * Parser registry: maps a detected format to the generator that reads it.
 */

import type { ParseStream, SourceFormat, SourceInput } from './types.ts';
import { parseZefania } from './zefania.ts';

export type Parser = (input: SourceInput) => ParseStream;

const parsers: Partial<Record<SourceFormat, Parser>> = {
	zefania: parseZefania
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

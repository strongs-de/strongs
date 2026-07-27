/**
 * Streaming XML reader shared by the XML-based formats.
 *
 * Wraps `saxes` in a pull-style async iterator so parsers can be written as straight-line async
 * generators (read events, emit verses) instead of as callback state machines. Memory stays bounded
 * because chunks are fed in as they arrive and events are drained after every chunk.
 */

import { SaxesParser } from 'saxes';
import type { SourceInput } from './types.ts';
import { asChunks } from './types.ts';

export type XmlEvent =
	| { type: 'open'; name: string; attributes: Record<string, string> }
	| { type: 'text'; text: string }
	| { type: 'close'; name: string };

/**
 * Streams XML events.
 *
 * Element and attribute names are lower-cased and any namespace prefix is stripped, because the same
 * format appears with and without namespaces in the wild: OSIS files may use a default namespace, a
 * prefixed one, or none at all, and Zefania files vary in tag case between exporters.
 */
export async function* readXml(input: SourceInput): AsyncGenerator<XmlEvent, void, undefined> {
	const parser = new SaxesParser({ fragment: false });
	let queue: XmlEvent[] = [];
	let failure: Error | undefined;

	parser.on('error', (error) => {
		failure ??= error instanceof Error ? error : new Error(String(error));
	});

	parser.on('opentag', (node) => {
		const attributes: Record<string, string> = {};
		for (const [name, value] of Object.entries(node.attributes)) {
			attributes[localName(name)] = typeof value === 'string' ? value : value.value;
		}
		queue.push({ type: 'open', name: localName(node.name), attributes });
	});

	parser.on('text', (text) => {
		queue.push({ type: 'text', text });
	});

	// CDATA carries verse text in some exports; treat it exactly like text.
	parser.on('cdata', (text) => {
		queue.push({ type: 'text', text });
	});

	parser.on('closetag', (node) => {
		queue.push({ type: 'close', name: localName(node.name) });
	});

	for await (const chunk of asChunks(input)) {
		parser.write(chunk);
		if (failure) throw failure;
		if (queue.length > 0) {
			const events = queue;
			queue = [];
			yield* events;
		}
	}

	parser.close();
	if (failure) throw failure;
	if (queue.length > 0) yield* queue;
}

function localName(name: string): string {
	const colon = name.indexOf(':');
	return (colon === -1 ? name : name.slice(colon + 1)).toLowerCase();
}

/** Reads an integer attribute, returning undefined when absent or malformed. */
export function intAttribute(
	attributes: Record<string, string>,
	...names: string[]
): number | undefined {
	for (const name of names) {
		const raw = attributes[name];
		if (raw === undefined) continue;
		const value = Number.parseInt(raw.trim(), 10);
		if (Number.isFinite(value)) return value;
	}
	return undefined;
}

export function attribute(
	attributes: Record<string, string>,
	...names: string[]
): string | undefined {
	for (const name of names) {
		const value = attributes[name];
		if (value !== undefined && value.trim() !== '') return value.trim();
	}
	return undefined;
}

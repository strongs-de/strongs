/**
 * Format detection.
 *
 * Sniffs the beginning of a file rather than trusting its extension, because the useful sources in
 * this space are all called `.xml` or `.txt`. The admin UI shows the detected format and lets it be
 * overridden, so a wrong guess is recoverable.
 */

import type { SourceFormat } from './types.ts';

export type Detection = {
	format: SourceFormat;
	/** What in the file gave it away, shown in the import wizard. */
	reason: string;
};

/** How much of the file the detector needs. Enough for an XML prologue and the root element. */
export const DETECTION_PREFIX_BYTES = 64 * 1024;

export function detectFormat(prefix: string, fileName?: string): Detection | null {
	const head = prefix.slice(0, DETECTION_PREFIX_BYTES);
	const lower = head.toLowerCase();
	const name = fileName?.toLowerCase() ?? '';

	// --- XML formats, identified by their root element -----------------------
	if (lower.includes('<xmlbible') || lower.includes('zefania')) {
		return { format: 'zefania', reason: 'Zefania XML root element <XMLBIBLE>' };
	}
	if (lower.includes('<osis')) {
		return { format: 'osis', reason: 'OSIS root element <osis>' };
	}
	if (lower.includes('<usx')) {
		return { format: 'usx', reason: 'USX root element <usx>' };
	}
	if (lower.includes('<usfx')) {
		return { format: 'usfx', reason: 'USFX root element <usfx>' };
	}
	if (lower.includes('<strongsdictionary')) {
		return { format: 'strongs-xml', reason: "Strong's dictionary root element" };
	}
	if (lower.includes('<thml')) {
		return { format: 'commentary-thml', reason: 'ThML root element <ThML>' };
	}

	// --- USFM: backslash markers at the start of lines -----------------------
	if (/^\s*\\id\s+\w{3}/m.test(head) || /^\\c\s+\d+/m.test(head)) {
		return { format: 'usfm', reason: 'USFM markers (\\id, \\c, \\v)' };
	}

	// --- Robinson morphology, as in data/books/*.TSP -------------------------
	// Lines look like: MT 1:1.1 C *BI/BLOS *BI/BLOS N-NSF 976 BI/BLOS ! BI/BLOS
	if (/^[A-Z1-3]{2,6}\s+\d+:\d+\.\d+\s/m.test(head)) {
		return { format: 'tsp', reason: 'Robinson morphology line format' };
	}

	// --- Delimited text -----------------------------------------------------
	const delimited = detectDelimited(head, name);
	if (delimited) return delimited;

	return null;
}

/**
 * Distinguishes the tabular formats, which all look like "reference, then fields".
 *
 * Cross-reference sets have a target reference in the second column; verse-per-line bibles have text.
 */
function detectDelimited(head: string, fileName: string): Detection | null {
	const lines = head
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line !== '' && !line.startsWith('#'));

	if (lines.length === 0) return null;

	const sample = lines.slice(0, 20);
	const referenceLike = /^[1-3]?\s?[A-Za-zÄÖÜäöü.]+\s*\d{1,3}[:,]\d{1,3}/;

	// TSK-style: both columns are references, optionally with a vote count.
	const crossReferenceRows = sample.filter((line) => {
		const fields = splitDelimited(line);
		return (
			fields.length >= 2 &&
			referenceLike.test(fields[0] ?? '') &&
			referenceLike.test(fields[1] ?? '')
		);
	});
	if (crossReferenceRows.length >= Math.max(2, sample.length / 2)) {
		return { format: 'tsk', reason: 'two reference columns per row' };
	}

	// Verse per line: a reference followed by text.
	const verseRows = sample.filter((line) => {
		const fields = splitDelimited(line);
		return (
			fields.length >= 2 && referenceLike.test(fields[0] ?? '') && (fields[1] ?? '').length > 3
		);
	});
	if (verseRows.length >= Math.max(2, sample.length / 2)) {
		return fileName.endsWith('.csv') || fileName.endsWith('.tsv')
			? { format: 'vpl', reason: 'reference and text per row' }
			: { format: 'vpl', reason: 'one verse per line' };
	}

	return null;
}

export function splitDelimited(line: string): string[] {
	if (line.includes('\t')) return line.split('\t').map((field) => field.trim());
	// The pipe is common in bible text dumps, where the text itself contains commas and semicolons.
	if (line.includes('|')) return line.split('|').map((field) => field.trim());
	if (line.includes(';')) return line.split(';').map((field) => field.trim());
	if (line.includes(',')) return splitCsv(line);
	// Verse-per-line files separate the reference from the text with whitespace only.
	const match = /^(\S+\s*\d+[:,]\d+)\s+(.*)$/.exec(line);
	return match ? [match[1]!.trim(), match[2]!.trim()] : [line];
}

/** Minimal CSV field splitter with support for quoted fields containing commas. */
export function splitCsv(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let quoted = false;

	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];

		if (quoted) {
			if (character === '"') {
				if (line[index + 1] === '"') {
					current += '"';
					index += 1;
				} else {
					quoted = false;
				}
			} else {
				current += character;
			}
			continue;
		}

		if (character === '"') quoted = true;
		else if (character === ',') {
			fields.push(current.trim());
			current = '';
		} else current += character;
	}

	fields.push(current.trim());
	return fields;
}

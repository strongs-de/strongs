/**
 * Cross-reference parser.
 *
 * Handles the tabular cross-reference sets that circulate as CSV or TSV, of which the Treasury of
 * Scripture Knowledge is the best known. Every accepted layout is one reference pair per row:
 *
 *   Gen 1:1   Joh 1:1     23
 *   Gen 1:1   Heb 11:3
 *   "1.Mose 1,1","Johannes 1,1",23
 *
 * The optional third column is a relevance score, which decides the display order when a verse has
 * dozens of references. Target ranges (`Joh 1:1-3`) are kept as ranges rather than being expanded, so
 * the sidebar can show "Joh 1,1-3" the way the source intended.
 */

import { parseReference } from '../reference.ts';
import type { ParseEvent, ParseStream, SourceInput } from './types.ts';
import { splitDelimited } from './detect.ts';
import { readLines } from './usfm.ts';

export async function* parseTsk(input: SourceInput): ParseStream {
	let pairs = 0;
	let skipped = 0;

	yield {
		type: 'metadata',
		metadata: {
			id: 'XREFS',
			name: 'Parallelstellen',
			abbrev: 'Parallelstellen',
			language: 'de'
		}
	};

	for await (const rawLine of readLines(input)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const fields = splitDelimited(line);
		if (fields.length < 2) {
			skipped += 1;
			continue;
		}

		const from = parseReference(stripQuotes(fields[0]!));
		const to = parseReference(stripQuotes(fields[1]!));

		// A source reference must name a single verse; a target may be a range.
		if (!from?.verse || !to?.verse) {
			skipped += 1;
			if (skipped <= 5) {
				yield { type: 'warning', message: `skipped unreadable cross reference: ${truncate(line)}` };
			}
			continue;
		}

		const votes = Number.parseInt(fields[2] ?? '', 10);

		pairs += 1;
		yield {
			type: 'crossReference',
			crossReference: {
				fromBook: from.book,
				fromChapter: from.chapter,
				fromVerse: from.verse,
				toBook: to.book,
				toChapter: to.chapter,
				toVerse: to.verse,
				toVerseEnd: to.verseEnd ?? to.verse,
				votes: Number.isFinite(votes) ? votes : 0
			}
		};

		if (pairs % 2000 === 0) yield { type: 'progress', done: pairs };
	}

	if (skipped > 5) {
		yield { type: 'warning', message: `${skipped} rows in total could not be read` } as ParseEvent;
	}
	yield { type: 'progress', done: pairs, total: pairs };
}

function stripQuotes(value: string): string {
	const trimmed = value.trim();
	return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
}

function truncate(value: string): string {
	return value.length > 60 ? `${value.slice(0, 60)}…` : value;
}

/**
 * Command-line importer.
 *
 * Runs exactly the same parsers and the same ingester as the admin UI; it exists so seeding a fresh
 * database does not mean clicking through the upload wizard once per translation.
 *
 *   pnpm data:import data/bibles/GER_ELB1905_STRONG.xml
 *   pnpm data:import --id ELB1905 --name "Elberfelder 1905" data/bibles/GER_ELB1905_STRONG.xml
 *   pnpm data:import --format zefania path/to/file.xml
 */

import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { detectFormat, parserFor } from '../src/lib/bible/parse/index.ts';
import { DETECTION_PREFIX_BYTES } from '../src/lib/bible/parse/detect.ts';
import type { SourceFormat } from '../src/lib/bible/parse/types.ts';
import { createDb } from '../src/lib/server/db/client.ts';
import { refreshStrongStatisticsBlocking } from '../src/lib/server/db/statistics.ts';
import { ingestBible } from '../src/lib/server/import/ingest-bible.ts';

type Options = {
	file: string;
	format?: SourceFormat;
	id?: string;
	name?: string;
	abbrev?: string;
	language?: string;
};

function parseArguments(argv: string[]): Options {
	const options: Partial<Options> = {};

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index]!;
		if (!argument.startsWith('--')) {
			options.file = argument;
			continue;
		}

		const key = argument.slice(2);
		const value = argv[index + 1];
		if (value === undefined) throw new Error(`--${key} needs a value`);
		index += 1;

		switch (key) {
			case 'format':
				options.format = value as SourceFormat;
				break;
			case 'id':
				options.id = value;
				break;
			case 'name':
				options.name = value;
				break;
			case 'abbrev':
				options.abbrev = value;
				break;
			case 'language':
				options.language = value;
				break;
			default:
				throw new Error(`unknown option --${key}`);
		}
	}

	if (!options.file) {
		throw new Error('usage: pnpm data:import [--format f] [--id id] [--name name] <file>');
	}

	return options as Options;
}

/** Reads the first chunk of the file for format detection without loading the whole thing. */
async function readPrefix(path: string): Promise<string> {
	const handle = await open(path, 'r');
	try {
		const buffer = Buffer.alloc(DETECTION_PREFIX_BYTES);
		const { bytesRead } = await handle.read(buffer, 0, DETECTION_PREFIX_BYTES, 0);
		return buffer.subarray(0, bytesRead).toString('utf8');
	} finally {
		await handle.close();
	}
}

async function* readChunks(path: string): AsyncIterable<string> {
	// UTF-8 decoding across chunk boundaries is handled by the stream's encoding option.
	for await (const chunk of createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 })) {
		yield chunk as string;
	}
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const options = parseArguments(process.argv.slice(2));
const path = resolve(options.file);
await stat(path); // fails loudly if the file is missing

const detection = options.format
	? { format: options.format, reason: 'given on the command line' }
	: detectFormat(await readPrefix(path), basename(path));

if (!detection) {
	console.error(
		`could not recognise the format of ${options.file}. Pass --format explicitly; see docs/importing.md`
	);
	process.exit(1);
}

console.log(`format: ${detection.format} (${detection.reason})`);

const { client, db } = createDb(databaseUrl, { max: 4 });
const started = Date.now();

try {
	const stream = parserFor(detection.format)(readChunks(path));

	let lastLine = '';
	let lastBook = '';
	const result = await ingestBible(db, stream, {
		sourceFormat: detection.format,
		sourceFile: path,
		overrides: {
			...(options.id ? { id: options.id } : {}),
			...(options.name ? { name: options.name } : {}),
			...(options.abbrev ? { abbrev: options.abbrev } : {}),
			...(options.language ? { language: options.language } : {})
		},
		onProgress: ({ verses, message }) => {
			const line = `  ${verses.toLocaleString('de-DE')} verses${message ? ` — ${message}` : ''}`;
			if (line === lastLine) return;
			lastLine = line;
			// Overwrite one line on a terminal; in CI or a log file, print only when the book changes.
			if (process.stdout.isTTY) process.stdout.write(`\r${line.padEnd(60)}`);
			else if (message && message !== lastBook) {
				lastBook = message;
				console.log(line);
			}
		}
	});

	if (process.stdout.isTTY) process.stdout.write('\n');
	console.log(`refreshing Strong's statistics …`);
	await refreshStrongStatisticsBlocking(db);

	const seconds = ((Date.now() - started) / 1000).toFixed(1);
	console.log(
		`imported ${result.resourceId}: ${result.verseCount.toLocaleString('de-DE')} verses, ` +
			`${result.wordCount.toLocaleString('de-DE')} tagged words in ${seconds}s`
	);

	if (result.warnings.length > 0) {
		console.log(`\n${result.warnings.length} warning(s):`);
		for (const warning of result.warnings.slice(0, 20)) console.log(`  - ${warning}`);
		if (result.warnings.length > 20) {
			console.log(`  … and ${result.warnings.length - 20} more`);
		}
	}
} catch (error) {
	process.stdout.write('\n');
	console.error('import failed:', error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await client.end();
}

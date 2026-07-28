/**
 * Seeds a small, deterministic fixture: one translation, one Greek source, a dictionary entry and an
 * admin account.
 *
 * Used by CI and by the end-to-end tests, which need a database with known content but must not spend
 * a minute importing 37 MB of XML. Everything goes through the real importers, so the fixture exercises
 * the same code path as a production import.
 *
 *   pnpm db:seed
 */

import { eq } from 'drizzle-orm';
import { parseVpl } from '../src/lib/bible/parse/vpl.ts';
import { parseZefania } from '../src/lib/bible/parse/zefania.ts';
import { parseStrongsXml } from '../src/lib/bible/parse/strongs-xml.ts';
import { createDb } from '../src/lib/server/db/client.ts';
import { refreshStrongStatisticsBlocking } from '../src/lib/server/db/statistics.ts';
import { ingestBible } from '../src/lib/server/import/ingest-bible.ts';
import { ingestLexicon } from '../src/lib/server/import/ingest-lexicon.ts';
import { hashPassword } from '../src/lib/server/auth/password.ts';
import { resources, users } from '../src/lib/server/db/schema.ts';

const SEED_ADMIN = { email: 'admin@example.com', password: 'seed-admin-password' };

/** A German translation with Strong's numbers, in the format of the bundled files. */
const GERMAN = `<?xml version="1.0" encoding="utf-8"?>
<XMLBIBLE biblename="Testübersetzung" type="x-bible">
	<INFORMATION>
		<title>Testübersetzung</title><identifier>SEEDDE</identifier>
		<language>GER</language><rights>Public Domain</rights>
	</INFORMATION>
	<BIBLEBOOK bnumber="1">
		<CHAPTER cnumber="1">
			<VERS vnumber="1">Im <gr str="7225">Anfang </gr><gr str="1254">schuf </gr><gr str="430">Gott </gr> die <gr str="8064">Himmel </gr> und die <gr str="776">Erde </gr>.</VERS>
			<VERS vnumber="2">Und die <gr str="776">Erde </gr> war wüst und leer.</VERS>
			<VERS vnumber="3">Und <gr str="430">Gott </gr> sprach: Es werde Licht!</VERS>
		</CHAPTER>
		<!-- A second chapter, so chapter navigation has somewhere to go. -->
		<CHAPTER cnumber="2">
			<VERS vnumber="1">Und so wurden <gr str="8064">Himmel </gr> und <gr str="776">Erde </gr> vollendet.</VERS>
			<VERS vnumber="2">Und <gr str="430">Gott </gr> ruhte am siebten Tag.</VERS>
		</CHAPTER>
	</BIBLEBOOK>
	<BIBLEBOOK bnumber="43">
		<CHAPTER cnumber="3">
			<VERS vnumber="16">Denn also hat <gr str="2316">Gott </gr> die <gr str="2889">Welt </gr><gr str="25">geliebt </gr>, daß er seinen <gr str="5207">Sohn </gr> gab.</VERS>
			<VERS vnumber="17">Denn <gr str="2316">Gott </gr> hat seinen <gr str="5207">Sohn </gr> nicht gesandt, um zu richten.</VERS>
		</CHAPTER>
	</BIBLEBOOK>
</XMLBIBLE>`;

/** A second translation without Strong's numbers, so the reader has something to compare. */
const PLAIN = `Gen 1:1	Am Anfang schuf Gott Himmel und Erde.
Gen 1:2	Und die Erde war wüst und leer.
Gen 1:3	Und Gott sprach: Es werde Licht.
Gen 2:1	So wurden Himmel und Erde vollendet.
Gen 2:2	Und Gott ruhte am siebten Tag.
Joh 3:16	Denn so sehr hat Gott die Welt geliebt, dass er seinen Sohn gab.
Joh 3:17	Denn Gott hat seinen Sohn nicht in die Welt gesandt, damit er sie richte.
Joh 3:18	Wer glaubt, wird nicht gerichtet; wer nicht glaubt, ist gerichtet.`;

const LEXICON = `<?xml version="1.0" encoding="utf-8"?>
<strongsdictionary><prologue>Seed</prologue><entries>
	<entry strongs="00025"><strongs>25</strongs>
		<greek BETA="A)GAPA/W" unicode="ἀγαπάω" translit="agapáō"/>
		<pronunciation strongs="ag-ap-ah'-o"/>
		<strongs_def>to love</strongs_def><kjv_def>:--(be-)love(-ed).</kjv_def>
	</entry>
	<entry strongs="02316"><strongs>2316</strongs>
		<greek BETA="QEO/S" unicode="θεός" translit="theós"/>
		<pronunciation strongs="theh'-os"/>
		<strongs_def>a deity, the supreme Divinity</strongs_def>
	</entry>
	<entry strongs="02889"><strongs>2889</strongs>
		<greek BETA="KO/SMOS" unicode="κόσμος" translit="kósmos"/>
		<strongs_def>orderly arrangement, the world</strongs_def>
	</entry>
</entries></strongsdictionary>`;

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const { client, db } = createDb(url, { max: 2 });

try {
	await ingestBible(db, parseZefania(GERMAN), { sourceFormat: 'zefania' });

	await ingestBible(db, parseVpl(PLAIN), {
		sourceFormat: 'vpl',
		overrides: { id: 'SEEDPLAIN', name: 'Testübersetzung schlicht', abbrev: 'Schlicht' }
	});

	await ingestLexicon(db, parseStrongsXml(LEXICON), { sourceFormat: 'strongs-xml' });

	// Deterministic column order, so the end-to-end tests can rely on which column is which.
	await db.update(resources).set({ sortOrder: 10 }).where(eq(resources.id, 'SEEDDE'));
	await db.update(resources).set({ sortOrder: 20 }).where(eq(resources.id, 'SEEDPLAIN'));

	await refreshStrongStatisticsBlocking(db);

	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, SEED_ADMIN.email))
		.limit(1);

	if (!existing) {
		await db.insert(users).values({
			email: SEED_ADMIN.email,
			passwordHash: await hashPassword(SEED_ADMIN.password),
			displayName: 'Seed Admin',
			role: 'admin'
		});
	}

	console.log('seeded: SEEDDE, SEEDPLAIN, STRONGS_GREEK and the admin account');
} catch (error) {
	console.error('seeding failed:', error);
	process.exitCode = 1;
} finally {
	await client.end();
}

export { SEED_ADMIN };

import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { listJobs } from '$lib/server/import/jobs';

/**
 * Admin overview: what is installed, how big it is, and what the last imports did.
 *
 * The size figures come from PostgreSQL's own accounting rather than from counting rows, so they
 * include indexes — which is what actually fills a disk.
 */
export async function load() {
	const db = getDb();

	const [resources, sizes, jobs] = await Promise.all([
		db.execute<{
			kind: string;
			count: number;
			verse_count: number;
			word_count: number;
		}>(sql`
			select kind, count(*)::int as count,
			       coalesce(sum(verse_count), 0)::int as verse_count,
			       coalesce(sum(word_count), 0)::int as word_count
			from resources
			group by kind
			order by kind
		`),
		// Both pg_class and pg_stat_user_tables have a relname, so every column is qualified.
		db.execute<{ table_name: string; bytes: number; row_estimate: number }>(sql`
			select c.relname as table_name,
			       pg_total_relation_size(c.oid)::bigint as bytes,
			       coalesce(s.n_live_tup, 0)::bigint as row_estimate
			from pg_class c
			join pg_namespace n on n.oid = c.relnamespace
			left join pg_stat_user_tables s on s.relid = c.oid
			where n.nspname = 'public' and c.relkind in ('r', 'm')
			order by pg_total_relation_size(c.oid) desc
			limit 12
		`),
		listJobs(db, 10)
	]);

	const [total] = await db.execute<{ size: string }>(sql`
		select pg_size_pretty(pg_database_size(current_database())) as size
	`);

	return {
		resources: resources.map((row) => ({
			kind: row.kind,
			count: Number(row.count),
			verseCount: Number(row.verse_count),
			wordCount: Number(row.word_count)
		})),
		tables: sizes.map((row) => ({
			name: row.table_name,
			bytes: Number(row.bytes),
			rows: Number(row.row_estimate)
		})),
		databaseSize: total?.size ?? 'unbekannt',
		jobs
	};
}

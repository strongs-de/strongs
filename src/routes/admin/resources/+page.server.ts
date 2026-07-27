import { fail } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { resources } from '$lib/server/db/schema';
import { invalidateResourceCache } from '$lib/server/repositories/resources';
import { deleteResource } from '$lib/server/import';
import { refreshStrongStatistics } from '$lib/server/db/statistics';

/**
 * Resource management: name, column title, order, visibility and licence text.
 *
 * These are the values the old version hardcoded in `BIBLES_IN_VIEW` and `BIBLE_HINTS_IN_VIEW`, which
 * meant adding a translation or correcting a rights notice required a code change and a deployment.
 */
export async function load() {
	const db = getDb();

	const rows = await db
		.select()
		.from(resources)
		.orderBy(asc(resources.kind), asc(resources.sortOrder), asc(resources.name));

	return { resources: rows };
}

export const actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'missing id' });

		const sortOrder = Number(form.get('sortOrder'));

		await getDb()
			.update(resources)
			.set({
				name: String(form.get('name') ?? '').trim() || id,
				abbrev: String(form.get('abbrev') ?? '').trim() || id,
				sortOrder: Number.isFinite(sortOrder) && sortOrder >= 0 ? sortOrder : 100,
				isPublic: form.get('isPublic') === 'on',
				licenseHtml: String(form.get('licenseHtml') ?? '').trim() || null,
				updatedAt: new Date()
			})
			.where(eq(resources.id, id));

		invalidateResourceCache();
		return { saved: id };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		// Deleting a resource discards a lot of work, so the name has to be typed to confirm it.
		if (!id || String(form.get('confirm') ?? '') !== id) {
			return fail(400, { error: 'confirm' });
		}

		const db = getDb();
		await deleteResource(db, id);
		invalidateResourceCache();
		// Verse and word counts changed, so the statistics views have to be rebuilt.
		await refreshStrongStatistics(db);

		return { deleted: id };
	},

	/** Rebuilds the derived views by hand, for when something looks stale. */
	refresh: async () => {
		const db = getDb();
		await refreshStrongStatistics(db);
		await db.execute(sql`analyze`);
		return { refreshed: true };
	}
};

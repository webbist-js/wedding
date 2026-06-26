import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { timelineItems, timelinePhases } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

// Two modes:
//   { kind: 'items', ids: [...] }  — flat list of all item ids in new order
//   { kind: 'phases', ids: [...] } — flat list of all phase ids in new order
// The caller computes the new flat order locally (we render grouped by phase
// but the sort column is global per table, so we rewrite all sorts).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { kind, ids } = await request.json();
	if (!Array.isArray(ids)) throw error(400, 'ids required');
	await recordAudit(locals, { action: 'update', entity: 'timeline', summary: 'Reordered the timeline' });
	if (kind === 'items') {
		for (let i = 0; i < ids.length; i++) {
			await db
				.update(timelineItems)
				.set({ sort: i })
				.where(eq(timelineItems.id, Number(ids[i])));
		}
		return json({ ok: true });
	}
	if (kind === 'phases') {
		for (let i = 0; i < ids.length; i++) {
			await db
				.update(timelinePhases)
				.set({ sort: i })
				.where(eq(timelinePhases.id, Number(ids[i])));
		}
		return json({ ok: true });
	}
	throw error(400, 'bad kind');
};

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { budgetLines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

// Accept a flat array of all budget line ids in their new order and rewrite
// the sort column. The page groups them by section so the caller computes
// the new order with the local section drag, then sends the resulting flat
// list — that way sections don't collide on shared sort values.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { ids } = await request.json();
	if (!Array.isArray(ids)) throw error(400, 'ids required');
	for (let i = 0; i < ids.length; i++) {
		await db
			.update(budgetLines)
			.set({ sort: i })
			.where(eq(budgetLines.id, Number(ids[i])));
	}
	await recordAudit(locals, { action: 'update', entity: 'budget_line', summary: 'Reordered the budget' });
	return json({ ok: true });
};

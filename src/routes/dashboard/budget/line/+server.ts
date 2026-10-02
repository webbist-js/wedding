import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { budgetLines, vendors } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

// Field-level autosave for a budget line. `paid` is derived from payments and
// supplier links live on the supplier (vendors.budgetLineId), so neither is
// editable here.
const NUMERIC = new Set(['budgeted', 'confirmed']);
const TEXT = new Set(['category', 'status', 'section']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, field, value } = await request.json();
	if (field !== 'locked' && !NUMERIC.has(field) && !TEXT.has(field)) throw error(400, 'bad field');

	const [row] = await db
		.select()
		.from(budgetLines)
		.where(eq(budgetLines.id, Number(id)));
	if (!row) throw error(404);

	if (field === 'locked') {
		await db.update(budgetLines).set({ locked: !!value }).where(eq(budgetLines.id, row.id));
		await recordAudit(locals, {
			action: 'update',
			entity: 'budget_line',
			entityId: row.id,
			summary: `${row.category}: ${value ? 'locked' : 'unlocked'}`
		});
		return json({ ok: true });
	}

	// Locked = set & confirmed. The UI disables the controls; this is the backstop.
	if (row.locked) throw error(423, 'locked');

	// Derived lines (venue-synced or with suppliers) only accept the earmark +
	// housekeeping fields.
	if (field === 'confirmed' || field === 'status') {
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(vendors)
			.where(eq(vendors.budgetLineId, row.id));
		if (row.sourceType != null || n > 0) throw error(400, 'derived line');
	}

	const set: Record<string, number | string> = {};
	set[field] = NUMERIC.has(field) ? Number(value) || 0 : String(value);
	await db.update(budgetLines).set(set).where(eq(budgetLines.id, row.id));
	await recordAudit(locals, {
		action: 'update',
		entity: 'budget_line',
		entityId: row.id,
		summary: `${row.category}: ${field}`
	});
	return json({ ok: true });
};

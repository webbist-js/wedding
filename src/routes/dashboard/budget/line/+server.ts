import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { budgetLines, vendors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';
import { linkedConfirmed } from '$lib/money';

// `paid` is gone — payments are individual rows (see budget/payments).
const NUMERIC = new Set(['budgeted', 'confirmed']);
const TEXT = new Set(['category', 'status', 'section']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, field, value } = await request.json();
	if (field !== 'vendorId' && !NUMERIC.has(field) && !TEXT.has(field)) throw error(400, 'bad field');

	const [row] = await db
		.select()
		.from(budgetLines)
		.where(eq(budgetLines.id, Number(id)));
	if (!row) throw error(404);

	// Link / unlink a vendor. Unlinking freezes the derived confirmed figure
	// into the manual column so nothing visibly changes at the moment of unlink.
	if (field === 'vendorId') {
		if (value == null || value === '') {
			let frozen = row.confirmed;
			if (row.vendorId != null) {
				const [v] = await db.select().from(vendors).where(eq(vendors.id, row.vendorId));
				if (v) frozen = linkedConfirmed(v);
			}
			await db
				.update(budgetLines)
				.set({ vendorId: null, confirmed: frozen })
				.where(eq(budgetLines.id, row.id));
		} else {
			const [v] = await db.select().from(vendors).where(eq(vendors.id, Number(value)));
			if (!v) throw error(400, 'no such vendor');
			await db.update(budgetLines).set({ vendorId: v.id }).where(eq(budgetLines.id, row.id));
		}
		await recordAudit(locals, {
			action: 'update',
			entity: 'budget_line',
			entityId: row.id,
			summary: `${row.category}: vendor link`
		});
		return json({ ok: true });
	}

	// Derived lines only accept the earmark + housekeeping fields.
	if ((row.vendorId != null || row.sourceType != null) && (field === 'confirmed' || field === 'status')) {
		throw error(400, 'derived line');
	}

	const set: Record<string, number | string> = {};
	set[field] = NUMERIC.has(field) ? Number(value) || 0 : String(value);
	await db
		.update(budgetLines)
		.set(set)
		.where(eq(budgetLines.id, Number(id)));
	await recordAudit(locals, { action: 'update', entity: 'budget_line', entityId: Number(id), summary: `${row.category}: ${field}` });
	return json({ ok: true });
};

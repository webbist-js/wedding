import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { payments } from '$lib/server/db/schema';
import { recordAudit } from '$lib/server/audit';

// Add/remove individual payments. A payment attaches to a vendor (from a
// vendor-linked budget row or the Vendors page) or directly to a budget line.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const body = await request.json();

	if (body.op === 'remove') {
		const [p] = await db.select().from(payments).where(eq(payments.id, Number(body.id)));
		if (!p) throw error(404);
		await db.delete(payments).where(eq(payments.id, p.id));
		await recordAudit(locals, {
			action: 'delete',
			entity: 'payment',
			entityId: p.id,
			summary: `Removed a £${p.amount} payment`
		});
		return json({ ok: true });
	}

	if (body.op === 'add') {
		const amount = Number(body.amount);
		if (!amount || amount <= 0) throw error(400, 'bad amount');
		const vendorId = body.vendorId != null ? Number(body.vendorId) : null;
		const budgetLineId = body.budgetLineId != null ? Number(body.budgetLineId) : null;
		if (vendorId == null && budgetLineId == null) throw error(400, 'unattached payment');
		const [row] = await db
			.insert(payments)
			.values({
				amount,
				paidOn: typeof body.paidOn === 'string' && body.paidOn ? body.paidOn : null,
				note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
				vendorId,
				// Vendor payments carry no line id — the rollup joins them via the
				// link, and this is what prevents double-counting.
				budgetLineId: vendorId != null ? null : budgetLineId,
				createdAt: new Date()
			})
			.returning({ id: payments.id });
		await recordAudit(locals, {
			action: 'create',
			entity: 'payment',
			entityId: row.id,
			summary: `Recorded a £${amount} payment`
		});
		return json({ id: row.id });
	}
	throw error(400, 'bad op');
};

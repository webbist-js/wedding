import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { vendors, payments, budgetLines, appointments } from '$lib/server/db/schema';
import { and, eq, ne, sql } from 'drizzle-orm';
import { linkedConfirmed } from '$lib/money';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';
import { recordAudit } from '$lib/server/audit';

const TEXT = new Set(['category', 'name', 'contact', 'phone', 'email', 'website', 'address', 'stage', 'followUpDate']);
const NUM = new Set(['quotedAmount', 'depositAmount', 'priority']);
const BOOL = new Set(['depositPaid', 'locked']);

// Supplier mutations, shared by the Suppliers page and the Budget expander:
//   { op: 'add', budgetLineId? }      → new supplier (filed under a line if given)
//   { op: 'remove', id }              → delete, money-safe (see below)
//   { id, field, value }              → field-level autosave
// Fires the Slack "chosen supplier" ping once when deposit_paid flips on.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = await request.json();

	if (body.op === 'add') {
		const lineId = body.budgetLineId != null && body.budgetLineId !== '' ? Number(body.budgetLineId) : null;
		let category = 'New';
		if (lineId != null) {
			const [line] = await db.select().from(budgetLines).where(eq(budgetLines.id, lineId));
			if (!line) throw error(400, 'no such budget line');
			if (line.locked) throw error(423, 'locked');
			category = line.category;
		}
		const [row] = await db
			.insert(vendors)
			.values({ category, stage: 'Lead', budgetLineId: lineId, sort: 999 })
			.returning({ id: vendors.id });
		await recordAudit(locals, {
			action: 'create',
			entity: 'vendor',
			entityId: row.id,
			summary: lineId != null ? `Added a supplier under ${category}` : 'Added a supplier'
		});
		return json({ id: row.id });
	}

	if (body.op === 'remove') {
		const [vRow] = await db.select().from(vendors).where(eq(vendors.id, Number(body.id)));
		if (!vRow) throw error(404);
		if (vRow.locked) throw error(423, 'locked');
		// Detach calendar appointments so they survive the delete.
		await db.update(appointments).set({ vendorId: null }).where(eq(appointments.vendorId, vRow.id));
		// Money safety: if this was the only supplier on its line, freeze the
		// derived confirmed figure into the line's manual column so nothing
		// visibly changes; then re-attach the supplier's payments to the line.
		if (vRow.budgetLineId != null) {
			const [{ others }] = await db
				.select({ others: sql<number>`count(*)` })
				.from(vendors)
				.where(and(eq(vendors.budgetLineId, vRow.budgetLineId), ne(vendors.id, vRow.id)));
			if (others === 0) {
				await db
					.update(budgetLines)
					.set({ confirmed: linkedConfirmed(vRow), status: vRow.depositPaid ? 'Deposit' : 'Estimate' })
					.where(eq(budgetLines.id, vRow.budgetLineId));
			}
		}
		await db
			.update(payments)
			.set({ vendorId: null, budgetLineId: vRow.budgetLineId })
			.where(eq(payments.vendorId, vRow.id));
		await db.delete(vendors).where(eq(vendors.id, vRow.id));
		await recordAudit(locals, { action: 'delete', entity: 'vendor', entityId: vRow.id, summary: `Removed ${vRow.category}` });
		return json({ ok: true });
	}

	const { id, field, value } = body;
	if (field !== 'budgetLineId' && !TEXT.has(field) && !NUM.has(field) && !BOOL.has(field)) {
		throw error(400, 'bad field');
	}

	const [prev] = await db.select().from(vendors).where(eq(vendors.id, Number(id)));
	if (!prev) throw error(404);

	// Locked = booking details are final. Only the lock itself may change.
	if (prev.locked && field !== 'locked') throw error(423, 'locked');

	let set: Record<string, unknown>;
	if (field === 'budgetLineId') {
		if (value == null || value === '') set = { budgetLineId: null };
		else {
			const [line] = await db.select().from(budgetLines).where(eq(budgetLines.id, Number(value)));
			if (!line) throw error(400, 'no such budget line');
			set = { budgetLineId: line.id };
		}
	} else if (BOOL.has(field)) set = { [field]: !!value };
	else if (NUM.has(field)) set = { [field]: value === '' || value == null ? null : Number(value) };
	else if (field === 'category') set = { category: String(value ?? '') || 'New' };
	else if (field === 'stage') set = { stage: String(value ?? '') || 'Lead' };
	else set = { [field]: String(value ?? '') || null };

	// A paid deposit means we've chosen them — the pipeline stage follows.
	if (field === 'depositPaid' && !!value) set.stage = 'Booked';

	await db.update(vendors).set(set).where(eq(vendors.id, Number(id)));

	await recordAudit(locals, {
		action: 'update',
		entity: 'vendor',
		entityId: Number(id),
		summary: `${prev.category}${prev.name ? ' · ' + prev.name : ''}: ${field}`
	});

	if (field === 'depositPaid' && !!value && !prev.depositPaid) {
		// First deposit event: record the money as a payment (once, evented — not
		// a sync; deleting/adjusting the payment later is fine).
		const existing = await db.select().from(payments).where(eq(payments.vendorId, Number(id)));
		if (existing.length === 0 && prev.depositAmount) {
			await db.insert(payments).values({
				amount: prev.depositAmount,
				note: 'Deposit',
				vendorId: Number(id),
				createdAt: new Date()
			});
		}
		const base = env.PUBLIC_BASE_URL ?? '';
		await notifySupplierBooked({
			category: prev.category,
			name: prev.name || null,
			contact: prev.contact || null,
			dashboardUrl: base ? `${base}/dashboard/suppliers` : undefined
		});
	}
	return json({ ok: true });
};

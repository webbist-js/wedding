import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import {
	budgetLines,
	settings,
	vendors,
	payments,
	appointments,
	notes
} from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { BUDGET_SECTIONS } from '$lib/server/db/data';
import { effectiveBudget } from '$lib/server/budget';
import { budgetAttention } from '$lib/attention';
import { recordAudit } from '$lib/server/audit';

export const load: PageServerLoad = async () => {
	// All money figures come from the shared rollup — the budget page never
	// computes its own totals (see lib/server/budget.ts).
	const { lines, totals, target, basis, shoppingCount, unassigned } = await effectiveBudget();
	const [suppliers, appts, supplierNotes, allPayments] = await Promise.all([
		db.select().from(vendors).orderBy(asc(vendors.sort), asc(vendors.id)),
		db
			.select({
				id: appointments.id,
				title: appointments.title,
				date: appointments.date,
				time: appointments.time,
				vendorId: appointments.vendorId
			})
			.from(appointments)
			.orderBy(asc(appointments.date), asc(appointments.time)),
		db
			.select()
			.from(notes)
			.where(eq(notes.entityType, 'vendor'))
			.orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id)),
		db.select().from(payments).orderBy(asc(payments.id))
	]);
	const lineOptions = lines
		.filter((l) => l.id > 0)
		.map((l) => ({ id: l.id, category: l.category, section: l.section }));
	const attention = budgetAttention(
		lines.filter((l) => l.id > 0),
		unassigned
	);
	return {
		sections: BUDGET_SECTIONS,
		lines,
		totals,
		target,
		basis,
		shoppingCount,
		suppliers,
		appointments: appts,
		notes: supplierNotes,
		payments: allPayments,
		lineOptions,
		attention
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const f = await request.formData();
		const section = String(f.get('section') ?? 'Everything else');
		const category = String(f.get('category') ?? '').trim() || 'New line';
		const existing = await db.select().from(budgetLines);
		const maxSort = existing.reduce((m, l) => Math.max(m, l.sort), 0);
		const [row] = await db
			.insert(budgetLines)
			.values({ category, section, budgeted: 0, confirmed: 0, status: 'Estimate', sort: maxSort + 1 })
			.returning({ id: budgetLines.id });
		await recordAudit(locals, { action: 'create', entity: 'budget_line', entityId: row.id, summary: category });
	},
	remove: async ({ request, locals }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		const [line] = await db.select().from(budgetLines).where(eq(budgetLines.id, id));
		if (!line) return fail(404);
		if (line.locked) return fail(423, { locked: true });
		// Suppliers are never deleted with a line — they become unassigned and
		// surface in the attention strip. The line's own payments go with it;
		// supplier payments carry no line id and survive on the supplier.
		await db.update(vendors).set({ budgetLineId: null }).where(eq(vendors.budgetLineId, id));
		await db.delete(payments).where(eq(payments.budgetLineId, id));
		await db.delete(budgetLines).where(eq(budgetLines.id, id));
		await recordAudit(locals, { action: 'delete', entity: 'budget_line', entityId: id, summary: `Removed ${line.category}` });
	},
	setTarget: async ({ request }) => {
		const f = await request.formData();
		// Strip thousands separators (commas, spaces) the input renders for display
		const raw = String(f.get('target') ?? '').replace(/[^\d.]/g, '');
		const num = Number(raw) || 0;
		await db
			.update(settings)
			.set({ value: String(num) })
			.where(eq(settings.key, 'target'));
	}
};

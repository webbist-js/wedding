import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { budgetLines, settings, vendors, payments } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { BUDGET_SECTIONS } from '$lib/server/db/data';
import { effectiveBudget } from '$lib/server/budget';

export const load: PageServerLoad = async () => {
	// All money figures come from the shared rollup — the budget page never
	// computes its own totals (see lib/server/budget.ts).
	const { lines, totals, target, basis, shoppingCount } = await effectiveBudget();
	const vendorOptions = (await db.select().from(vendors).orderBy(asc(vendors.sort))).map((v) => ({
		id: v.id,
		label: v.name ? `${v.category} — ${v.name}` : v.category
	}));
	return { sections: BUDGET_SECTIONS, lines, totals, target, basis, vendorOptions, shoppingCount };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const f = await request.formData();
		const section = String(f.get('section') ?? 'Everything else');
		const category = String(f.get('category') ?? '').trim() || 'New line';
		const existing = await db.select().from(budgetLines);
		const maxSort = existing.reduce((m, l) => Math.max(m, l.sort), 0);
		await db.insert(budgetLines).values({
			category,
			section,
			budgeted: 0,
			confirmed: 0,
			status: 'Estimate',
			sort: maxSort + 1
		});
	},
	remove: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		// A line's directly-attached payments go with it (vendor payments carry
		// no line id and survive on the vendor).
		await db.delete(payments).where(eq(payments.budgetLineId, id));
		await db.delete(budgetLines).where(eq(budgetLines.id, id));
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

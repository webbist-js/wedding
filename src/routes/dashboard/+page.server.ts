import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';
import { db } from '$lib/server/db/index';
import {
	appointments,
	vendors,
	budgetLines,
	shoppingItems,
	settings,
	timelinePhases,
	timelineItems
} from '$lib/server/db/schema';
import { asc, eq, gte } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const guests = await allGuests();
	const summary = summarise(guests as unknown as GuestRow[]);

	const setRows = await db.select().from(settings);
	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const target = Number(s.target ?? 30000);

	// Budget at a glance: roll up all budget lines + the shopping list (mirrors
	// what the Budget tab shows). Money on the overview is budget-driven, not just
	// the venue quote.
	const blines = await db.select().from(budgetLines);
	const shopping = await db.select().from(shoppingItems);
	const shopTotal = shopping.reduce((a, i) => a + i.cost * i.qty, 0);
	const shopPaid = shopping.filter((i) => i.bought).reduce((a, i) => a + i.cost * i.qty, 0);
	const earmarked = blines.reduce((a, l) => a + l.budgeted, 0) + shopTotal;
	const confirmed = blines.reduce((a, l) => a + l.confirmed, 0) + shopTotal;
	const paid = blines.reduce((a, l) => a + l.paid, 0) + shopPaid;
	const budget = { target, earmarked, confirmed, paid, remaining: target - confirmed };

	// Timeline progress + next steps.
	const phases = await db.select().from(timelinePhases).orderBy(asc(timelinePhases.sort));
	const items = await db.select().from(timelineItems).orderBy(asc(timelineItems.sort));
	const phaseTitle = new Map(phases.map((p) => [p.id, p.title]));
	const phaseSort = new Map(phases.map((p) => [p.id, p.sort]));
	const tasksTotal = items.length;
	const tasksDone = items.filter((i) => i.done).length;
	const undone = items
		.filter((i) => !i.done)
		.sort(
			(a, b) =>
				(phaseSort.get(a.phaseId) ?? 0) - (phaseSort.get(b.phaseId) ?? 0) || a.sort - b.sort
		)
		.map((i) => ({ label: i.label, phase: phaseTitle.get(i.phaseId) ?? '' }));

	// Vendors confirmed as chosen suppliers (deposit paid) so far.
	const allVendors = await db.select().from(vendors).orderBy(asc(vendors.sort));
	const booked = allVendors
		.filter((x) => x.depositPaid)
		.map((x) => ({ category: x.category, name: x.name }));

	const today = new Date().toISOString().slice(0, 10);
	const upcoming = await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			supplierName: vendors.name,
			supplierCategory: vendors.category
		})
		.from(appointments)
		.leftJoin(vendors, eq(appointments.vendorId, vendors.id))
		.where(gte(appointments.date, today))
		.orderBy(asc(appointments.date), asc(appointments.time))
		.limit(4);

	return {
		summary,
		weddingISO: '2027-04-02T14:30:00',
		budget,
		progress: { done: tasksDone, total: tasksTotal, next: undone.slice(0, 3) },
		priority: undone.slice(0, 6),
		booked,
		upcoming
	};
};

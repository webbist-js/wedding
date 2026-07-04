import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';
import { db } from '$lib/server/db/index';
import { appointments, vendors, timelinePhases, timelineItems } from '$lib/server/db/schema';
import { effectiveBudget } from '$lib/server/budget';
import { asc, eq, gte } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const guests = await allGuests();
	const summary = summarise(guests as unknown as GuestRow[]);

	// Budget at a glance: the shared rollup guarantees the overview always
	// matches the Budget tab (vendor links, venue quote, shopping, payments).
	const { totals, target } = await effectiveBudget();
	const budget = {
		target,
		earmarked: totals.budgeted,
		confirmed: totals.confirmed,
		paid: totals.paid,
		remaining: target - totals.confirmed
	};

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

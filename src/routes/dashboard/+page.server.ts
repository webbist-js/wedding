import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';
import { db } from '$lib/server/db/index';
import {
	appointments,
	suppliers,
	quoteLines,
	settings,
	timelinePhases,
	timelineItems
} from '$lib/server/db/schema';
import { asc, eq, gte } from 'drizzle-orm';
import { computeQuote, lineQty } from '$lib/quote';

// The venue's original headline quote (80 covers), used for the "vs quote" delta.
const ORIGINAL_QUOTE = 17319.4;

export const load: PageServerLoad = async () => {
	const guests = await allGuests();
	const summary = summarise(guests as unknown as GuestRow[]);

	const setRows = await db.select().from(settings);
	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const inputs = {
		day: Number(s.dayGuests ?? 61),
		eve: Number(s.eveGuests ?? 90),
		min: Number(s.minSpend ?? 16455)
	};

	// Venue quote breakdown: food & drink (per-guest consumables) vs hire & extras
	// (fixed) + min-spend top-up. Segments sum to the grand total.
	const quote = await db.select().from(quoteLines);
	const calc = quote.map((q) => ({ scope: q.scope, price: q.price, qty: q.qty, bond: q.bond }));
	const result = computeQuote(calc, inputs);
	let foodDrink = 0;
	let fixedNonBond = 0;
	for (const q of calc) {
		if (q.bond) continue;
		const total = lineQty(q, inputs) * q.price;
		if (q.scope === 'fixed') fixedNonBond += total;
		else foodDrink += total;
	}
	const venue = {
		grand: result.grand,
		foodDrink,
		topup: result.topup,
		hireExtras: fixedNonBond + result.bond,
		vsQuote: result.grand - ORIGINAL_QUOTE
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

	// Suppliers booked so far.
	const allSuppliers = await db.select().from(suppliers).orderBy(asc(suppliers.sort));
	const booked = allSuppliers
		.filter((x) => x.status === 'booked')
		.map((x) => ({ category: x.category, name: x.name }));

	const today = new Date().toISOString().slice(0, 10);
	const upcoming = await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			supplierName: suppliers.name,
			supplierCategory: suppliers.category
		})
		.from(appointments)
		.leftJoin(suppliers, eq(appointments.supplierId, suppliers.id))
		.where(gte(appointments.date, today))
		.orderBy(asc(appointments.date), asc(appointments.time))
		.limit(4);

	return {
		summary,
		weddingISO: '2027-04-02T14:30:00',
		venue,
		progress: { done: tasksDone, total: tasksTotal, next: undone.slice(0, 3) },
		priority: undone.slice(0, 6),
		booked,
		upcoming
	};
};

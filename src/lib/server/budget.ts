import { asc } from 'drizzle-orm';
import { db } from './db/index';
import {
	budgetLines,
	vendors,
	payments,
	shoppingItems,
	settings,
	quoteLines,
	guests
} from './db/schema';
import { linkedConfirmed, isCommitted, sumPayments, derivedStatus } from '$lib/money';
import { resolveHeadcounts, type CostBasis, type Headcounts } from '$lib/headcount';
import { computeQuote } from '$lib/quote';

export interface EffectiveLine {
	id: number;
	category: string;
	section: string;
	budgeted: number;
	confirmed: number;
	paid: number;
	status: string;
	sort: number;
	editable: boolean; // false → confirmed/status derived, grid renders read-only
	link:
		| null
		| { type: 'vendor'; vendorId: number; vendorName: string }
		| { type: 'venue' }
		| { type: 'shopping' };
	payments: { id: number; amount: number; paidOn: string | null; note: string | null }[];
}

// THE money rollup — the only place effective budget figures are computed.
// Budget page and Overview both consume this.
export async function effectiveBudget() {
	const [lines, vs, ps, shopping, setRows, qLines, allGuests] = await Promise.all([
		db.select().from(budgetLines).orderBy(asc(budgetLines.sort)),
		db.select().from(vendors),
		db.select().from(payments).orderBy(asc(payments.id)),
		db.select().from(shoppingItems),
		db.select().from(settings),
		db.select().from(quoteLines).orderBy(asc(quoteLines.sort)),
		db.select().from(guests)
	]);

	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const target = Number(s.target ?? 30000);
	const basis = (['manual', 'estimate', 'confirmed'].includes(s.venueCostBasis)
		? s.venueCostBasis
		: 'estimate') as CostBasis;
	const manual: Headcounts = {
		day: Number(s.dayGuests ?? 61),
		eve: Number(s.eveGuests ?? 90),
		veg: Number(s.vegGuests ?? 0)
	};
	const heads = resolveHeadcounts(basis, allGuests, manual);
	const venueConfirmed = computeQuote(qLines, { ...heads, min: Number(s.minSpend ?? 16455) }).grand;

	const vendorById = new Map(vs.map((v) => [v.id, v]));
	// A line's payments: attached directly, plus its vendor's (vendor payments
	// carry no budgetLineId, so nothing double-counts).
	const pay = (lineId: number, vendorId: number | null) =>
		ps.filter(
			(p) =>
				p.budgetLineId === lineId ||
				(vendorId != null && p.vendorId === vendorId && p.budgetLineId == null)
		);

	const effective: EffectiveLine[] = lines.map((l) => {
		const rows = pay(l.id, l.vendorId);
		const paid = sumPayments(rows);
		const base = {
			id: l.id,
			category: l.category,
			section: l.section,
			budgeted: l.budgeted,
			sort: l.sort,
			payments: rows.map((p) => ({ id: p.id, amount: p.amount, paidOn: p.paidOn, note: p.note }))
		};
		if (l.sourceType === 'venue') {
			return {
				...base,
				confirmed: venueConfirmed,
				paid,
				status: derivedStatus(venueConfirmed, paid, true),
				editable: false,
				link: { type: 'venue' as const }
			};
		}
		const v = l.vendorId != null ? vendorById.get(l.vendorId) : undefined;
		if (v) {
			const confirmed = linkedConfirmed(v);
			return {
				...base,
				confirmed,
				paid,
				status: derivedStatus(confirmed, paid, isCommitted(v)),
				editable: false,
				link: { type: 'vendor' as const, vendorId: v.id, vendorName: v.name ?? v.category }
			};
		}
		return { ...base, confirmed: l.confirmed, paid, status: l.status, editable: true, link: null };
	});

	// Shopping list — synced virtual line (previously duplicated in two loads).
	const shopTotal = shopping.reduce((a, i) => a + i.cost * i.qty, 0);
	const shopPaid = shopping.filter((i) => i.bought).reduce((a, i) => a + i.cost * i.qty, 0);
	effective.push({
		id: -1,
		category: 'Shopping list',
		section: 'Everything else',
		budgeted: shopTotal,
		confirmed: shopTotal,
		paid: shopPaid,
		status: 'Shopping',
		sort: 1_000_000_000,
		editable: false,
		link: { type: 'shopping' },
		payments: []
	});

	const totals = {
		budgeted: effective.reduce((a, l) => a + l.budgeted, 0),
		confirmed: effective.reduce((a, l) => a + l.confirmed, 0),
		paid: effective.reduce((a, l) => a + l.paid, 0)
	};
	return { lines: effective, totals, target, basis, headcounts: heads };
}

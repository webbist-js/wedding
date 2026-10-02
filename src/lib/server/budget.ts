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
import { lineConfirmed, lineCommitted, sumPayments, derivedStatus } from '$lib/money';
import { resolveHeadcounts, type CostBasis, type Headcounts } from '$lib/headcount';
import { computeQuote } from '$lib/quote';

// A supplier as seen from its budget line.
export interface LineSupplier {
	id: number;
	name: string | null;
	category: string;
	stage: string;
	quotedAmount: number | null;
	depositAmount: number | null;
	depositPaid: boolean;
	locked: boolean;
	committed: boolean;
}

export interface EffectiveLine {
	id: number;
	category: string;
	section: string;
	budgeted: number;
	confirmed: number;
	paid: number;
	status: string;
	sort: number;
	locked: boolean;
	editable: boolean; // false → confirmed/status derived, grid renders read-only
	// Suppliers filed under this line (vendors.budgetLineId). Any supplier makes
	// the line derived: confirmed = Σ committed quotes.
	suppliers: LineSupplier[];
	link: null | { type: 'venue' } | { type: 'shopping' };
	payments: { id: number; amount: number; paidOn: string | null; note: string | null }[];
}

export function toLineSupplier(v: typeof vendors.$inferSelect): LineSupplier {
	return {
		id: v.id,
		name: v.name,
		category: v.category,
		stage: v.stage,
		quotedAmount: v.quotedAmount,
		depositAmount: v.depositAmount,
		depositPaid: v.depositPaid,
		locked: v.locked,
		committed: lineCommitted([v])
	};
}

// THE money rollup — the only place effective budget figures are computed.
// Budget page, Suppliers page and Overview all consume this.
export async function effectiveBudget() {
	const [lines, vs, ps, shopping, setRows, qLines, allGuests] = await Promise.all([
		db.select().from(budgetLines).orderBy(asc(budgetLines.sort)),
		db.select().from(vendors).orderBy(asc(vendors.sort), asc(vendors.id)),
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

	// Suppliers grouped by the line they're filed under.
	const byLine = new Map<number, typeof vs>();
	const unassigned: LineSupplier[] = [];
	for (const v of vs) {
		if (v.budgetLineId == null) unassigned.push(toLineSupplier(v));
		else (byLine.get(v.budgetLineId) ?? byLine.set(v.budgetLineId, []).get(v.budgetLineId)!).push(v);
	}

	// A line's payments: attached directly, plus any of its suppliers' (supplier
	// payments carry no budgetLineId, so nothing double-counts).
	const pay = (lineId: number, supplierIds: Set<number>) =>
		ps.filter(
			(p) =>
				p.budgetLineId === lineId ||
				(p.vendorId != null && supplierIds.has(p.vendorId) && p.budgetLineId == null)
		);

	const effective: EffectiveLine[] = lines.map((l) => {
		const lineVendors = byLine.get(l.id) ?? [];
		const rows = pay(l.id, new Set(lineVendors.map((v) => v.id)));
		const paid = sumPayments(rows);
		const base = {
			id: l.id,
			category: l.category,
			section: l.section,
			budgeted: l.budgeted,
			sort: l.sort,
			locked: l.locked,
			suppliers: lineVendors.map(toLineSupplier),
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
		if (lineVendors.length > 0) {
			const confirmed = lineConfirmed(lineVendors);
			return {
				...base,
				confirmed,
				paid,
				status: derivedStatus(confirmed, paid, lineCommitted(lineVendors)),
				editable: false,
				link: null
			};
		}
		return { ...base, confirmed: l.confirmed, paid, status: l.status, editable: true, link: null };
	});

	// Shopping list — synced virtual line.
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
		locked: false,
		editable: false,
		suppliers: [],
		link: { type: 'shopping' },
		payments: []
	});

	const totals = {
		budgeted: effective.reduce((a, l) => a + l.budgeted, 0),
		confirmed: effective.reduce((a, l) => a + l.confirmed, 0),
		paid: effective.reduce((a, l) => a + l.paid, 0)
	};
	return {
		lines: effective,
		totals,
		target,
		basis,
		headcounts: heads,
		shoppingCount: shopping.length,
		unassigned
	};
}

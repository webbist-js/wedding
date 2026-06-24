import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { budgetLines, stationeryItems, settings, quoteLines, shoppingItems } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { computeQuote } from '$lib/quote';
import { BUDGET_SECTIONS, VENUE_BUDGET_CATEGORY } from '$lib/server/db/data';

// The shopping list surfaces in the budget as one synced, read-only line.
const SHOPPING_BUDGET_CATEGORY = 'Shopping list';
const SHOPPING_BUDGET_SECTION = 'Everything else';

export const load: PageServerLoad = async () => {
	const lines = await db.select().from(budgetLines).orderBy(asc(budgetLines.sort));
	const statio = await db.select().from(stationeryItems).orderBy(asc(stationeryItems.sort));
	const setRows = await db.select().from(settings);
	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const target = Number(s.target ?? 30000);

	// Sync the venue budget line's "confirmed" from the live Venue tab total.
	const quote = await db.select().from(quoteLines);
	const venueTotal = computeQuote(
		quote.map((q) => ({ scope: q.scope, price: q.price, qty: q.qty, bond: q.bond })),
		{ day: Number(s.dayGuests ?? 61), eve: Number(s.eveGuests ?? 90), min: Number(s.minSpend ?? 16455) }
	).grand;

	const synced = lines.map((l) => ({
		...l,
		confirmed: l.category === VENUE_BUDGET_CATEGORY ? venueTotal : l.confirmed,
		isVenue: l.category === VENUE_BUDGET_CATEGORY,
		isShopping: false
	}));

	// Inject the shopping-list total as a synced line under "Everything else".
	const shopping = await db.select().from(shoppingItems);
	const shopTotal = shopping.reduce((a, i) => a + i.cost * i.qty, 0);
	const shopPaid = shopping.filter((i) => i.bought).reduce((a, i) => a + i.cost * i.qty, 0);
	synced.push({
		id: -1,
		category: SHOPPING_BUDGET_CATEGORY,
		section: SHOPPING_BUDGET_SECTION,
		budgeted: shopTotal,
		confirmed: shopTotal,
		paid: shopPaid,
		status: 'Shopping',
		sort: 1_000_000_000,
		isVenue: false,
		isShopping: true
	});

	return {
		sections: BUDGET_SECTIONS,
		lines: synced,
		statio,
		target,
		venueCategory: VENUE_BUDGET_CATEGORY,
		shoppingCount: shopping.length
	};
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
			paid: 0,
			status: 'Estimate',
			sort: maxSort + 1
		});
	},
	remove: async ({ request }) => {
		const f = await request.formData();
		await db.delete(budgetLines).where(eq(budgetLines.id, Number(f.get('id'))));
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

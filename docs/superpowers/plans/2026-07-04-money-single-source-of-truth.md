# Money Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Budget becomes a derived ledger: vendor-linked lines pull from Vendors, the Venue line pulls from the quote × RSVP-aware headcounts (with veg pricing), payments are individually recorded, and one rollup function feeds Budget + Overview.

**Architecture:** Derived-on-read. New `payments` table + `budget_lines.vendorId`/`sourceType` + `quote_lines.meal`. Pure calculators in `src/lib/money.ts`, `src/lib/headcount.ts`, extended `src/lib/quote.ts`; DB glue in `src/lib/server/budget.ts` consumed by Budget page and Overview.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Drizzle + libsql, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-money-single-source-of-truth-design.md`
- Hand-write migrations + `_journal.json` entry — **never** run `db:generate` (snapshots stale, see project memory).
- Tabs for indentation; Svelte 5 runes; no `Co-Authored-By` in commits.
- Tests never touch the DB — pure functions only.
- Timestamps: drizzle `{ mode: 'timestamp' }` = unix **seconds**; use `unixepoch()` in SQL.
- Committed = vendor `depositPaid || stage === 'Booked'`. Non-veg day count = `day − veg`. Bond stays inside the venue confirmed figure.

---

### Task 1: Schema, migration 0018, seed update

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0018_money_sot.sql`
- Modify: `drizzle/meta/_journal.json` (append idx 18)
- Modify: `src/lib/server/db/seed.ts` (budget block), `src/lib/server/db/data.ts` (no shape change needed — `paid` in seeds feeds payments)

**Interfaces:**
- Produces: `payments` table; `budgetLines.vendorId`, `budgetLines.sourceType`; `quoteLines.meal`; settings rows `vegGuests=6`, `venueCostBasis=estimate`, `venueOriginalQuote=17319.4`. `budgetLines.paid` is GONE — all readers change in later tasks.

- [ ] **Step 1: Schema edits**

In `budgetLines`, replace the `paid` column with the link columns:

```ts
	budgeted: real('budgeted').notNull().default(0),
	confirmed: real('confirmed').notNull().default(0),
	// Linked lines derive confirmed/paid at read time (see lib/server/budget.ts):
	// vendorId → pulls from that vendor; sourceType 'venue' → pulls from the
	// quote calculator. paid lives in `payments` for every line.
	vendorId: integer('vendor_id').references(() => vendors.id),
	sourceType: text('source_type', { enum: ['venue'] }),
	status: text('status').notNull().default('todo'),
```

In `quoteLines` after `scope`:

```ts
	// Per-head meal dimension: 'veg'/'nonveg' lines multiply by the veg /
	// (day − veg) headcount instead of the full day count. Only meaningful on
	// scope 'day' lines.
	meal: text('meal', { enum: ['any', 'veg', 'nonveg'] }).notNull().default('any'),
```

New table after `shoppingItems`:

```ts
// Every individual payment ("track every penny"). Attached to a vendor OR a
// budget line — the budget's paid figures are sums over this table.
export const payments = sqliteTable('payments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	amount: real('amount').notNull(),
	paidOn: text('paid_on'), // ISO YYYY-MM-DD
	note: text('note'),
	vendorId: integer('vendor_id').references(() => vendors.id),
	budgetLineId: integer('budget_line_id').references(() => budgetLines.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
});
```

- [ ] **Step 2: Migration** `drizzle/0018_money_sot.sql`:

```sql
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`paid_on` text,
	`note` text,
	`vendor_id` integer,
	`budget_line_id` integer,
	`created_at` integer,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_line_id`) REFERENCES `budget_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `vendor_id` integer REFERENCES vendors(id);
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `source_type` text;
--> statement-breakpoint
ALTER TABLE `quote_lines` ADD `meal` text DEFAULT 'any' NOT NULL;
--> statement-breakpoint
INSERT INTO `payments` (`amount`, `paid_on`, `note`, `budget_line_id`, `created_at`)
SELECT `paid`, NULL, 'Opening balance (migrated)', `id`, unixepoch()
FROM `budget_lines` WHERE `paid` > 0;
--> statement-breakpoint
ALTER TABLE `budget_lines` DROP COLUMN `paid`;
--> statement-breakpoint
UPDATE `budget_lines` SET `source_type` = 'venue' WHERE `category` = 'Venue';
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('vegGuests', '6');
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueCostBasis', 'estimate');
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueOriginalQuote', '17319.4');
```

Append to `drizzle/meta/_journal.json` entries: `{ "idx": 18, "version": "6", "when": <prev+1>, "tag": "0018_money_sot", "breakpoints": true }`.

- [ ] **Step 3: Seed update** — in `seed.ts`'s budget block, stop writing `paid`, mark the venue row, and emit opening payments:

```ts
	if ((await db.select().from(budgetLines)).length === 0) {
		for (const [i, b] of SEED_BUDGET.entries()) {
			const [row] = await db
				.insert(budgetLines)
				.values({
					category: b.category,
					section: b.section,
					budgeted: b.budgeted,
					confirmed: b.confirmed,
					status: b.status,
					sort: i,
					sourceType: b.category === VENUE_BUDGET_CATEGORY ? 'venue' : null
				})
				.returning({ id: budgetLines.id });
			if (b.paid > 0) {
				await db.insert(payments).values({
					amount: b.paid,
					note: 'Opening balance (seeded)',
					budgetLineId: row.id,
					createdAt: new Date()
				});
			}
		}
	}
```

(Import `payments` + `VENUE_BUDGET_CATEGORY`; keep the rest of the block as-is.)

- [ ] **Step 4: Migrate + verify**

Run: `npm run db:migrate` then
`sqlite3 local.db "SELECT count(*) FROM payments; PRAGMA table_info(budget_lines);"`
Expected: ≥1 migrated payment rows; no `paid` column; `vendor_id`/`source_type` present.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db/ drizzle/
git commit -m "feat(money): payments table, budget-vendor links, quote meal dimension"
```

*(The app is transiently broken — budget code still reads `paid`. Fixed by Task 3/4; acceptable inside one branch.)*

---

### Task 2: Pure calculators (TDD)

**Files:**
- Create: `src/lib/money.ts`, `src/lib/headcount.ts`
- Modify: `src/lib/quote.ts`
- Test: `tests/money.test.ts`, `tests/headcount.test.ts`; Modify: `tests/quote.test.ts`

**Interfaces (produced, used by Tasks 3–7):**
- `money.ts`: `isCommitted(v: {stage: string; depositPaid: boolean}): boolean`; `linkedConfirmed(v: {quotedAmount: number|null; stage: string; depositPaid: boolean}): number`; `sumPayments(ps: {amount: number}[]): number`; `derivedStatus(confirmed: number, paid: number, committed: boolean): 'Paid'|'Deposit'|'Booked'|'Estimate'`
- `headcount.ts`: `type CostBasis = 'manual'|'estimate'|'confirmed'`; `interface Headcounts { day: number; eve: number; veg: number }`; `interface HeadcountGuest { attendanceType: 'day'|'evening'; isChild: boolean; rsvpStatus: 'pending'|'yes'|'no'; meal: 'veg'|'non-veg'|null }`; `resolveHeadcounts(basis: CostBasis, guests: HeadcountGuest[], manual: Headcounts): Headcounts`
- `quote.ts`: `QuoteLineCalc` gains `meal?: 'any'|'veg'|'nonveg'`; `QuoteInputs` gains `veg: number`; `lineQty` meal-aware on `scope === 'day'`.

- [ ] **Step 1: Failing tests** — `tests/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isCommitted, linkedConfirmed, sumPayments, derivedStatus } from '../src/lib/money';

describe('linkedConfirmed', () => {
	it('counts a booked vendor quote', () => {
		expect(linkedConfirmed({ quotedAmount: 2750, stage: 'Booked', depositPaid: false })).toBe(2750);
	});
	it('counts a deposit-paid vendor even mid-pipeline', () => {
		expect(linkedConfirmed({ quotedAmount: 600, stage: 'Quoted', depositPaid: true })).toBe(600);
	});
	it('ignores uncommitted quotes', () => {
		expect(linkedConfirmed({ quotedAmount: 900, stage: 'Quoted', depositPaid: false })).toBe(0);
	});
	it('treats a committed vendor with no quote as zero', () => {
		expect(linkedConfirmed({ quotedAmount: null, stage: 'Booked', depositPaid: true })).toBe(0);
	});
});

describe('sumPayments', () => {
	it('sums amounts', () => {
		expect(sumPayments([{ amount: 400 }, { amount: 100.5 }])).toBe(500.5);
	});
	it('is zero for none', () => {
		expect(sumPayments([])).toBe(0);
	});
});

describe('derivedStatus', () => {
	it('Paid when payments cover the confirmed cost', () => {
		expect(derivedStatus(2750, 2750, true)).toBe('Paid');
	});
	it('Deposit when partially paid', () => {
		expect(derivedStatus(2750, 400, true)).toBe('Deposit');
	});
	it('Booked when committed but unpaid', () => {
		expect(derivedStatus(2750, 0, true)).toBe('Booked');
	});
	it('Estimate when uncommitted', () => {
		expect(derivedStatus(0, 0, false)).toBe('Estimate');
	});
	it('never Paid at zero confirmed', () => {
		expect(derivedStatus(0, 50, false)).toBe('Deposit');
	});
});

describe('isCommitted', () => {
	it('booked stage commits', () => expect(isCommitted({ stage: 'Booked', depositPaid: false })).toBe(true));
	it('deposit commits', () => expect(isCommitted({ stage: 'Lead', depositPaid: true })).toBe(true));
	it('lead does not', () => expect(isCommitted({ stage: 'Lead', depositPaid: false })).toBe(false));
});
```

`tests/headcount.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveHeadcounts, type HeadcountGuest } from '../src/lib/headcount';

const g = (over: Partial<HeadcountGuest>): HeadcountGuest => ({
	attendanceType: 'day',
	isChild: false,
	rsvpStatus: 'pending',
	meal: null,
	...over
});
const MANUAL = { day: 61, eve: 90, veg: 6 };

describe('manual basis', () => {
	it('returns the manual counts untouched', () => {
		expect(resolveHeadcounts('manual', [g({})], MANUAL)).toEqual(MANUAL);
	});
});

describe('estimate basis', () => {
	it('counts everyone not declined; eve = day + evening-only', () => {
		const guests = [
			g({}), // pending day — counted
			g({ rsvpStatus: 'yes' }),
			g({ rsvpStatus: 'no' }), // declined — excluded
			g({ attendanceType: 'evening' }),
			g({ attendanceType: 'evening', rsvpStatus: 'no' })
		];
		const r = resolveHeadcounts('estimate', guests, MANUAL);
		expect(r.day).toBe(2);
		expect(r.eve).toBe(3);
	});
	it('extrapolates the responded veg share to the full day count', () => {
		const guests = [
			g({ rsvpStatus: 'yes', meal: 'veg' }),
			g({ rsvpStatus: 'yes', meal: 'non-veg' }),
			g({}),
			g({})
		];
		// 1 of 2 responders veg → 50% of 4 day guests = 2
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(2);
	});
	it('falls back to manual veg (capped at day) when nobody has chosen', () => {
		const guests = [g({}), g({})];
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(2);
	});
	it('ignores children in the veg share', () => {
		const guests = [g({ rsvpStatus: 'yes', meal: 'veg', isChild: true }), g({ rsvpStatus: 'yes', meal: 'non-veg' })];
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(0);
	});
});

describe('confirmed basis', () => {
	it('counts RSVP yes only, veg from chosen meals', () => {
		const guests = [
			g({ rsvpStatus: 'yes', meal: 'veg' }),
			g({ rsvpStatus: 'yes', meal: 'non-veg' }),
			g({ rsvpStatus: 'yes' }), // yes, no meal picked → non-veg for pricing
			g({}), // pending — not confirmed
			g({ attendanceType: 'evening', rsvpStatus: 'yes' })
		];
		const r = resolveHeadcounts('confirmed', guests, MANUAL);
		expect(r).toEqual({ day: 3, eve: 4, veg: 1 });
	});
});
```

Update `tests/quote.test.ts` — add `veg: 0` to existing inputs and append:

```ts
describe('meal-aware lineQty', () => {
	const i = { day: 60, eve: 90, min: 0, veg: 8 };
	it('veg day line uses the veg count', () => {
		expect(lineQty({ scope: 'day', meal: 'veg', price: 40, qty: null, bond: false }, i)).toBe(8);
	});
	it('nonveg day line uses day minus veg', () => {
		expect(lineQty({ scope: 'day', meal: 'nonveg', price: 44, qty: null, bond: false }, i)).toBe(52);
	});
	it('any day line uses the full day count', () => {
		expect(lineQty({ scope: 'day', price: 50, qty: null, bond: false }, i)).toBe(60);
	});
	it('meal is ignored off day scope', () => {
		expect(lineQty({ scope: 'eve', meal: 'veg', price: 15, qty: null, bond: false }, i)).toBe(90);
	});
});
```

- [ ] **Step 2: Run, verify red**

Run: `npx vitest run tests/money.test.ts tests/headcount.test.ts tests/quote.test.ts`
Expected: FAIL (missing modules / missing `veg`).

- [ ] **Step 3: Implement**

`src/lib/money.ts`:

```ts
// Pure money semantics shared by the budget rollup and its tests.

export interface VendorMoney {
	quotedAmount?: number | null;
	stage: string;
	depositPaid: boolean;
}

// "Committed" = contractually on the hook: booked, or deposit down.
export function isCommitted(v: Pick<VendorMoney, 'stage' | 'depositPaid'>): boolean {
	return v.depositPaid || v.stage === 'Booked';
}

// A vendor-linked budget line's confirmed cost. Quotes from uncommitted
// vendors stay out of "confirmed" — they're still estimates.
export function linkedConfirmed(v: VendorMoney): number {
	return isCommitted(v) ? (v.quotedAmount ?? 0) : 0;
}

export function sumPayments(ps: { amount: number }[]): number {
	return ps.reduce((a, p) => a + p.amount, 0);
}

export function derivedStatus(
	confirmed: number,
	paid: number,
	committed: boolean
): 'Paid' | 'Deposit' | 'Booked' | 'Estimate' {
	if (confirmed > 0 && paid >= confirmed) return 'Paid';
	if (paid > 0) return 'Deposit';
	if (committed) return 'Booked';
	return 'Estimate';
}
```

`src/lib/headcount.ts`:

```ts
// Resolves the venue calculator's headcounts from the chosen cost basis.
// Pure: callers pass guest rows + the manually-typed fallback counts.

export type CostBasis = 'manual' | 'estimate' | 'confirmed';

export interface Headcounts {
	day: number;
	eve: number; // total evening attendance (day guests stay on)
	veg: number; // vegetarian mains among day guests; non-veg = day - veg
}

export interface HeadcountGuest {
	attendanceType: 'day' | 'evening';
	isChild: boolean;
	rsvpStatus: 'pending' | 'yes' | 'no';
	meal: 'veg' | 'non-veg' | null;
}

export function resolveHeadcounts(
	basis: CostBasis,
	guests: HeadcountGuest[],
	manual: Headcounts
): Headcounts {
	if (basis === 'manual') return { ...manual };

	// Meal choices only come from adult RSVP-yes responders.
	const respondedVeg = guests.filter(
		(g) => g.rsvpStatus === 'yes' && !g.isChild && g.meal === 'veg'
	).length;
	const respondedMeals = guests.filter(
		(g) => g.rsvpStatus === 'yes' && !g.isChild && g.meal !== null
	).length;

	if (basis === 'confirmed') {
		const day = guests.filter((g) => g.attendanceType === 'day' && g.rsvpStatus === 'yes').length;
		const eveOnly = guests.filter(
			(g) => g.attendanceType === 'evening' && g.rsvpStatus === 'yes'
		).length;
		return { day, eve: day + eveOnly, veg: respondedVeg };
	}

	// estimate: everyone still expected (not declined); veg share of responders
	// extrapolated to the full day count, manual fallback before any responses.
	const day = guests.filter((g) => g.attendanceType === 'day' && g.rsvpStatus !== 'no').length;
	const eveOnly = guests.filter(
		(g) => g.attendanceType === 'evening' && g.rsvpStatus !== 'no'
	).length;
	const veg =
		respondedMeals > 0
			? Math.round((day * respondedVeg) / respondedMeals)
			: Math.min(manual.veg, day);
	return { day, eve: day + eveOnly, veg };
}
```

`src/lib/quote.ts` — extend:

```ts
export interface QuoteLineCalc {
  scope: 'day' | 'eve' | 'fixed' | 'custom';
  meal?: 'any' | 'veg' | 'nonveg';
  price: number;
  qty: number | null;
  bond: boolean;
}
export interface QuoteInputs {
  day: number;
  eve: number;
  min: number;
  veg: number;
}
```

and in `lineQty`:

```ts
export function lineQty(line: QuoteLineCalc, i: QuoteInputs): number {
  if (line.scope === 'day') {
    if (line.meal === 'veg') return i.veg;
    if (line.meal === 'nonveg') return Math.max(0, i.day - i.veg);
    return i.day;
  }
  if (line.scope === 'eve') return i.eve;
  if (line.scope === 'fixed') return 1;
  return line.qty ?? 0;
}
```

- [ ] **Step 4: Run, verify green**

Run: `npx vitest run tests/money.test.ts tests/headcount.test.ts tests/quote.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/headcount.ts src/lib/quote.ts tests/
git commit -m "feat(money): pure calculators — vendor semantics, headcount bases, meal-aware quote"
```

---

### Task 3: Rollup module + payments/link endpoints

**Files:**
- Create: `src/lib/server/budget.ts`
- Create: `src/routes/dashboard/budget/payments/+server.ts`
- Modify: `src/routes/dashboard/budget/line/+server.ts`
- Modify: `src/routes/dashboard/venue/quote/+server.ts`

**Interfaces:**
- Consumes: Task 1 schema, Task 2 calculators.
- Produces:
  - `effectiveBudget(): Promise<{ lines: EffectiveLine[]; totals: { budgeted; confirmed; paid }; target: number; basis: CostBasis; headcounts: Headcounts }>` where `EffectiveLine = { id, category, section, budgeted, confirmed, paid, status, sort, editable: boolean, link: null | { type: 'vendor'; vendorId: number; vendorName: string } | { type: 'venue' } | { type: 'shopping' }, payments: { id; amount; paidOn; note }[] }`
  - `POST /dashboard/budget/payments` — `{ op: 'add', amount, paidOn?, note?, vendorId? , budgetLineId? }` | `{ op: 'remove', id }`
  - `POST /dashboard/budget/line` — existing fields minus `paid`, plus `field: 'vendorId'` (number | null; unlink freezes derived confirmed into the column).
  - `POST /dashboard/venue/quote` — additionally `field: 'meal'` and settings `vegGuests` (numeric), `venueCostBasis` (enum string).

- [ ] **Step 1: `src/lib/server/budget.ts`**

```ts
import { asc, eq } from 'drizzle-orm';
import { db } from './db/index';
import { budgetLines, vendors, payments, shoppingItems, settings, quoteLines, guests } from './db/schema';
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
```

- [ ] **Step 2: Payments endpoint** `src/routes/dashboard/budget/payments/+server.ts`:

```ts
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
```

- [ ] **Step 3: Line endpoint** — replace `budget/line/+server.ts` field handling:

```ts
const NUMERIC = new Set(['budgeted', 'confirmed']);
const TEXT = new Set(['category', 'status', 'section']);
```

and after the existing row fetch, insert link handling before the generic set:

```ts
	// Link / unlink a vendor. Unlinking freezes the derived confirmed figure
	// into the manual column so nothing visibly changes at the moment of unlink.
	if (field === 'vendorId') {
		if (value == null || value === '') {
			let frozen = row.confirmed;
			if (row.vendorId != null) {
				const [v] = await db.select().from(vendors).where(eq(vendors.id, row.vendorId));
				if (v) frozen = linkedConfirmed(v);
			}
			await db
				.update(budgetLines)
				.set({ vendorId: null, confirmed: frozen })
				.where(eq(budgetLines.id, row.id));
		} else {
			const [v] = await db.select().from(vendors).where(eq(vendors.id, Number(value)));
			if (!v) throw error(400, 'no such vendor');
			await db.update(budgetLines).set({ vendorId: v.id }).where(eq(budgetLines.id, row.id));
		}
		await recordAudit(locals, { action: 'update', entity: 'budget_line', entityId: row.id, summary: `${row.category}: vendor link` });
		return json({ ok: true });
	}
	// Derived lines only accept the earmark + housekeeping fields.
	if ((row.vendorId != null || row.sourceType != null) && (field === 'confirmed' || field === 'status')) {
		throw error(400, 'derived line');
	}
```

(Imports gain `vendors` + `linkedConfirmed`.)

- [ ] **Step 4: Quote endpoint** — in `venue/quote/+server.ts`:
  - `SETTING_KEYS` becomes `['dayGuests', 'eveGuests', 'minSpend', 'vegGuests']`.
  - Add after the numeric-setting branch:

```ts
  // Cost basis is a string setting, not numeric.
  if (body.setting === 'venueCostBasis') {
    const v = String(body.value ?? '');
    if (!['manual', 'estimate', 'confirmed'].includes(v)) throw error(400, 'bad basis');
    await db.update(settings).set({ value: v }).where(eq(settings.key, 'venueCostBasis'));
    return json({ ok: true });
  }
```

placed BEFORE the `SETTING_KEYS` check (so the string setting isn't rejected), and a meal field branch beside `scope`:

```ts
  if (field === 'meal') {
    const v = String(value ?? '');
    if (!['any', 'veg', 'nonveg'].includes(v)) throw error(400, 'bad meal');
    await db.update(quoteLines).set({ meal: v as 'any' | 'veg' | 'nonveg' }).where(eq(quoteLines.id, Number(id)));
    return json({ ok: true });
  }
```

- [ ] **Step 5: Verify + commit**

Run: `npm run check` → 0 errors (budget/overview pages still reference `paid` — if errors surface there, they're fixed in Tasks 4/7; only proceed if remaining errors are exactly those).

```bash
git add src/lib/server/budget.ts src/routes/dashboard/budget/ src/routes/dashboard/venue/quote/
git commit -m "feat(money): effectiveBudget rollup, payments + link endpoints, meal/basis settings"
```

---

### Task 4: Budget page rework

**Files:**
- Modify: `src/routes/dashboard/budget/+page.server.ts` (load uses rollup; also return vendors for the link select)
- Modify: `src/routes/dashboard/budget/+page.svelte`

**Interfaces:**
- Consumes: `effectiveBudget()`, `POST /dashboard/budget/payments`, `field: 'vendorId'` on the line endpoint.

- [ ] **Step 1: Load**

```ts
export const load: PageServerLoad = async () => {
	const { lines, totals, target, basis } = await effectiveBudget();
	const statio = await db.select().from(stationeryItems).orderBy(asc(stationeryItems.sort));
	const vendorOptions = (await db.select().from(vendors).orderBy(asc(vendors.sort))).map((v) => ({
		id: v.id,
		label: v.name ? `${v.category} — ${v.name}` : v.category
	}));
	return { sections: BUDGET_SECTIONS, lines, totals, target, basis, statio, vendorOptions };
};
```

(Actions `add`/`remove`/`setTarget` unchanged. Shopping injection code deleted — the rollup does it.)

- [ ] **Step 2: Grid rework** (`+page.svelte`) — key changes, everything else stays:
  - Stats derive from `data.totals` instead of recomputing.
  - A row is read-only when `!line.editable`: confirmed + status render as text; category input stays editable for vendor-linked lines; venue/shopping keep the synced treatment. Chips: `Synced` (shopping), `from Venue ↗` linking `/dashboard/venue`, `⭲ {vendorName}` linking `/dashboard/vendors`.
  - New Link column: `<select>` with `— manual —` + `data.vendorOptions`, value = `line.link?.type === 'vendor' ? vendorId : ''`; change → `saveField(line.id, 'vendorId', value || null)` then `invalidateAll()`. Hidden for venue/shopping rows.
  - Paid column becomes a button (`{gbp(line.paid)} ▾`) toggling an expander row beneath: payment list (`£amount · date · note` + × remove) and an add form (amount, date, note). Add posts to `/dashboard/budget/payments` with `vendorId` when the row is vendor-linked, else `budgetLineId`; then `invalidateAll()`.
  - `saveField` for `paid` is removed (no such field).

Complete new script functions:

```ts
	let openPayments = $state<number | null>(null);
	async function addPayment(line: (typeof data.lines)[number], amount: number, paidOn: string, note: string) {
		if (!amount) return;
		await fetch('/dashboard/budget/payments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				op: 'add',
				amount,
				paidOn: paidOn || null,
				note: note || null,
				...(line.link?.type === 'vendor' ? { vendorId: line.link.vendorId } : { budgetLineId: line.id })
			})
		});
		await invalidateAll();
	}
	async function removePayment(id: number) {
		await fetch('/dashboard/budget/payments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ op: 'remove', id })
		});
		await invalidateAll();
	}
	async function linkVendor(id: number, vendorId: string) {
		await saveField(id, 'vendorId', vendorId || null);
		await invalidateAll();
	}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run check` (0 errors) and manual: budget renders, venue row shows live quote figure, link select works, payments expander adds/removes.

```bash
git add src/routes/dashboard/budget/
git commit -m "feat(money): budget grid — derived lines, vendor linking, payments ledger UI"
```

---

### Task 5: Vendors page — payments, deposit event, safe delete

**Files:**
- Modify: `src/routes/dashboard/vendors/+page.server.ts` (load payments; delete handling)
- Modify: `src/routes/dashboard/vendors/edit/+server.ts` (deposit auto-payment)
- Modify: `src/routes/dashboard/vendors/+page.svelte` (payments block)

**Interfaces:**
- Consumes: `payments` table, `linkedConfirmed`, payments endpoint (reused client-side).

- [ ] **Step 1: Load payments** — add to the load return: `payments: await db.select().from(payments).orderBy(asc(payments.id))`.

- [ ] **Step 2: Deposit auto-payment** — in `edit/+server.ts` inside the existing `depositPaid` flip block (after the Slack ping), add:

```ts
		// First deposit event: record the money as a payment (once, evented — not
		// a sync; deleting/adjusting it later is fine).
		const existing = await db.select().from(payments).where(eq(payments.vendorId, Number(id)));
		if (existing.length === 0 && prev.depositAmount) {
			await db.insert(payments).values({
				amount: prev.depositAmount,
				note: 'Deposit',
				vendorId: Number(id),
				createdAt: new Date()
			});
		}
```

- [ ] **Step 3: Safe delete** — extend the `remove` action before `db.delete(vendors)`:

```ts
		// Money safety: freeze the derived confirmed figure into any linked budget
		// line, unlink it, and re-attach this vendor's payments to that line (or
		// leave them detached-from-vendor if no line) — spend history survives.
		const [vRow] = await db.select().from(vendors).where(eq(vendors.id, id));
		const [linked] = await db.select().from(budgetLines).where(eq(budgetLines.vendorId, id));
		if (linked && vRow) {
			await db
				.update(budgetLines)
				.set({ vendorId: null, confirmed: linkedConfirmed(vRow), status: vRow.depositPaid ? 'Deposit' : linked.status })
				.where(eq(budgetLines.id, linked.id));
		}
		await db
			.update(payments)
			.set({ vendorId: null, budgetLineId: linked?.id ?? null })
			.where(eq(payments.vendorId, id));
```

- [ ] **Step 4: Payments block in the vendor card** — after the deposit toggle:

```svelte
      {@const vPays = data.payments.filter((p) => p.vendorId === v.id)}
      <div class="payments">
        <span class="pay-title">Payments {#if vPays.length}· {gbp(vPays.reduce((a, p) => a + p.amount, 0))} paid{/if}</span>
        {#each vPays as p (p.id)}
          <span class="pay-row">
            £{p.amount.toLocaleString('en-GB')}{p.paidOn ? ` · ${fmt(p.paidOn)}` : ''}{p.note ? ` · ${p.note}` : ''}
            <button class="pay-rm" title="Remove payment" onclick={() => removePayment(p.id)}>×</button>
          </span>
        {/each}
        <form class="pay-add" onsubmit={(e) => { e.preventDefault(); addPayment(v.id, e.currentTarget); }}>
          <input name="amount" type="number" step="0.01" placeholder="£" required />
          <input name="paidOn" type="date" />
          <input name="note" placeholder="What for?" />
          <button>+ Payment</button>
        </form>
      </div>
```

with script helpers (mirroring the budget page, posting to the same endpoint) and `gbp` helper. `invalidateAll()` after both.

- [ ] **Step 5: Verify + commit**

Run: `npm run check` → 0 errors. Manual: add/remove payments on a vendor; flip deposit on a vendor with a deposit amount → payment appears; delete a linked vendor → budget line keeps figures + payments.

```bash
git add src/routes/dashboard/vendors/
git commit -m "feat(money): vendor payments, deposit auto-payment, money-safe vendor delete"
```

---

### Task 6: Venue page — basis, derived counts, meal pricing, comparison

**Files:**
- Modify: `src/routes/dashboard/venue/+page.server.ts`
- Modify: `src/routes/dashboard/venue/+page.svelte`

**Interfaces:**
- Consumes: `resolveHeadcounts`, extended `computeQuote`, quote endpoint's `meal` + `vegGuests`/`venueCostBasis` settings.

- [ ] **Step 1: Load** — return everything the page needs to render all three bases:

```ts
export const load: PageServerLoad = async () => {
	const lines = await db.select().from(quoteLines).orderBy(asc(quoteLines.sort));
	const setRows = await db.select().from(settings);
	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const manual = {
		day: Number(s.dayGuests ?? 61),
		eve: Number(s.eveGuests ?? 90),
		veg: Number(s.vegGuests ?? 0)
	};
	const allGuests = await db.select().from(guests);
	return {
		lines,
		manual,
		min: Number(s.minSpend ?? 16455),
		basis: (['manual', 'estimate', 'confirmed'].includes(s.venueCostBasis) ? s.venueCostBasis : 'estimate') as CostBasis,
		counts: {
			manual,
			estimate: resolveHeadcounts('estimate', allGuests, manual),
			confirmed: resolveHeadcounts('confirmed', allGuests, manual)
		},
		originalQuote: Number(s.venueOriginalQuote ?? 17319.4)
	};
};
```

- [ ] **Step 2: Page rework** — script core:

```ts
	let basis = $state(data.basis);
	let manual = $state({ ...data.manual });
	let min = $state(data.min);
	let lines = $state(data.lines.map((l) => ({ ...l })));

	const active = $derived(basis === 'manual' ? manual : data.counts[basis]);
	const result = $derived(computeQuote(lines, { ...active, min }));
	const estimateGrand = $derived(computeQuote(lines, { ...data.counts.estimate, min }).grand);
	const confirmedGrand = $derived(computeQuote(lines, { ...data.counts.confirmed, min }).grand);
```

Controls: basis `<select>` (Manual / All invited / RSVP confirmed) saving `venueCostBasis`; manual inputs (day, eve, veg) shown when basis manual (veg saves `vegGuests`), read-only count pills otherwise (`{active.day} day · {active.eve} eve · {active.veg} veg`). `ORIGINAL_QUOTE` constant deleted — breakdown `vs` uses `data.originalQuote`. Per-head lines (`scope === 'day'`) get a meal `<select>` (Everyone / Vegetarian / Non-veg) → `saveLine(line, 'meal')`. Comparison strip above the totals:

```svelte
<div class="compare">
	<span>All invited: <strong>{gbp(estimateGrand)}</strong></span>
	<span>RSVP confirmed so far: <strong>{gbp(confirmedGrand)}</strong></span>
	<span>Original quote: <strong>{gbp(data.originalQuote)}</strong></span>
</div>
```

with a note that the highlighted basis is what the Budget's Venue line uses.

- [ ] **Step 3: Verify + commit**

Run: `npm run check` → 0 errors. Manual: switching basis changes totals; veg select on the two mains reprices; budget page Venue figure follows the chosen basis.

```bash
git add src/routes/dashboard/venue/
git commit -m "feat(money): venue basis selector, RSVP-derived headcounts, veg meal pricing"
```

---

### Task 7: Overview consumes the rollup

**Files:**
- Modify: `src/routes/dashboard/+page.server.ts`

- [ ] **Step 1:** Replace the budget block (lines 19–33) with:

```ts
	const { totals, target } = await effectiveBudget();
	const budget = {
		target,
		earmarked: totals.budgeted,
		confirmed: totals.confirmed,
		paid: totals.paid,
		remaining: target - totals.confirmed
	};
```

deleting the now-unused `budgetLines`/`shoppingItems` imports and the settings read for `target` (rollup provides it; keep `setRows` only if still used elsewhere in the load — it isn't, remove it).

- [ ] **Step 2: Verify + commit**

Run: `npm run check && npm test` → clean; Overview totals equal Budget page totals.

```bash
git add src/routes/dashboard/+page.server.ts
git commit -m "feat(money): overview reads the shared budget rollup"
```

---

### Task 8: Full verification

- [ ] Run: `npm run check && npm test && npm run build` → all clean.
- [ ] Manual end-to-end: link "Photography — Adam Lowndes" line to the Adam Lowndes vendor → confirmed shows 2750 derived, migrated £400 payment appears; unlink → 2750 frozen; venue basis toggle moves both Venue page + Budget line; overview matches.
- [ ] Commit any fixes; done.

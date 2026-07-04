# Money: Single Source of Truth — Design

**Date:** 2026-07-04
**Status:** Approved (direction approved in review; detail decisions recorded here)

## Goal

Every pound in the dashboard has exactly one home. The Budget is a read-mostly
ledger view that aggregates lines whose figures are either manual or *derived*
from a linked source (vendor, venue quote, shopping list) — never both. Venue
costs become guest-count-aware: estimated (invited) vs confirmed (RSVP yes),
with vegetarian/non-veg meal pricing.

## Problems being fixed (from the review)

1. Vendor money triple-entered (vendor row + hand-typed budget line + memory).
2. Budget's Venue line is a stale manual snapshot of the live quote calculator;
   `ORIGINAL_QUOTE` hardcoded in `venue/+page.svelte`.
3. Venue guest counts are hand-typed; guest list already knows invited/RSVP/veg
   splits (`summarise()`), and quote lines can't price veg vs non-veg mains.
4. Budget rollup math duplicated between Budget page and Overview.
5. `paid` is one overtypable number — no per-payment records ("every penny").

## Decisions

- **Derived-on-read**, not write-through sync: linked figures are computed at
  load time from their source. Nothing copies, nothing drifts. (The shopping
  line already works this way.)
- **Payments ledger included** ("track every penny"): a `payments` table;
  `paid` everywhere becomes a derived sum. The `budget_lines.paid` column is
  dropped after migrating its values into opening payment rows.
- **Refundable bond stays included** in the venue confirmed figure (it's cash
  you must have); the venue page continues to show it separately.
- **Child meal pricing is out of scope** — a custom-qty quote line already
  models it. `meal` covers the explicit veg/non-veg ask.
- **"Confirmed" for a vendor-linked line** means contractually committed:
  vendor `quotedAmount` counts only when stage is `Booked` or `depositPaid`.
- **Venue cost basis** is a setting (`venueCostBasis`): `manual` (typed
  counts, today's behaviour), `estimate` (everyone invited who hasn't
  declined — default), `confirmed` (RSVP yes only). The chosen basis drives
  both the venue page headline and the budget's Venue line.

## Schema changes (hand-written migration 0018 — drizzle generate is broken, see memory)

```ts
// budget_lines: link + source marker; paid DROPPED (migrated to payments)
vendorId: integer('vendor_id').references(() => vendors.id),   // null = manual
sourceType: text('source_type', { enum: ['venue'] }),          // null = manual

// quote_lines: meal dimension for per-head lines
meal: text('meal', { enum: ['any', 'veg', 'nonveg'] }).notNull().default('any'),

// payments — every penny, attached to a vendor OR a budget line
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  paidOn: text('paid_on'),                                   // ISO YYYY-MM-DD
  note: text('note'),
  vendorId: integer('vendor_id').references(() => vendors.id),
  budgetLineId: integer('budget_line_id').references(() => budgetLines.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
});
```

Migration also: copies `budget_lines.paid > 0` into one payment row per line
(note `'Opening balance (migrated)'`), drops the column, marks the
`category = 'Venue'` row `source_type = 'venue'`, and inserts settings
`vegGuests` (default 6), `venueCostBasis` (`estimate`),
`venueOriginalQuote` (`17319.4`).

## Headcounts (`src/lib/headcount.ts` — pure, tested)

```ts
export type CostBasis = 'manual' | 'estimate' | 'confirmed';
export interface Headcounts { day: number; eve: number; veg: number }
resolveHeadcounts(basis, guests: GuestRow[], manual: {day, eve, veg}): Headcounts
```

- `manual`: the three typed settings (`eve` stays "total evening attendance").
- `estimate`: day = day-type guests not declined; eve = day + evening-type not
  declined; veg = responded adult veg share extrapolated to day count
  (`round(day * cateringVeg / (cateringVeg + cateringNonVeg))`), falling back
  to manual `veg` when nobody has chosen a meal yet.
- `confirmed`: day = RSVP-yes day guests; eve = yes day + yes evening;
  veg = `cateringVeg`. Non-veg is always `day − veg` (guests who haven't
  picked a meal default to non-veg for pricing).

`lineQty` in `src/lib/quote.ts` becomes meal-aware: for `scope === 'day'`,
qty = `day` (`meal: any`) / `veg` / `day − veg`. `meal` is ignored on other
scopes. `QuoteInputs` gains `veg`.

## Rollup (`src/lib/server/budget.ts` — the one place totals are computed)

`effectiveBudget()` returns `{ lines, totals, target }` where each line is:

- **Manual line**: columns as stored; paid = Σ its payments.
- **Vendor-linked line** (`vendorId` set): confirmed = quotedAmount when
  Booked/depositPaid else 0; paid = Σ payments for that vendor (+ any attached
  directly to the line); status derived (Paid ≥ confirmed > 0 → `Paid`;
  any payment → `Deposit`; committed → `Booked`; else `Estimate`); read-only
  in the grid with a vendor chip.
- **Venue line** (`sourceType = 'venue'`): confirmed =
  `computeQuote(quoteLines, headcounts(basis)).grand`; budgeted stays manual
  (the earmark); paid = Σ its payments; read-only confirmed with a
  "from Venue ↗" chip.
- **Shopping line**: unchanged virtual row (id −1), now built here.

Pure calculation helpers (`linkedConfirmed`, `derivedStatus`, `sumPayments`)
live in `src/lib/money.ts` for vitest coverage; `effectiveBudget()` is thin DB
glue. Budget page and Overview both consume `effectiveBudget()` — the
duplicated math is deleted.

## UI changes

**Budget page**
- Linked rows: read-only confirmed/paid/status, vendor/venue chip linking to
  the source page. Budgeted stays editable everywhere (it's the earmark).
- Each manual row gets a compact "link" select (vendor list); linking a row
  makes it derived; unlinking freezes the current derived confirmed back into
  the column (no data loss).
- Paid cells open a payments popover: list (amount · date · note) + add +
  delete. Payments from a linked row attach to its vendor; from a manual row,
  to the line.

**Vendors page**
- Payments list + add row per vendor (replaces nothing — deposit fields stay).
- Flipping `depositPaid` on auto-creates a payment of `depositAmount` (once,
  only if no payment exists for the vendor yet) — evented, auditable, no sync.
- Vendor delete: freeze derived confirmed into any linked budget line, unlink
  it, re-attach the vendor's payments to that line (or leave detached if no
  line), then delete — extends the existing appointment-detach pattern.

**Venue page**
- Basis selector: Manual / All invited / RSVP confirmed. Derived bases show
  read-only counts (day · eve · veg with kids noted); manual keeps inputs and
  gains a veg input.
- Per-head quote lines get a meal select (Everyone / Veg / Non-veg).
- Comparison strip: Estimated vs Confirmed vs Original quote
  (`venueOriginalQuote` setting replaces the hardcoded constant).

## Semantics summary (single source of truth per figure)

| Figure | Source of truth | Edited on |
|---|---|---|
| Vendor quote/deposit/committed | `vendors` | Vendors |
| Venue cost | `quote_lines` × headcounts(basis) | Venue |
| Guest counts (estimate/confirmed) | `guests` via `summarise()` | Guests/RSVP |
| Manual guest counts + veg fallback | settings | Venue (manual mode) |
| Shopping | `shopping_items` | Shopping |
| Earmarks (`budgeted`) | `budget_lines.budgeted` | Budget |
| Manual line confirmed | `budget_lines.confirmed` | Budget |
| Every payment | `payments` | Budget popover / Vendors |
| Budget target | settings `target` | Budget |

## Error handling

- Vendor with no `quotedAmount`: linked confirmed = 0 (line reads as estimate).
- Deleting a payment: hard delete, audit-logged.
- Guest list empty / no RSVPs: estimate basis degrades to invited counts with
  manual veg fallback; confirmed basis shows zeros (true).
- All mutations audit-logged as elsewhere.

## Testing

- Pure: `resolveHeadcounts` (three bases, veg extrapolation + fallbacks),
  meal-aware `lineQty`/`computeQuote`, `linkedConfirmed`/`derivedStatus`/
  `sumPayments`.
- Manual: link/unlink round-trip keeps figures; vendor delete preserves
  payments; venue basis switch changes budget Venue line; overview equals
  budget page totals.

## Out of scope (YAGNI)

- Child meal pricing column (use a custom-qty line).
- Multi-currency, budget forecasting, payment due-date reminders (timeline
  items already cover due dates).
- Back-linking budget lines from the Vendors page UI (link from Budget only).

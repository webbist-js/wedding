# Money hub, lock toggles, Guests + Invites merge — Design

**Date:** 2026-10-02
**Status:** Approved (all four decision points confirmed in review)

## Goal

One place to manage money, one place to manage guests, and a way to mark a
figure as set and confirmed so it cannot be nudged by accident. Nothing in the
production database is deleted; rows are linked, renamed or copied only.

## Problems being fixed

1. **Venue "RSVP confirmed so far" reads £17,055 with zero RSVPs.** The maths
   is right (fixed + custom-qty lines at zero guests fall below the venue
   minimum, so the £16,455 floor applies, plus the £600 bond) but the card
   presents it as a confirmed cost.
2. **Suppliers and budget lines are loosely coupled.** `budget_lines.vendor_id`
   is optional and set from a hidden transparent select. In prod only 6 of 13
   vendors are linked; the DJ is duplicated (vendor row £3,900 + unlinked
   manual line £4,000), Photography shows £0 confirmed because the booked
   vendor has no quote, and three deposit-paid vendors still read
   Shortlisted/Lead.
3. **No way to lock a figure.** Quote lines carry an inverted "CONFIRM" badge
   (shown when *not* confirmed) that guards nothing.
4. **Budget grid affordances are invisible.** Two `color: transparent` selects
   per row (vendor link, section move) are the only way to link or move.
5. **Guests and Invites are the same list twice**, both keyed by household,
   both with search. Vendors sits in the Guests nav group.
6. Overview links to `/dashboard/suppliers`, which does not exist.

## Decisions

- **Supplier belongs to a budget line** (option B). `vendors.budget_line_id`
  replaces `budget_lines.vendor_id`. A line may have several suppliers (a
  shortlist); the line's confirmed figure is the sum of its *committed*
  suppliers' quotes (committed = Booked or deposit paid, unchanged). A line
  with any supplier is derived; a line with none is manual.
- **Lock is a per-row boolean** rendered as a padlock. Locked rows render
  read-only and the server rejects field edits on them (HTTP 423) except the
  lock itself. Applies to quote lines (the existing `confirmed` column is
  renamed `locked` and *is* the lock), budget lines, suppliers, and the venue
  header settings (setting `venueLocked`).
- **Budget page is the money hub.** Every row expands to show its suppliers,
  payments and lock. The Vendors page becomes **Suppliers** under Money: a
  pipeline view grouped by stage that reuses the same supplier card and links
  back to each supplier's budget line.
- **Guests absorbs Invites.** Each household card gains an invite panel (QR
  thumbnail, link, copy, download, personal message). `/dashboard/invites`
  redirects to `/dashboard/guests`. `/dashboard/vendors` redirects to
  `/dashboard/suppliers`.
- **Prod data fixes are applied** after the migration: link the six obvious
  orphan suppliers to their lines, copy the frozen £2,750 photography figure
  onto the vendor quote, rename the "Dae La Roux" line to "Music / DJ", and set
  stage = Booked wherever deposit is paid.
- **Deposit paid implies Booked** going forward: flipping `depositPaid` on also
  advances the stage.

## Schema (hand-written migration `0023_suppliers_lines_locks`)

```sql
ALTER TABLE vendors ADD budget_line_id integer REFERENCES budget_lines(id);
ALTER TABLE vendors ADD locked integer DEFAULT 0 NOT NULL;
ALTER TABLE budget_lines ADD locked integer DEFAULT 0 NOT NULL;
ALTER TABLE quote_lines RENAME COLUMN confirmed TO locked;
UPDATE vendors SET budget_line_id =
  (SELECT id FROM budget_lines WHERE budget_lines.vendor_id = vendors.id)
  WHERE budget_line_id IS NULL;
ALTER TABLE budget_lines DROP COLUMN vendor_id;   -- verified OK on libsql 3.45 / Turso 3.47
INSERT OR IGNORE INTO settings (key, value) VALUES ('venueLocked', '0');
```

Drizzle snapshots are stale (see memory); the SQL and `_journal.json` entry
are written by hand.

## Rollup (`src/lib/server/budget.ts`)

`effectiveBudget()` returns `{ lines, totals, target, basis, headcounts,
shoppingCount, unassigned }`. Each `EffectiveLine` gains:

- `locked: boolean`
- `suppliers: LineSupplier[]` — `{ id, name, category, stage, quotedAmount,
  depositAmount, depositPaid, locked, committed }` for every vendor whose
  `budgetLineId` is this line.
- `link` keeps `{type:'venue'}` / `{type:'shopping'}` / `null`; the old
  `{type:'vendor'}` variant is gone (suppliers array replaces it).

Pure helpers in `src/lib/money.ts` (tested): `lineConfirmed(suppliers)` =
Σ `linkedConfirmed`; `lineCommitted(suppliers)` = any committed. Payments for a
line = those attached to the line + those attached to any of its suppliers
(supplier payments carry no line id, so nothing double-counts). `unassigned`
lists vendors with no line, for the attention strip.

`src/lib/attention.ts` (pure, tested) — `budgetAttention(lines, unassigned)`
returns `{ kind, label, href }[]` for: committed supplier with no quote;
unassigned supplier; line with confirmed > budgeted > 0; deposit paid but stage
≠ Booked.

`src/lib/venue-compare.ts` (pure, tested) — `describeBasis(result, heads,
min)` returns `{ noGuests, topup, floor }` so the compare cards can explain
themselves.

## Endpoints

| Route | Change |
|---|---|
| `budget/line` | drop `vendorId`; add `locked`; 423 on locked rows for any other field |
| `budget/+page.server` `remove` | refuse when locked; detach suppliers (`budget_line_id = null`) before delete; line payments still go with the line |
| `budget/payments` | unchanged |
| `suppliers/+page.server` (renamed from vendors) | `add` accepts optional `budgetLineId` (category defaults to the line's); `remove` detaches appointments, re-attaches payments to the line, freezes `linkedConfirmed` into the line's manual column if this was its only supplier |
| `suppliers/edit` | add `budgetLineId`, `locked`; 423 on locked; `depositPaid` → also `stage = 'Booked'`; Slack link → `/dashboard/suppliers` |
| `venue/quote` | field `confirmed` → `locked`; 423 for label/scope/meal/price/qty/bond/remove on locked lines; setting `venueLocked`; 423 for other settings while locked |
| `guests/edit` | group field `personalMessage` (not seed-owned) |
| `guests/qr` (moved from invites) | `?token=&size=` (default 1024, min 96) |
| `/dashboard/invites`, `/dashboard/vendors` | 301 redirects |
| `invites/message` | deleted (folded into guests/edit) |

## Components

- `LockToggle.svelte` — padlock button; `locked`, `onToggle`, `label`.
- `SupplierCard.svelte` — the vendor card (contact grid, stage, quote,
  deposit, deposit paid, follow-up, priority, assign-to-line select, lock,
  payments, appointments, notes, remove). Used by the budget expander and the
  Suppliers page.
- `PaymentsLedger.svelte` — list + add + remove; attaches to `{vendorId}` or
  `{budgetLineId}`.
- `BudgetLineRow.svelte` — grid row + expander + visible row menu (move to
  section, add supplier, lock, remove). Supplier chips show name + stage pill.
- `BudgetCharts.svelte` — money bar, donut, budgeted-vs-confirmed bars.
- `AttentionStrip.svelte` — the needs-attention list.
- `InvitePanel.svelte` — QR thumb (lazy `<img>` from `guests/qr?size=180`),
  link, copy, download, personal message.

## Page changes

**Venue.** Compare strip cards gain a sub-line: headcounts for their basis,
and either "No replies yet — floor if nobody came: £16,455 min. spend + £600
bond" or "incl. £X min-spend top-up" when the top-up applies. Padlock per quote
row replaces the CONFIRM badge; locked rows disable inputs and hide remove.
Header gains a LockToggle that disables basis, counts, min spend and Reset.

**Budget.** Stat cards unchanged. Attention strip under the money bar. Synced
venue card gains a disclosure for its supplier (The Tithe Barn). Section grids
use `BudgetLineRow`. Expander: suppliers (SupplierCard each, + Add supplier)
and the payments ledger side by side. Row ids `line-<id>` so Suppliers can
deep-link.

**Suppliers.** Stat row (booked · shortlisted · leads · £ committed). Groups
in pipeline order Booked → Shortlisted → Quoted → Enquired → Lead, then
Unassigned. Each card shows "for <line category> →" linking to
`/dashboard/budget#line-<id>`.

**Guests.** Household card: header unchanged; body is two columns — contact
fields left, InvitePanel right. Status filter pills (All · Awaiting · Replied ·
Declined) next to search.

**Nav.** Money: Budget, Suppliers, Venue, Shopping. Guests: Guests, Seating.
Planning unchanged. Invites and Vendors entries removed. `ENTITY_KINDS.vendor`
href → `/dashboard/suppliers`.

## Prod data fix (run once after migration; every statement idempotent)

| Change | Why |
|---|---|
| vendor 1 Tithe Barn → line 1 Venue | contact details on the venue line |
| vendor 6 Dae La Roux → line 15; line 15 renamed "Music / DJ" | removes the duplicate; confirmed becomes £3,900 (vendor quote) instead of the hand-typed £4,000 |
| vendor 11 Forge & Lumber → line 3 Wedding rings | figures identical (£240 / £240) |
| vendor 7 Lois Cora → line 9 Hair & makeup | shortlisted, confirmed stays £0 |
| vendor 10 Devonshire Arms → line 20 | shortlisted, no quote |
| vendor 13 Yorkshire Paws → line 18 | lead, no quote |
| vendor 3 Adam Lowndes `quoted_amount = 2750` | restores the frozen manual figure; Photography confirmed £0 → £2,750 |
| vendors with `deposit_paid = 1` → `stage = 'Booked'` | Flowers, DJ, Cake; money unchanged (already committed) |

Vendor 16 ("Stationery / Favours / Décor —") stays unassigned and surfaces in
the attention strip. Net effect on "Confirmed costs": +£2,750 −£100.

## Error handling

- Locked row edits return 423 with a short message; the UI disables the
  controls so this is a backstop.
- Deleting a line with suppliers never deletes suppliers.
- A supplier with no line is valid (unassigned) and visible in two places.

## Testing

Pure: `lineConfirmed`/`lineCommitted`, `budgetAttention`, `describeBasis`.
Existing suite stays green. Manual: migration on local.db then on Turso; budget
totals before/after match the table above; lock blocks edits; invites merged
view renders QR and saves a personal message; redirects work.

## Out of scope

Child meal pricing, printing a sheet of QR cards, kanban drag between stages,
multi-currency.

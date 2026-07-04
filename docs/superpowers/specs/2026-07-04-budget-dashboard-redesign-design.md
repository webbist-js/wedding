# Budget Dashboard Redesign — Design

**Date:** 2026-07-04
**Status:** Approved (user-supplied mockup is the visual spec)

## Goal

Rebuild `/dashboard/budget` as a dashboard-style view per the mockup, and
deprecate the **Favours** section — favour spending moves to the Shopping list.

## Favours deprecation (migration 0019)

- Every `budget_lines` row in section `Favours` becomes a `shopping_items` row:
  - `label` = category, `qty` = 1, `notes` = 'Moved from Budget · Favours'
  - `cost` = payments sum if any, else `confirmed` if > 0, else `budgeted`
  - `bought` = true when the line had any payments (its spend is preserved in
    the shopping total exactly)
- Those lines' ledger rows are deleted (value baked into the item cost — the
  shopping list has no per-payment ledger) and the budget lines removed.
- `BUDGET_SECTIONS` loses `Favours`; the seeded Favours line is dropped.
  Décor & flowers stays — only Favours was deprecated.
- Current prod content: 4 favour lines, none vendor-linked, one £15.80 payment
  → becomes a bought £15.80 item.

## New layout (top to bottom, per mockup)

1. **Stat cards (5):** Target (editable, unchanged) · Total earmarked ·
   Confirmed costs · Paid to date (sage-filled card) · Over target/Headroom
   (earmarked vs target; terra when over).
2. **"Where the money is" bar:** single stacked bar out of
   `max(target, earmarked)` — Paid / Confirmed unpaid (confirmed − paid) /
   Still estimated (earmarked − confirmed) — with legend and an
   over/under-target caption.
3. **Spend by area:** SVG donut of earmarked by area — Venue (venue line),
   each remaining budget section, Shopping — legend with amounts, centre shows
   `£32k`-style short total.
4. **Budgeted vs confirmed:** one thin bar per area (confirmed ÷ budgeted).
5. **"Pulled in from elsewhere":** the venue-synced line and the shopping
   virtual line leave the grid and become two synced cards showing
   confirmed / paid / budgeted with a link to their source page. The venue
   card's budgeted (earmark) figure stays editable inline. Shopping card
   notes its item count.
6. **Section cards** (Essentials, Décor & flowers, Stationery, Everything
   else): header shows line count + planned/confirmed/paid; columns Category
   (with vendor chip + link select) · £ Budgeted · £ Confirmed · Paid
   (payments popover button, unchanged behaviour) · Status · remove. Compact
   section select stays (rows can still move section); drag-reorder kept.
   Add-row per section (existing action).

## Unchanged

Rollup semantics (`effectiveBudget`), payments endpoints, vendor linking,
derived read-only rules, `gbp` formatting, drag-reorder, target edit action.
`effectiveBudget` additionally returns `shoppingCount` for the card copy.

## Testing

Existing suite must stay green; visual checks manual. Donut/bar maths are
trivial ratios — no new pure-function surface worth unit tests except keeping
the migration data-preserving (verified by inspection queries pre/post).

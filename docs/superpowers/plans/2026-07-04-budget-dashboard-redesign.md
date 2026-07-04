# Budget Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deprecate Favours (migrate to shopping items) and rebuild `/dashboard/budget` per the mockup — stat cards, stacked money bar, spend-by-area donut, budgeted-vs-confirmed bars, synced source cards, per-section card grids.

**Architecture:** Data migration 0019 (hand-written, journal appended). `effectiveBudget()` gains `shoppingCount`. The page component is rebuilt; all money math stays in the existing rollup; the charts are ratio math inline in the component (SVG donut + div bars).

**Tech Stack:** Svelte 5 runes, existing tokens.css palette.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-budget-dashboard-redesign-design.md`
- Hand-written migrations only (drizzle generate broken — see memory).
- Favour migration mapping: `cost = paymentsSum || confirmed || budgeted`, `bought = paymentsSum > 0`.
- Keep: payments popover, vendor link select + chips, drag-reorder, target form, add/remove actions, derived read-only rules.
- Palette: sage `#6f7d59`, tan `#c2a18a`, lilac `#7e74a8`, rose `#c08a86`, terra `#b05c3f`, rule `#cbbd9e` for chart series.

---

### Task 1: Migration 0019 + sections/seed cleanup

**Files:** `drizzle/0019_deprecate_favours.sql` (new), `drizzle/meta/_journal.json` (idx 19), `src/lib/server/db/data.ts` (BUDGET_SECTIONS, SEED_BUDGET).

- [ ] Migration SQL:

```sql
INSERT INTO `shopping_items` (`label`, `qty`, `cost`, `bought`, `notes`, `sort`)
SELECT bl.`category`, 1,
	CASE WHEN COALESCE(p.total, 0) > 0 THEN p.total
	     WHEN bl.`confirmed` > 0 THEN bl.`confirmed`
	     ELSE bl.`budgeted` END,
	CASE WHEN COALESCE(p.total, 0) > 0 THEN 1 ELSE 0 END,
	'Moved from Budget · Favours',
	900 + bl.`sort`
FROM `budget_lines` bl
LEFT JOIN (SELECT `budget_line_id`, SUM(`amount`) AS total FROM `payments` GROUP BY `budget_line_id`) p
	ON p.`budget_line_id` = bl.`id`
WHERE bl.`section` = 'Favours';
--> statement-breakpoint
DELETE FROM `payments` WHERE `budget_line_id` IN (SELECT `id` FROM `budget_lines` WHERE `section` = 'Favours');
--> statement-breakpoint
DELETE FROM `budget_lines` WHERE `section` = 'Favours';
```

- [ ] `data.ts`: drop `'Favours'` from `BUDGET_SECTIONS` (and the type union if literal), delete the Favours row from `SEED_BUDGET`.
- [ ] Run `npm run db:migrate` locally; verify favour lines gone, shopping items added.
- [ ] Commit: `feat(budget): deprecate Favours — migrate lines into the shopping list`

### Task 2: Rollup returns shoppingCount

**Files:** `src/lib/server/budget.ts` (+ `shoppingCount: shopping.length` in the return), consumed by Task 3.

- [ ] Commit with Task 3.

### Task 3: Page rebuild

**Files:** `src/routes/dashboard/budget/+page.server.ts` (pass `shoppingCount` through), `src/routes/dashboard/budget/+page.svelte` (rebuild).

Component derivations (all from `data.lines` / `data.totals`):
- `venueLine` = link.type 'venue'; `shoppingLine` = link.type 'shopping'; `gridLines` = the rest.
- Areas = `[{label:'Venue', budgeted: venueLine.budgeted||confirmed, confirmed, paid}, ...sections (grid lines grouped), {label:'Shopping', ...}]` — donut uses earmarked (budgeted, falling back to confirmed when budgeted is 0), bars use confirmed/budgeted.
- Money bar: `total = max(target, totals.confirmed, totals.budgeted)`; segments paid, confirmed−paid, budgeted−confirmed (all clamped ≥ 0), widths as % of total.
- Over/under: `diff = totals.budgeted − target` → card 5 label/colour.
- Donut: SVG circle segments via `stroke-dasharray`/`stroke-dashoffset` on a 2πr circumference; centre text `£{Math.round(totals.budgeted/1000)}k` earmarked.
- Synced cards: venue (confirmed/paid + inline-editable budgeted via `saveField(venueId,'budgeted',…)`, "Open Venue →"), shopping (confirmed/paid/budgeted + "{shoppingCount} items — live from Shopping", "Open Shopping →").
- Section cards: per `data.sections` (skip empty AND non-seed sections? No — render all sections so add-row is available), header totals, rows as today minus venue/shopping, keeping paybtn/expander, chip, linksel, compact section select, ×, drag handlers, add form.
- [ ] `npm run check` 0 errors, tests green, manual screenshot-level review.
- [ ] Commit: `feat(budget): dashboard view — stat cards, money bar, area donut, synced source cards`

### Task 4: Verification + prod notes

- [ ] `npm run check && npm test && npm run build` all clean.
- [ ] Manual: totals equal Overview; favours appear in Shopping (incl. bought £15.80 item); venue/shopping cards live-update.
- [ ] Remind user: run migration on prod after push (or run it if asked).

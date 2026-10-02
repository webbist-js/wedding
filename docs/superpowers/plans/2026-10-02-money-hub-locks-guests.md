# Money Hub, Lock Toggles, Guests + Invites Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Budget page the single money hub (suppliers belong to budget lines), add a reusable lock toggle, fix the misleading venue "RSVP confirmed" card, and fold Invites into Guests — without deleting any production rows.

**Architecture:** Invert the supplier↔line relationship (`vendors.budget_line_id`), derive line figures from all attached suppliers in the one rollup (`effectiveBudget`), and render suppliers through one `SupplierCard` component used by both the Budget expander and a pipeline-style Suppliers page. Locks are a per-row boolean enforced server-side (423) and rendered by one `LockToggle`. Invites become an `InvitePanel` inside each household card.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Drizzle ORM over libSQL (Turso in prod, `local.db` locally), Vitest, hand-written SQL migrations (drizzle-kit generate is broken — see memory `drizzle-snapshots-stale`).

## Global Constraints

- Never run `npm run db:generate`. Hand-write `drizzle/0023_suppliers_lines_locks.sql` and append to `drizzle/meta/_journal.json` (idx 23, version "6", breakpoints true).
- No production row is deleted. Data fixes are `UPDATE`s guarded so they are idempotent.
- Money semantics unchanged: committed = `depositPaid || stage === 'Booked'`; `gbp()` for every figure.
- Locked rows: server returns `error(423, 'locked')` for any field other than the lock.
- Routes: `/dashboard/vendors` → 301 `/dashboard/suppliers`; `/dashboard/invites` → 301 `/dashboard/guests`.
- Commit messages: no Co-Authored-By lines (user CLAUDE.md).
- Baseline before starting: `npm test` 63 passing, `npm run check` 0 errors / 22 warnings.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/server/db/schema.ts` | `vendors.budgetLineId`, `vendors.locked`, `budgetLines.locked`, `quoteLines.locked` (renamed), drop `budgetLines.vendorId` |
| `drizzle/0023_suppliers_lines_locks.sql` + `_journal.json` | migration |
| `src/lib/server/db/data.ts`, `seed.ts` | `SeedQuoteLine.locked` (renamed from `confirmed`) |
| `src/lib/money.ts` | + `lineConfirmed`, `lineCommitted` |
| `src/lib/attention.ts` (new) | `budgetAttention()` pure |
| `src/lib/venue-compare.ts` (new) | `describeBasis()` pure |
| `src/lib/server/budget.ts` | rollup: suppliers per line, locked, unassigned |
| `src/routes/dashboard/budget/line/+server.ts` | locked guard, drop vendorId |
| `src/routes/dashboard/budget/+page.server.ts` | remove guard + supplier detach |
| `src/routes/dashboard/suppliers/**` (git mv from vendors) | page server, edit endpoint |
| `src/routes/dashboard/vendors/+page.server.ts` | redirect only |
| `src/routes/dashboard/venue/quote/+server.ts` | `locked` field + `venueLocked` setting + guards |
| `src/lib/components/LockToggle.svelte` (new) | padlock button |
| `src/lib/components/PaymentsLedger.svelte` (new) | payments list/add/remove |
| `src/lib/components/SupplierCard.svelte` (new) | supplier editing card |
| `src/lib/components/budget/BudgetCharts.svelte` (new) | money bar + donut + vs bars |
| `src/lib/components/budget/AttentionStrip.svelte` (new) | attention list |
| `src/lib/components/budget/BudgetLineRow.svelte` (new) | row + menu + expander |
| `src/routes/dashboard/budget/+page.svelte` | composes the above |
| `src/routes/dashboard/suppliers/+page.svelte` | pipeline view |
| `src/routes/dashboard/venue/+page.svelte` | compare strip copy, padlocks, header lock |
| `src/lib/components/InvitePanel.svelte` (new) | QR/link/message panel |
| `src/routes/dashboard/guests/+page.svelte`, `edit/+server.ts`, `qr/+server.ts` | merged guests page |
| `src/routes/dashboard/invites/+page.server.ts` | redirect only; delete `+page.svelte`, `message/`, `qr/` |
| `src/routes/dashboard/+layout.svelte` | nav regroup + META |
| `src/lib/notes.ts`, `src/lib/server/slack.ts` callers, `src/routes/dashboard/+page.svelte` | `/dashboard/suppliers` links |
| `scripts/prod-data-fixes/2026-10-02-link-suppliers.sql` (new) | one-off prod data fix |
| `tests/money.test.ts`, `tests/attention.test.ts`, `tests/venue-compare.test.ts` | pure tests |

---

### Task 1: Schema + migration 0023

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0023_suppliers_lines_locks.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/lib/server/db/data.ts` (`SeedQuoteLine.confirmed` → `locked`), `src/lib/server/db/seed.ts`

**Produces:** `vendors.budgetLineId: number | null`, `vendors.locked: boolean`, `budgetLines.locked: boolean`, `quoteLines.locked: boolean`; `budgetLines.vendorId` gone.

- [ ] **Step 1: Edit schema**

```ts
// budgetLines: remove vendorId line; add
locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
// vendors: add
budgetLineId: integer('budget_line_id').references(() => budgetLines.id),
locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
// quoteLines: rename
locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
```
Because `vendors` now references `budgetLines`, declare `budgetLines` before `vendors` in the file.

- [ ] **Step 2: Write migration**

```sql
ALTER TABLE `vendors` ADD `budget_line_id` integer REFERENCES budget_lines(id);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `locked` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `locked` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `quote_lines` RENAME COLUMN `confirmed` TO `locked`;
--> statement-breakpoint
UPDATE `vendors` SET `budget_line_id` = (SELECT `id` FROM `budget_lines` WHERE `budget_lines`.`vendor_id` = `vendors`.`id`) WHERE `budget_line_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `budget_lines` DROP COLUMN `vendor_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueLocked', '0');
```
Journal entry: `{ "idx": 23, "version": "6", "when": 1782329436101, "tag": "0023_suppliers_lines_locks", "breakpoints": true }`.

- [ ] **Step 3: Rename seed field** `confirmed` → `locked` in `SeedQuoteLine`, `SEED_QUOTE`, and the `quoteLines` insert in `seed.ts`.
- [ ] **Step 4: Run** `npm run db:migrate` against `local.db`; check `sqlite3 local.db "pragma table_info(vendors)"` shows `budget_line_id`, `locked`; `budget_lines` has no `vendor_id`; `quote_lines` has `locked`.
- [ ] **Step 5: Commit** `schema: suppliers belong to budget lines; lock flags; migration 0023`

### Task 2: Pure money helpers (TDD)

**Files:** `src/lib/money.ts`, `tests/money.test.ts`

**Produces:**
```ts
export interface LineSupplierMoney extends VendorMoney {}
export function lineConfirmed(suppliers: VendorMoney[]): number   // Σ linkedConfirmed
export function lineCommitted(suppliers: Pick<VendorMoney,'stage'|'depositPaid'>[]): boolean
```

- [ ] Tests: sums only committed quotes; empty → 0; committed if any committed.
- [ ] Implement; `npm test`; commit `money: line-level confirmed/committed over several suppliers`.

### Task 3: `attention.ts` (TDD)

**Produces:**
```ts
export interface AttentionLine { id: number; category: string; budgeted: number; confirmed: number;
  suppliers: { id: number; name: string | null; category: string; stage: string; quotedAmount: number | null; depositPaid: boolean }[] }
export interface AttentionItem { kind: 'no-quote' | 'unassigned' | 'over-budget' | 'stage-mismatch'; label: string; href: string }
export function budgetAttention(lines: AttentionLine[], unassigned: AttentionLine['suppliers']): AttentionItem[]
```
Rules: committed supplier with `quotedAmount == null` → `no-quote` (href `/dashboard/budget#line-<id>`); each unassigned → `unassigned` (href `/dashboard/suppliers#supplier-<id>`); `confirmed > budgeted && budgeted > 0` → `over-budget`; `depositPaid && stage !== 'Booked'` → `stage-mismatch`. Order: no-quote, over-budget, stage-mismatch, unassigned.

- [ ] Tests for each rule + ordering; implement; commit `budget: pure attention rules`.

### Task 4: `venue-compare.ts` (TDD)

**Produces:**
```ts
export function describeBasis(r: QuoteResult, heads: Headcounts, min: number):
  { noGuests: boolean; topup: number; floor: number }   // floor = min + r.bond
```
- [ ] Tests: zero heads → noGuests true, floor = min+bond; nonzero heads below min → topup>0; above min → topup 0. Commit `venue: pure basis description`.

### Task 5: Rollup rewrite

**Files:** `src/lib/server/budget.ts`

**Produces:**
```ts
export interface LineSupplier { id: number; name: string | null; category: string; stage: string;
  quotedAmount: number | null; depositAmount: number | null; depositPaid: boolean; locked: boolean; committed: boolean }
export interface EffectiveLine { ...existing minus vendor link; locked: boolean; suppliers: LineSupplier[];
  link: null | { type: 'venue' } | { type: 'shopping' } }
effectiveBudget(): { lines, totals, target, basis, headcounts, shoppingCount, unassigned: LineSupplier[] }
```
- [ ] Group vendors by `budgetLineId`; payments for a line = `budgetLineId === l.id || (vendorId ∈ lineSupplierIds && budgetLineId == null)`; non-venue line with suppliers → `confirmed = lineConfirmed`, `status = derivedStatus(confirmed, paid, lineCommitted)`, `editable = false`; venue line keeps calculator figure but still carries its suppliers. `unassigned` = vendors with null `budgetLineId`.
- [ ] `npm run check` clean for this file; commit `budget: rollup derives lines from attached suppliers`.

### Task 6: Budget endpoints

- [ ] `budget/line/+server.ts`: fields `budgeted|confirmed|category|status|section|locked`; load row; if `row.locked && field !== 'locked'` → `error(423, 'locked')`; derived guard unchanged (`suppliers.length > 0 || sourceType` blocks confirmed/status — fetch supplier count via `vendors.budgetLineId`); `locked` → `{ locked: !!value }`.
- [ ] `budget/+page.server.ts` `remove`: load line; if locked → return `fail(423)`; `UPDATE vendors SET budget_line_id = NULL WHERE budget_line_id = id`; delete line payments; delete line. `add` unchanged.
- [ ] Commit `budget: lock guard, supplier detach on remove`.

### Task 7: Suppliers routes (rename + behaviour)

- [ ] `git mv src/routes/dashboard/vendors src/routes/dashboard/suppliers`; create `src/routes/dashboard/vendors/+page.server.ts` with `throw redirect(301, '/dashboard/suppliers')`.
- [ ] `suppliers/+page.server.ts` load: vendors, appointments, notes, payments **and** `lines: { id, category, section }[]` (for assign select). Actions: `add` reads optional `budgetLineId`; if given, category defaults to the line's category; `remove`: detach appointments; if `vRow.budgetLineId` and it is the only supplier on that line → `UPDATE budget_lines SET confirmed = linkedConfirmed(vRow)` ; `UPDATE payments SET vendor_id = NULL, budget_line_id = vRow.budgetLineId WHERE vendor_id = id`; delete.
- [ ] `suppliers/edit/+server.ts`: add `budgetLineId` (null or existing line id → 400 if missing) and `locked` (bool). Guard: `prev.locked && field !== 'locked'` → 423. `depositPaid` true → `set.stage = 'Booked'` as well. Slack `dashboardUrl` → `/dashboard/suppliers`.
- [ ] `src/lib/notes.ts` `vendor.href` → `/dashboard/suppliers`; `src/routes/dashboard/+page.svelte` "All suppliers →" → `/dashboard/suppliers`.
- [ ] Commit `suppliers: route rename, assign-to-line, lock guard, deposit implies booked`.

### Task 8: Venue quote endpoint locks

- [ ] `SETTING_KEYS` unchanged; new branch `body.setting === 'venueLocked'` → store `'1'|'0'`. Load settings `venueLocked`; if `'1'` and `body.setting` is any other key (incl. `venueCostBasis`) → 423.
- [ ] Field `locked` replaces `confirmed` handling (`{ locked: !!value }`). For `label|scope|meal|price|qty|bond` and `op === 'remove'`: load line; if `locked` → 423.
- [ ] Commit `venue: lock quote lines and header settings`.

### Task 9: Shared components

- [ ] `LockToggle.svelte` props `{ locked: boolean; onToggle: (next: boolean) => void; label?: string; size?: number }`; `<button type="button" class="lock" class:locked aria-pressed={locked} title=…>` with two SVG paths (closed/open padlock). Styles: 26px round, faint when open, sage-soft/sage-deep when locked.
- [ ] `PaymentsLedger.svelte` props `{ payments: {id, amount, paidOn, note}[]; attach: { vendorId: number } | { budgetLineId: number }; disabled?: boolean }`; posts to `/dashboard/budget/payments` then `invalidateAll()`. Markup/styles lifted from the vendor card `.payments` block.
- [ ] `SupplierCard.svelte` props `{ supplier: Vendor; payments; appointments; notes: NoteRow[]; lineOptions: {id, category, section}[]; showLine?: boolean; compact?: boolean }`. Contains: header (category input, name input, stage pill-select, Chosen badge, LockToggle, remove form), assign-to-line select (`budgetLineId`, "— unassigned —" + lines grouped by section) shown when `showLine`, contact grid, deposit-paid checkbox, `PaymentsLedger attach={{ vendorId }}`, appointment chips + Book appointment, Notes. All inputs `disabled={supplier.locked}` except lock + remove hidden when locked. Saves via `/dashboard/suppliers/edit`; `invalidateAll()` after `depositPaid`, `budgetLineId`, `locked`, `stage`.
- [ ] Commit `components: LockToggle, PaymentsLedger, SupplierCard`.

### Task 10: Budget page

- [ ] `BudgetCharts.svelte` props `{ target, earmark, confirmed, paid, areas: {label, budgeted, confirmed}[] }` — moves the money bar, donut and vs-bars markup + styles out of the page unchanged.
- [ ] `AttentionStrip.svelte` props `{ items: AttentionItem[] }` — terra-tinted card, one row per item with kind pill and link; renders nothing when empty.
- [ ] `BudgetLineRow.svelte` props `{ line: EffectiveLine; sections: string[]; lineOptions; payments; appointments; notes; expanded: boolean; onToggle: () => void }`. Grid: grip · category (+ supplier chips: name + `Pill` by stage) · budgeted · confirmed · paid button · status · menu button (⋯) · chevron. Menu (absolutely positioned card): Move to… (section list), Add supplier, Lock/Unlock, Remove. Locked → inputs disabled, padlock shown next to category. Expander: two columns — suppliers (`SupplierCard compact` each + "+ Add supplier" form posting `?/addSupplier`? → simpler: `fetch('/dashboard/suppliers?/add')` is awkward; add a `budget/+page.server.ts` action `addSupplier` that inserts a vendor with `budgetLineId`, category = line.category, stage Lead) and `PaymentsLedger attach={{ budgetLineId }}` for manual lines (for lines with suppliers the per-supplier ledgers already appear; still show line-level payments if any).
- [ ] `+page.server.ts` load adds `suppliers` (all vendors), `appointments`, `notes` (entity vendor), `payments`, `lineOptions`, `attention = budgetAttention(...)`; adds action `addSupplier`.
- [ ] `+page.svelte` composes: stats · BudgetCharts · AttentionStrip · synced cards (venue card gets a disclosure listing its SupplierCards) · sections → `BudgetLineRow` with `id="line-{id}"`; expansion state `openId`; `location.hash` on mount opens and scrolls to `#line-N`.
- [ ] Commit `budget: hub layout — expandable rows, supplier cards, attention strip`.

### Task 11: Suppliers page UI

- [ ] Stats: counts by stage + `gbp(Σ linkedConfirmed)` committed. Groups in order Booked, Shortlisted, Quoted, Enquired, Lead, then Unassigned (null line, shown last with a terra kicker). Each `SupplierCard showLine` wrapped in `<div id="supplier-{id}">`; header line "for **{line.category}** → " linking `/dashboard/budget#line-{id}` or "Unassigned". "+ Add supplier" form (`?/add`, no line).
- [ ] Commit `suppliers: pipeline view by stage reusing SupplierCard`.

### Task 12: Venue page UI

- [ ] Compare strip: for each basis compute `describeBasis(result, heads, min)`. Confirmed card when `noGuests`: big text "No replies yet", sub "Floor if nobody came: {gbp(floor)} = {gbp(min)} min. spend + {gbp(bond)} bond". Otherwise figure + sub "{day} day · {eve} eve{veg ? ` · ${veg} veg` : ''}" and, when `topup > 0`, "incl. {gbp(topup)} min-spend top-up". Original card sub "80 covers".
- [ ] Rows: replace `.confirm` badge with `<LockToggle locked={line.locked} onToggle=…>` at the start of `.acts`; always visible when locked. `disabled={line.locked}` on label/scope/meal/price/qty/bond; hide remove when locked; grip disabled when locked (`draggable={!line.locked}`).
- [ ] Header: `venueLocked` from load (`settings.venueLocked === '1'`); LockToggle beside the basis select; all header controls `disabled={venueLocked}`; Reset hidden when locked; `.auto` copy becomes "Locked — venue terms are set" when locked.
- [ ] `+page.server.ts` returns `venueLocked`.
- [ ] Commit `venue: honest compare cards, padlocks on quote rows and header`.

### Task 13: Guests absorbs Invites

- [ ] `guests/edit/+server.ts`: `GROUP_CONTACT` gains `personalMessage` (trim, null when empty; not seed-owned).
- [ ] `git mv src/routes/dashboard/invites/qr src/routes/dashboard/guests/qr`; add `size` param: `const size = Math.min(2048, Math.max(96, Number(url.searchParams.get('size') ?? 1024) || 1024))`.
- [ ] `InvitePanel.svelte` props `{ id: number; token: string; name: string; personalMessage: string | null; base: string }`: `<img loading="lazy" src="/dashboard/guests/qr?token={token}&size=180" alt="QR code for {name}">`, link text (origin stripped) + Copy + Download QR (`download="qr-{slug}.png"`, slug computed in component), textarea saving `personalMessage` via `/dashboard/guests/edit` `{ kind: 'group', field: 'personalMessage' }`.
- [ ] `guests/+page.server.ts` returns `base = env.PUBLIC_BASE_URL || url.origin`.
- [ ] `guests/+page.svelte`: filter pills `All | Awaiting | Replied | Declined` (`status` state; Awaiting = any pending member; Replied = all non-pending; Declined = all 'no'); household body → `.h-body` grid `1.4fr 1fr`: contact fields left, `InvitePanel` right. Remove the token link from the header (panel has it).
- [ ] Delete `invites/+page.svelte`, `invites/message/`; `invites/+page.server.ts` → `throw redirect(301, '/dashboard/guests')`.
- [ ] `+layout.svelte` NAV: Money → Budget, Suppliers, Venue, Shopping; Guests → Guests, Seating; remove Vendors/Invites; META `/dashboard/suppliers`, `/dashboard/guests` subtitle "Households, invites, contacts & RSVPs"; remove `/dashboard/vendors`, `/dashboard/invites`.
- [ ] Commit `guests: fold invites into household cards; nav regroup`.

### Task 14: Production migration + data fix

- [ ] `DATABASE_URL=$TURSO_URL DATABASE_AUTH_TOKEN=$TURSO_TOKEN npm run db:migrate`.
- [ ] Create `scripts/prod-data-fixes/2026-10-02-link-suppliers.sql`:

```sql
UPDATE vendors SET budget_line_id = 1  WHERE id = 1  AND budget_line_id IS NULL;
UPDATE vendors SET budget_line_id = 15 WHERE id = 6  AND budget_line_id IS NULL;
UPDATE vendors SET budget_line_id = 3  WHERE id = 11 AND budget_line_id IS NULL;
UPDATE vendors SET budget_line_id = 9  WHERE id = 7  AND budget_line_id IS NULL;
UPDATE vendors SET budget_line_id = 20 WHERE id = 10 AND budget_line_id IS NULL;
UPDATE vendors SET budget_line_id = 18 WHERE id = 13 AND budget_line_id IS NULL;
UPDATE vendors SET quoted_amount = 2750 WHERE id = 3 AND quoted_amount IS NULL;
UPDATE budget_lines SET category = 'Music / DJ' WHERE id = 15 AND category = 'Dae La Roux';
UPDATE vendors SET stage = 'Booked' WHERE deposit_paid = 1 AND stage <> 'Booked';
```
Run each statement through the libsql client; then verify: `select id, budget_line_id, stage, quoted_amount from vendors` and recompute totals via a one-off call to `effectiveBudget()` (expect confirmed ≈ 29,994.06 on the estimate basis).
- [ ] Commit `data: prod supplier links script (applied 2026-10-02)`.

### Task 15: Verification + docs + memory

- [ ] `npm test` green; `npm run check` 0 errors; `npm run build` succeeds.
- [ ] DEPLOY.md note: migrations now up to `0023`; README dashboard list: Suppliers, Guests incl. invites.
- [ ] Update memory `drizzle-snapshots-stale` (0023 also hand-written) — only if content changes.
- [ ] Final commit `docs: deploy notes for migration 0023`.

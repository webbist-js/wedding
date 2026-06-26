# Notes authorship, vendor CRM & per-user auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the wedding dashboard two pseudo-user logins (Alex, Katie), attribute & comment on notes, log every write to an Activity feed, and turn "suppliers" into a vendor mini-CRM — with a data-preserving migration.

**Architecture:** SvelteKit + Drizzle (libSQL/Turso). Identity lives in a `users` table; the session cookie carries a user slug. A single `recordAudit` helper writes to an `audit_log` table from every mutation path. The `suppliers` table is renamed to `vendors` and gains CRM columns; "supplier" becomes the derived state of a vendor whose deposit is paid. All schema + data changes ship in one hand-authored SQL migration run by `npm run db:migrate`.

**Tech Stack:** SvelteKit 2 / Svelte 5 (runes), Drizzle ORM, libSQL (`@libsql/client`), Turso (prod), Vitest, Node crypto (scrypt/HMAC).

## Global Constraints

- Database dialect is `turso`; migrations live in `drizzle/` and run via `npm run db:migrate` (drizzle-kit). Local DB is `file:./local.db`; prod is Turso via `DATABASE_URL` + `DATABASE_AUTH_TOKEN`. — copied from `drizzle.config.ts`.
- Never wipe & recreate tables holding data. Renames use `ALTER TABLE … RENAME`, never drop+create. — from spec §5.
- Svelte 5 runes only (`$props`, `$state`, `$derived`, `$effect`). Match existing component style.
- No `Co-Authored-By` / self-credit lines in commit messages. — user global instruction.
- Passcode hashes stay in env vars (`PASSCODE_HASH_ALEX`, `PASSCODE_HASH_KATIE`); the DB never stores secrets. — spec §1.
- Pseudo-users are `alex` (name "Alex") and `katie` (name "Katie"). — spec §1.
- Vendor pipeline stages, exact strings: `Lead | Enquired | Quoted | Shortlisted | Booked`. — spec §4.
- Status→stage mapping: `booked→Booked + depositPaid=true`, `short→Shortlisted`, `todo→Lead`. — spec §4.
- Work happens on branch `feat/notes-vendors-auth` (already created).
- Run tests with `npm test`; type/Svelte check with `npm run check`.

---

## File Structure

**Create:**
- `src/lib/server/users.ts` — pseudo-user config + `resolvePasscodeSlug` (passcode→slug, pure/testable).
- `src/lib/server/audit.ts` — `recordAudit(locals, entry)` server helper.
- `src/lib/audit.ts` — client-safe audit vocabulary + `formatAuditLine` (pure/testable).
- `drizzle/0015_vendors_notes_audit.sql` — the one migration (rename + columns + new tables + data map + seed users).
- `src/routes/dashboard/vendors/+page.server.ts` + `+page.svelte` — moved/renamed from `suppliers/`.
- `src/routes/dashboard/vendors/edit/+server.ts` — field-level autosave (renamed from `suppliers/edit`).
- `src/routes/dashboard/activity/+page.server.ts` + `+page.svelte` — the Activity feed.
- `tests/users.test.ts`, `tests/audit.test.ts` — unit tests for the new pure helpers.

**Modify:**
- `src/lib/server/auth.ts` (+ `tests/auth.test.ts`) — session carries a slug.
- `src/lib/server/db/schema.ts` — `users`, `vendors` (renamed + columns), `note_comments`, `audit_log`, notes author columns, appointments `vendorId`.
- `src/lib/server/db/data.ts`, `seed.ts` — `SEED_VENDORS` shape + insert.
- `src/lib/notes.ts` — `ENTITY_KINDS.supplier` → `vendor`.
- `src/lib/server/slack.ts` — `notifySupplierBooked` heading/copy stays; called on deposit-paid transition.
- `src/hooks.server.ts`, `src/app.d.ts`, `src/routes/login/+page.server.ts`, `src/routes/dashboard/+layout.server.ts`, `src/routes/dashboard/+layout.svelte` — identity wiring + "Signed in as".
- `src/lib/components/Notes.svelte` — author line + comments thread.
- `src/routes/dashboard/notes/+page.server.ts`, `notes/edit/+server.ts` — author + comment ops + joins.
- `src/routes/dashboard/calendar/+page.server.ts` — `suppliers`→`vendors`, `supplierId`→`vendorId`.
- All mutation endpoints — add `recordAudit` calls (Task 8).
- `.env.example`, `DEPLOY.md`, `package.json` — vars, run order, (no new scripts needed).

---

## Task 1: Session cookie carries a user slug

**Files:**
- Modify: `src/lib/server/auth.ts:18-32`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Produces: `signSession(secret: string, slug: string): string`; `verifySession(token: string | undefined, secret: string): { slug: string } | null`.

- [ ] **Step 1: Update the failing tests** in `tests/auth.test.ts` — replace the `session cookie` describe block:

```ts
describe('session cookie', () => {
	it('round-trips a valid signed token and returns the slug', () => {
		const token = signSession(SECRET, 'alex');
		expect(verifySession(token, SECRET)).toEqual({ slug: 'alex' });
	});
	it('rejects a tampered token', () => {
		const token = signSession(SECRET, 'alex') + 'x';
		expect(verifySession(token, SECRET)).toBeNull();
	});
	it('rejects a token signed with a different secret', () => {
		const token = signSession(SECRET, 'katie');
		expect(verifySession(token, 'other')).toBeNull();
	});
	it('returns null for a missing token', () => {
		expect(verifySession(undefined, SECRET)).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests, expect failure**

Run: `npm test -- auth`
Expected: FAIL (signSession takes 1 arg / verifySession returns boolean).

- [ ] **Step 3: Implement the new signatures** — replace lines 17-32 of `src/lib/server/auth.ts`:

```ts
// Session cookie value is "slug.issuedAt.signature". Verifies integrity and
// returns the signed-in user's slug (not expiry-by-default).
export function signSession(secret: string, slug: string): string {
	const payload = `${slug}.${Date.now()}`;
	const sig = createHmac('sha256', secret).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string): { slug: string } | null {
	if (!token) return null;
	const cut = token.lastIndexOf('.');
	if (cut < 0) return null;
	const payload = token.slice(0, cut);
	const sig = token.slice(cut + 1);
	const [slug, issuedAt] = payload.split('.');
	if (!slug || !issuedAt) return null;
	const expected = createHmac('sha256', secret).update(payload).digest('base64url');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	return { slug };
}
```

- [ ] **Step 4: Run the tests, expect pass**

Run: `npm test -- auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/auth.ts tests/auth.test.ts
git commit -m "feat(auth): session token carries a user slug"
```

---

## Task 2: Passcode → user resolution helper

**Files:**
- Create: `src/lib/server/users.ts`
- Test: `tests/users.test.ts`

**Interfaces:**
- Consumes: `verifyPasscode`, `hashPasscode` from `src/lib/server/auth.ts`.
- Produces: `PSEUDO_USERS: { slug: string; name: string }[]`; `resolvePasscodeSlug(passcode: string, hashes: Record<string, string | undefined>): Promise<string | null>`.

- [ ] **Step 1: Write the failing test** in `tests/users.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPasscode } from '../src/lib/server/auth';
import { resolvePasscodeSlug, PSEUDO_USERS } from '../src/lib/server/users';

describe('resolvePasscodeSlug', () => {
	it('returns the slug whose hash matches', async () => {
		const hashes = {
			alex: await hashPasscode('alex-secret'),
			katie: await hashPasscode('katie-secret')
		};
		expect(await resolvePasscodeSlug('katie-secret', hashes)).toBe('katie');
		expect(await resolvePasscodeSlug('alex-secret', hashes)).toBe('alex');
	});
	it('returns null when nothing matches', async () => {
		const hashes = { alex: await hashPasscode('alex-secret') };
		expect(await resolvePasscodeSlug('nope', hashes)).toBeNull();
	});
	it('ignores users with no configured hash', async () => {
		expect(await resolvePasscodeSlug('anything', { alex: undefined, katie: undefined })).toBeNull();
	});
	it('lists exactly the two pseudo-users', () => {
		expect(PSEUDO_USERS.map((u) => u.slug)).toEqual(['alex', 'katie']);
	});
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- users`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/server/users.ts`:

```ts
import { verifyPasscode } from './auth';

// The two pseudo-users. Identity only — passcode hashes live in env
// (PASSCODE_HASH_ALEX / PASSCODE_HASH_KATIE), never in the DB.
export interface PseudoUser {
	slug: string;
	name: string;
}

export const PSEUDO_USERS: PseudoUser[] = [
	{ slug: 'alex', name: 'Alex' },
	{ slug: 'katie', name: 'Katie' }
];

// Return the slug whose stored hash matches the passcode, or null. `hashes` is
// keyed by slug so callers inject env values without this module touching $env.
export async function resolvePasscodeSlug(
	passcode: string,
	hashes: Record<string, string | undefined>
): Promise<string | null> {
	for (const u of PSEUDO_USERS) {
		const hash = hashes[u.slug];
		if (hash && (await verifyPasscode(passcode, hash))) return u.slug;
	}
	return null;
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `npm test -- users`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/users.ts tests/users.test.ts
git commit -m "feat(auth): passcode-to-user resolution helper"
```

---

## Task 3: Schema + the single data-preserving migration

This is the migration centrepiece. It updates the Drizzle schema to the final shape and ships ONE hand-authored SQL migration that renames `suppliers`→`vendors`, adds all new columns/tables, maps old data, and seeds the two users — then applies it to `local.db`.

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0015_vendors_notes_audit.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/lib/notes.ts:32-38`

**Interfaces:**
- Produces (Drizzle tables consumed by later tasks): `users { id, slug, name }`; `vendors { id, category, name, contact, phone, email, website, address, stage, quotedAmount, depositAmount, depositPaid, followUpDate, priority, description, notes, sort }`; `noteComments { id, noteId, authorId, body, createdAt, updatedAt }`; `auditLog { id, userId, action, entity, entityId, summary, createdAt }`; `notes` gains `authorId`, `lastEditedById`; `appointments.vendorId`.

- [ ] **Step 1: Replace the `suppliers` table** in `schema.ts:77-85` with `vendors`:

```ts
export const vendors = sqliteTable('vendors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  name: text('name'),
  // Freeform legacy contact line, kept alongside the structured fields below.
  contact: text('contact'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  address: text('address'),
  // CRM pipeline: Lead | Enquired | Quoted | Shortlisted | Booked.
  stage: text('stage').notNull().default('Lead'),
  quotedAmount: real('quoted_amount'),
  depositAmount: real('deposit_amount'),
  // The "chosen supplier" tickbox: deposit paid => this is a booked supplier.
  depositPaid: integer('deposit_paid', { mode: 'boolean' }).notNull().default(false),
  followUpDate: text('follow_up_date'), // ISO YYYY-MM-DD
  priority: integer('priority').notNull().default(2), // 1 high … 3 low
  description: text('description'),
  notes: text('notes'),
  sort: integer('sort').notNull().default(0)
});
```

- [ ] **Step 2: Update `appointments`** — change the FK column (`schema.ts:96`) from `supplierId` to `vendorId`:

```ts
  vendorId: integer('vendor_id').references(() => vendors.id),
```

- [ ] **Step 3: Add author columns to `notes`** — inside the `notes` table definition (after `updatedAt`, `schema.ts:185`):

```ts
  authorId: integer('author_id').references(() => users.id),
  lastEditedById: integer('last_edited_by_id').references(() => users.id)
```

- [ ] **Step 4: Append the new tables** at the end of `schema.ts`:

```ts
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(), // 'alex' | 'katie'
  name: text('name').notNull()
});

export const noteComments = sqliteTable('note_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').notNull().references(() => notes.id),
  authorId: integer('author_id').references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
});

// Append-only log of dashboard mutations, surfaced on the Activity page.
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id), // null = system/cron
  action: text('action').notNull(), // 'create' | 'update' | 'delete'
  entity: text('entity').notNull(), // 'vendor' | 'note' | 'comment' | …
  entityId: integer('entity_id'),
  summary: text('summary').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
});
```

Note: `users` is referenced by `notes`/`noteComments`/`auditLog` above but declared after them — Drizzle resolves the `() => users.id` thunks lazily, so declaration order does not matter.

- [ ] **Step 5: Update `src/lib/notes.ts`** — rename the `supplier` entity kind to `vendor` (lines 32-38). Replace the `supplier` line in `ENTITY_KINDS`:

```ts
	vendor: { label: 'Vendor', category: 'Suppliers', href: '/dashboard/vendors' },
```

Keep the `category: 'Suppliers'` note-section label as-is for now (note categories are a separate vocabulary; renaming that section is out of scope).

- [ ] **Step 6: Hand-author the migration** `drizzle/0015_vendors_notes_audit.sql`. Statements are separated by `--> statement-breakpoint` (Drizzle convention). Order matters: create `users` before any FK references it; map status before dropping it.

```sql
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_slug_unique` ON `users` (`slug`);
--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`slug`, `name`) VALUES ('alex', 'Alex'), ('katie', 'Katie');
--> statement-breakpoint
ALTER TABLE `suppliers` RENAME TO `vendors`;
--> statement-breakpoint
ALTER TABLE `appointments` RENAME COLUMN `supplier_id` TO `vendor_id`;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `phone` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `email` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `website` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `address` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `stage` text DEFAULT 'Lead' NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `quoted_amount` real;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `deposit_amount` real;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `deposit_paid` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `follow_up_date` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `priority` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `description` text;
--> statement-breakpoint
UPDATE `vendors` SET `stage` = CASE `status`
	WHEN 'booked' THEN 'Booked'
	WHEN 'short' THEN 'Shortlisted'
	ELSE 'Lead' END;
--> statement-breakpoint
UPDATE `vendors` SET `deposit_paid` = 1 WHERE `status` = 'booked';
--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `status`;
--> statement-breakpoint
ALTER TABLE `notes` ADD `author_id` integer REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `notes` ADD `last_edited_by_id` integer REFERENCES users(id);
--> statement-breakpoint
UPDATE `notes` SET `entity_type` = 'vendor' WHERE `entity_type` = 'supplier';
--> statement-breakpoint
CREATE TABLE `note_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer NOT NULL REFERENCES notes(id),
	`author_id` integer REFERENCES users(id),
	`body` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer REFERENCES users(id),
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`summary` text NOT NULL,
	`created_at` integer
);
```

- [ ] **Step 7: Register the migration** in `drizzle/meta/_journal.json` — append to the `entries` array (after idx 14). Use a `when` value one larger than 0014's (1782329436093):

```json
,{
      "idx": 15,
      "version": "6",
      "when": 1782329436093,
      "tag": "0015_vendors_notes_audit",
      "breakpoints": true
    }
```

- [ ] **Step 8: Apply the migration to local.db**

Run: `npm run db:migrate`
Expected: completes without error; output references `0015_vendors_notes_audit`.

- [ ] **Step 9: Verify data preserved + mapped**

Run:
```bash
node -e "const {createClient}=require('@libsql/client'); const c=createClient({url:'file:./local.db'}); (async()=>{ const v=await c.execute('select category,stage,deposit_paid from vendors order by sort limit 3'); console.log(JSON.stringify(v.rows)); const u=await c.execute('select slug,name from users'); console.log(JSON.stringify(u.rows)); const n=await c.execute(\"select count(*) c from notes where entity_type='supplier'\"); console.log('stray supplier notes:',JSON.stringify(n.rows)); })()"
```
Expected: vendors show mapped `stage` (e.g. `Booked` with `deposit_paid` 1 for the Tithe Barn); users list `alex`/`katie`; stray supplier notes count = 0.

- [ ] **Step 10: Type-check**

Run: `npm run check`
Expected: errors ONLY about now-missing `suppliers`/`supplierId`/`status` references in server files (fixed in Tasks 4-8). No schema errors.

- [ ] **Step 11: Commit**

```bash
git add src/lib/server/db/schema.ts src/lib/notes.ts drizzle/0015_vendors_notes_audit.sql drizzle/meta/_journal.json local.db
git commit -m "feat(db): rename suppliers->vendors, add users/comments/audit, migrate data"
```

> **Snapshot note:** the Drizzle meta *snapshot* for 0015 is intentionally not generated (a `drizzle-kit generate` would emit a destructive rename prompt). Migrations apply from `_journal.json` + the `.sql` file, so `db:migrate` is unaffected. The next time someone runs `drizzle-kit generate`, review its output before committing — it may try to re-derive the rename.

---

## Task 4: Update seed data + remaining schema consumers to compile

Bring the seed and the calendar/notes server code onto the new `vendors` shape so the app type-checks and seeds cleanly.

**Files:**
- Modify: `src/lib/server/db/data.ts:33-39, 211-228`
- Modify: `src/lib/server/db/seed.ts:10, 20, 213-224`
- Modify: `src/routes/dashboard/calendar/+page.server.ts`
- Modify: `src/routes/dashboard/notes/+page.server.ts:19-22`

**Interfaces:**
- Produces: `SEED_VENDORS: SeedVendor[]` with `{ category, name?, contact?, stage, depositPaid?, notes? }`.

- [ ] **Step 1: Update the seed interface** in `data.ts:33-39`:

```ts
export interface SeedVendor {
  category: string;
  name?: string;
  contact?: string;
  stage: string;
  depositPaid?: boolean;
  notes?: string;
}
```

- [ ] **Step 2: Rename + remap `SEED_SUPPLIERS`** to `SEED_VENDORS` (`data.ts:211-228`). Map each old `status` to `stage`/`depositPaid` per the constraint:

```ts
export const SEED_VENDORS: SeedVendor[] = [
  { category: 'Venue & Catering', name: 'The Tithe Barn', contact: 'Laura · 01756 631000', stage: 'Booked', depositPaid: true, notes: 'Deposit paid. All food in-house. Dog-friendly.' },
  { category: 'Registrar', name: 'North Yorkshire (Skipton)', contact: 'registrars.skipton@northyorks.gov.uk', stage: 'Booked', depositPaid: true, notes: '£50 deposit · ref 149599481 · ceremony 2.30pm' },
  { category: 'Photographer', name: 'Adam Lowndes', contact: 'hello@adamlowndes.co.uk', stage: 'Booked', depositPaid: true, notes: 'Confirmed' },
  { category: 'Photographer (alt)', name: 'Hamish Irvine', contact: 'info@hamishirvine.com', stage: 'Shortlisted', notes: "Shoots the venue's own gallery" },
  { category: 'Florist', name: 'Bureau Botany / Flowers in my Head / Yorkshire Floral Co', contact: 'hello@bureaubotany.co.uk', stage: 'Shortlisted', notes: 'Shortlist — to book' },
  { category: 'Music / DJ', name: 'Mark Green / Dom Wood', contact: '07865 050212', stage: 'Shortlisted', notes: 'Shortlist — to book' },
  { category: 'Hair & Makeup', name: 'Immy May', contact: 'immymay.co.uk', stage: 'Shortlisted', notes: 'Book + trial' },
  { category: 'Cake', name: 'Little Cake', contact: 'littlecake.co.uk', stage: 'Shortlisted', notes: 'Shortlist' },
  { category: 'Transport', name: 'Yorkshire Wedding Car Co', contact: '—', stage: 'Shortlisted', notes: 'Shortlist' },
  { category: 'Accommodation', name: 'The Devonshire Arms', contact: '01756 718111', stage: 'Shortlisted', notes: 'Guest block-booking' },
  { category: 'Wedding rings', name: "Forge & Lumber (Alex) + Katie's", contact: 'info@forgeandlumber.com', stage: 'Booked', depositPaid: true, notes: "Alex: £240, size P. Katie's bought. Both complete." },
  { category: 'Confetti', name: 'Wedfetti / Confetti Bee', contact: '—', stage: 'Shortlisted', notes: 'Fresh petals only (venue rule)' },
  { category: 'Dog handler', name: 'Yorkshire Paws & Co', contact: '—', stage: 'Lead', notes: 'Optional — for Bodie' },
  { category: 'Magician', name: 'Oliver Parker (Leeds Magician)', contact: '—', stage: 'Lead', notes: 'Maybe' },
  { category: 'Attire', name: 'Stacees / Azazie (bridesmaids), groomsmen, Bodie outfit', contact: '—', stage: 'Lead', notes: 'Dusty rose theme' },
  { category: 'Stationery / Favours / Décor', name: '—', contact: '—', stage: 'Lead', notes: 'To research' }
];
```

- [ ] **Step 3: Update the seeder** in `seed.ts`. Change the import on line 10 `suppliers,`→`vendors,`; line 20 `SEED_SUPPLIERS,`→`SEED_VENDORS,`; and the insert block (213-224):

```ts
	if ((await db.select().from(vendors).limit(1)).length === 0) {
		for (const [i, v] of SEED_VENDORS.entries()) {
			await db.insert(vendors).values({
				category: v.category,
				name: v.name ?? null,
				contact: v.contact ?? null,
				stage: v.stage,
				depositPaid: v.depositPaid ?? false,
				notes: v.notes ?? null,
				sort: i
			});
		}
	}
```

- [ ] **Step 4: Update the calendar loader** `calendar/+page.server.ts`. Replace `suppliers` with `vendors` in the import (line 3) and everywhere it's used; rename the returned keys so the UI keeps working with minimal churn — keep the property names `supplierId`/`supplierName`/`supplierCategory`/`suppliers` in the returned object but source them from `vendors`/`vendorId`:

```ts
import { appointments, vendors } from '$lib/server/db/schema';
```
In `load`, the select and join become:
```ts
			supplierId: appointments.vendorId,
			supplierName: vendors.name,
			supplierCategory: vendors.category
		})
		.from(appointments)
		.leftJoin(vendors, eq(appointments.vendorId, vendors.id))
		.orderBy(asc(appointments.date), asc(appointments.time));

	const supplierList = await db
		.select({ id: vendors.id, category: vendors.category, name: vendors.name })
		.from(vendors)
		.orderBy(asc(vendors.category));
```
In the `add` action, replace the supplier lookup with `vendors`/`vendorId`:
```ts
		const supplierId = v.supplierId;
		if (supplierId) {
			const [s] = await db
				.select({ category: vendors.category, name: vendors.name })
				.from(vendors)
				.where(eq(vendors.id, supplierId));
			if (s) supplierName = s.name ? `${s.category} · ${s.name}` : s.category;
		}
```
And in `vals`, keep reading the `supplierId` form field but map it to `vendorId` for the insert/update. Update `vals` to return `vendorId`:
```ts
		vendorId: supplierId ? Number(supplierId) : null
```
…and the form field name in `calendar/+page.svelte` stays `supplierId` (the form posts that name; only the DB column changed). Confirm `add`/`update` insert `{ ...v }` now carries `vendorId`.

- [ ] **Step 5: Update the notes loader** `notes/+page.server.ts`. Replace the `suppliers` import (line 3) with `vendors`, and the `supplier` label block (18-23) to key off `vendor`:

```ts
	if (needed.has('vendor')) {
		const s = await db.select({ id: vendors.id, category: vendors.category, name: vendors.name }).from(vendors);
		labels.vendor = Object.fromEntries(
			s.map((r) => [r.id, r.name ? `${r.category} · ${r.name}` : r.category])
		);
	}
```
(Import: `import { notes, vendors, inviteGroups, budgetLines, timelineItems } from '$lib/server/db/schema';`)

- [ ] **Step 6: Type-check**

Run: `npm run check`
Expected: remaining errors ONLY in `dashboard/suppliers/*` (handled by the move in Task 5). No errors in calendar/notes/seed/data.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db/data.ts src/lib/server/db/seed.ts src/routes/dashboard/calendar/+page.server.ts src/routes/dashboard/notes/+page.server.ts
git commit -m "feat(vendors): migrate seed data and calendar/notes consumers to vendors"
```

---

## Task 5: Vendors route + CRM page

Move `suppliers/` → `vendors/` and rebuild the page as a CRM with the new fields. Rewire the Slack ping to fire on deposit-paid.

**Files:**
- Create (move): `src/routes/dashboard/vendors/+page.server.ts`, `+page.svelte`, `edit/+server.ts`
- Delete: `src/routes/dashboard/suppliers/` (the three files)
- Modify: `src/routes/dashboard/+layout.svelte:21, 43` (nav + META)

**Interfaces:**
- Consumes: `vendors` table (Task 3), `recordAudit` (added in Task 8 — leave a `// TODO audit` placeholder? No — Task 8 adds the calls; this task does not import audit).
- Produces: `POST /dashboard/vendors/edit` `{ id, field, value }` autosave; form actions `add`, `remove`.

- [ ] **Step 1: Move the directory**

```bash
git mv src/routes/dashboard/suppliers src/routes/dashboard/vendors
```

- [ ] **Step 2: Rewrite** `src/routes/dashboard/vendors/+page.server.ts`:

```ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { vendors, appointments, notes } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';

export const load: PageServerLoad = async () => ({
  vendors: await db.select().from(vendors).orderBy(asc(vendors.sort)),
  appointments: await db
    .select({
      id: appointments.id,
      title: appointments.title,
      date: appointments.date,
      time: appointments.time,
      vendorId: appointments.vendorId
    })
    .from(appointments)
    .orderBy(asc(appointments.date), asc(appointments.time)),
  notes: await db
    .select()
    .from(notes)
    .where(eq(notes.entityType, 'vendor'))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id))
});

export const actions: Actions = {
  add: async () => {
    await db.insert(vendors).values({ category: 'New', stage: 'Lead', sort: 999 });
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(vendors).where(eq(vendors.id, Number(f.get('id'))));
  }
};
```

- [ ] **Step 3: Rewrite the autosave endpoint** `src/routes/dashboard/vendors/edit/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { vendors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';

const TEXT = new Set(['category', 'name', 'contact', 'phone', 'email', 'website', 'address', 'stage', 'followUpDate', 'description', 'notes']);
const NUM = new Set(['quotedAmount', 'depositAmount', 'priority']);
const BOOL = new Set(['depositPaid']);

// Field-level autosave for a vendor row. Fires the Slack "chosen supplier"
// ping once when deposit_paid flips false -> true.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const { id, field, value } = await request.json();
	if (!TEXT.has(field) && !NUM.has(field) && !BOOL.has(field)) throw error(400, 'bad field');

	const [prev] = await db.select().from(vendors).where(eq(vendors.id, Number(id)));
	if (!prev) throw error(404);

	let set: Record<string, unknown>;
	if (BOOL.has(field)) set = { [field]: !!value };
	else if (NUM.has(field)) set = { [field]: value === '' || value == null ? null : Number(value) };
	else if (field === 'category') set = { category: String(value ?? '') || 'New' };
	else if (field === 'stage') set = { stage: String(value ?? '') || 'Lead' };
	else set = { [field]: String(value ?? '') || null };

	await db.update(vendors).set(set).where(eq(vendors.id, Number(id)));

	if (field === 'depositPaid' && !!value && !prev.depositPaid) {
		const base = env.PUBLIC_BASE_URL ?? '';
		await notifySupplierBooked({
			category: prev.category,
			name: prev.name || null,
			contact: prev.contact || null,
			dashboardUrl: base ? `${base}/dashboard/vendors` : undefined
		});
	}
	return json({ ok: true });
};
```

- [ ] **Step 4: Rewrite the page** `src/routes/dashboard/vendors/+page.svelte`. Full file:

```svelte
<script lang="ts">
  import Notes from '$lib/components/Notes.svelte';
  import type { NoteRow } from '$lib/components/Notes.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();

  const STAGES = ['Lead', 'Enquired', 'Quoted', 'Shortlisted', 'Booked'];
  const todayISO = new Date().toISOString().slice(0, 10);

  const apptsByVendor = $derived.by(() => {
    const map: Record<number, typeof data.appointments> = {};
    for (const a of data.appointments) {
      if (a.vendorId == null || a.date < todayISO) continue;
      (map[a.vendorId] ??= []).push(a);
    }
    return map;
  });
  const notesByVendor = $derived.by(() => {
    const map: Record<number, NoteRow[]> = {};
    for (const n of data.notes as NoteRow[]) {
      if (n.entityId == null) continue;
      (map[n.entityId] ??= []).push(n);
    }
    return map;
  });
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const stageTone = (s: string) =>
    s === 'Booked' ? 'green' : s === 'Shortlisted' || s === 'Quoted' ? 'tan' : 'neut';

  let openNotes = $state<Record<number, boolean>>({});

  async function save(id: number, field: string, value: unknown) {
    await fetch('/dashboard/vendors/edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, field, value })
    });
  }
</script>

{#snippet calIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>{/snippet}
{#snippet noteIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>{/snippet}

<div class="list">
  {#each data.vendors as v (v.id)}
    <article class="vendor" class:chosen={v.depositPaid}>
      <div class="top">
        <input class="cat" value={v.category} placeholder="Category"
          onchange={(e) => save(v.id, 'category', e.currentTarget.value)} />
        <input class="name" value={v.name ?? ''} placeholder="Vendor — who?"
          onchange={(e) => save(v.id, 'name', e.currentTarget.value)} />
        <span class={`status ${stageTone(v.stage)}`}>
          <select value={v.stage} onchange={(e) => save(v.id, 'stage', e.currentTarget.value)} aria-label="Stage">
            {#each STAGES as st}<option value={st}>{st}</option>{/each}
          </select>
        </span>
        {#if v.depositPaid}<span class="chosen-badge">Chosen supplier</span>{/if}
        <form method="POST" action="?/remove" use:enhance class="rmf"
          onsubmit={(e) => { if (!confirm(`Remove ${v.category}?`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={v.id} />
          <button class="rm" title="Remove" aria-label="Remove">×</button>
        </form>
      </div>

      <div class="grid">
        <label>Phone<input value={v.phone ?? ''} onchange={(e) => save(v.id, 'phone', e.currentTarget.value)} /></label>
        <label>Email<input value={v.email ?? ''} onchange={(e) => save(v.id, 'email', e.currentTarget.value)} /></label>
        <label>Website<input value={v.website ?? ''} onchange={(e) => save(v.id, 'website', e.currentTarget.value)} /></label>
        <label>Contact<input value={v.contact ?? ''} onchange={(e) => save(v.id, 'contact', e.currentTarget.value)} /></label>
        <label>Quote £<input type="number" step="0.01" value={v.quotedAmount ?? ''} onchange={(e) => save(v.id, 'quotedAmount', e.currentTarget.value)} /></label>
        <label>Deposit £<input type="number" step="0.01" value={v.depositAmount ?? ''} onchange={(e) => save(v.id, 'depositAmount', e.currentTarget.value)} /></label>
        <label>Follow-up<input type="date" value={v.followUpDate ?? ''} onchange={(e) => save(v.id, 'followUpDate', e.currentTarget.value)} /></label>
        <label>Priority
          <select value={String(v.priority)} onchange={(e) => save(v.id, 'priority', e.currentTarget.value)}>
            <option value="1">High</option><option value="2">Medium</option><option value="3">Low</option>
          </select>
        </label>
      </div>

      <label class="deposit-toggle">
        <input type="checkbox" checked={v.depositPaid}
          onchange={(e) => save(v.id, 'depositPaid', e.currentTarget.checked)} />
        Deposit paid — booked & chosen supplier
      </label>

      <textarea class="desc" rows="2" placeholder="Notes, quote details, what they offer…"
        value={v.description ?? ''} onchange={(e) => save(v.id, 'description', e.currentTarget.value)}></textarea>

      <div class="actions">
        {#each apptsByVendor[v.id] ?? [] as a (a.id)}
          <a class="chip booked-chip" href="/dashboard/calendar" title={a.title}>
            {@render calIcon()} {fmt(a.date)}{a.time ? ` · ${a.time}` : ''} — {a.title}
          </a>
        {/each}
        <a class="chip dashed" href={`/dashboard/calendar?supplier=${v.id}`}>{@render calIcon()} Book appointment</a>
        <button class="chip" onclick={() => (openNotes[v.id] = !openNotes[v.id])}>
          {@render noteIcon()} Notes{(notesByVendor[v.id] ?? []).length ? ` · ${notesByVendor[v.id].length}` : ''}
        </button>
      </div>

      {#if openNotes[v.id] || (notesByVendor[v.id] ?? []).length}
        <div class="notes-area">
          <Notes notes={notesByVendor[v.id] ?? []} category="Suppliers" entityType="vendor" entityId={v.id} compact addLabel="Add note" />
        </div>
      {/if}
    </article>
  {/each}

  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add vendor</button></form>
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 14px; }
  .vendor {
    background: var(--card); border: 1px solid var(--line); border-radius: 16px;
    padding: 18px 22px; transition: box-shadow .15s, border-color .15s;
  }
  .vendor:hover { box-shadow: 0 4px 18px rgba(33,31,26,.05); }
  .vendor.chosen { border-color: var(--sage); }

  .top { display: grid; grid-template-columns: minmax(140px,1fr) minmax(160px,1.4fr) 130px auto 28px; gap: 14px; align-items: center; }
  .top input { border: 1px solid transparent; border-radius: 8px; padding: 6px 8px; font: inherit; background: transparent; min-width: 0; transition: background-color .12s, border-color .12s; }
  .top input:hover { background: var(--bg); }
  .top input:focus { background: #fff; border-color: var(--line); outline: none; }
  .top .cat { font-weight: 700; font-size: 15px; color: var(--ink); }
  .top .name { color: var(--body); font-size: 14px; }

  .status { justify-self: start; border-radius: 999px; display: inline-flex; }
  .status select { appearance: none; -webkit-appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 700; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; color: inherit; }
  .status.green { background: var(--sage-soft); color: var(--sage-deep); }
  .status.tan { background: #f0e8da; color: #9a7b53; }
  .status.neut { background: #f0ede5; color: #8a8678; }
  .chosen-badge { justify-self: start; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; color: var(--sage-deep); background: var(--sage-soft); padding: 4px 10px; border-radius: 999px; }

  .rmf { margin: 0; justify-self: end; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; padding: 0; line-height: 1; }
  .rm:hover { color: var(--terra); }

  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 14px; margin-top: 14px; }
  .grid label { display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
  .grid input, .grid select { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 0; }

  .deposit-toggle { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: var(--body); cursor: pointer; }
  .desc { display: block; width: 100%; margin-top: 12px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; resize: vertical; box-sizing: border-box; }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }
  .chip { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px; font: inherit; font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--sage-deep); text-decoration: none; cursor: pointer; }
  .chip:hover { border-color: var(--sage); background: var(--sage-soft); }
  .chip :global(.ico) { flex: none; }
  .chip.dashed { border-style: dashed; }
  .booked-chip { background: var(--terra-bg); border-color: var(--terra-bg); color: var(--terra); text-transform: none; letter-spacing: 0; }
  .booked-chip:hover { border-color: var(--terra); background: var(--terra-bg); }

  .notes-area { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }

  .add { margin-top: 4px; }
  .add button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }

  @media (max-width: 820px) {
    .top { grid-template-columns: 1fr 1fr; }
    .grid { grid-template-columns: 1fr 1fr; }
  }
</style>
```

- [ ] **Step 5: Update the nav + page meta** in `dashboard/+layout.svelte`. Line 21 (in the `Guests` group):

```ts
        ['/dashboard/vendors', 'Vendors', 'briefcase'],
```
Line 43 (META): replace the `/dashboard/suppliers` entry with:
```ts
    '/dashboard/vendors': { title: 'Vendors', subtitle: 'Your shortlist, quotes & chosen suppliers' },
```

- [ ] **Step 6: Type-check + smoke test**

Run: `npm run check`
Expected: PASS (no errors).

Run: `npm run dev` then open `/dashboard/vendors` (log in with a dev passcode once Task 7 lands; until then the layout guard still uses `authed`). Confirm vendors render with stage, fields, and the deposit toggle.

- [ ] **Step 7: Commit**

```bash
git add src/routes/dashboard/vendors src/routes/dashboard/+layout.svelte
git rm -r src/routes/dashboard/suppliers 2>/dev/null; true
git commit -m "feat(vendors): vendor CRM page, route rename, deposit-paid Slack ping"
```

---

## Task 6: Login, hooks, locals & "Signed in as"

Wire identity end-to-end so `locals.user` is populated and the rail shows who's signed in.

**Files:**
- Modify: `src/app.d.ts:6-8`
- Modify: `src/hooks.server.ts:20-28`
- Modify: `src/routes/login/+page.server.ts`
- Modify: `src/routes/dashboard/+layout.server.ts`
- Modify: `src/routes/dashboard/+layout.svelte` (rail footer)

**Interfaces:**
- Consumes: `verifySession`→`{slug}` (Task 1), `resolvePasscodeSlug` (Task 2), `users` table (Task 3).
- Produces: `App.Locals.user: { id: number; slug: string; name: string } | null`; layout `data.user`.

- [ ] **Step 1: Extend Locals** in `app.d.ts`:

```ts
		interface Locals {
			authed: boolean;
			user: { id: number; slug: string; name: string } | null;
		}
```

- [ ] **Step 2: Populate `locals.user` in hooks** — replace `src/hooks.server.ts` lines 20-28:

```ts
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE);
	const session = verifySession(token, env.SESSION_SECRET ?? '');
	if (session) {
		const [u] = await db.select().from(users).where(eq(users.slug, session.slug));
		event.locals.user = u ? { id: u.id, slug: u.slug, name: u.name } : null;
	} else {
		event.locals.user = null;
	}
	event.locals.authed = !!event.locals.user;

	if (event.url.pathname.startsWith('/dashboard') && !event.locals.authed) {
		throw redirect(303, '/login');
	}
	return resolve(event);
};
```
(Add the three imports near the top with the existing imports.)

- [ ] **Step 3: Update login** — replace `src/routes/login/+page.server.ts` body of the default action:

```ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signSession } from '$lib/server/auth';
import { resolvePasscodeSlug } from '$lib/server/users';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const passcode = String(data.get('passcode') ?? '');
		const slug = await resolvePasscodeSlug(passcode, {
			alex: env.PASSCODE_HASH_ALEX,
			katie: env.PASSCODE_HASH_KATIE
		});
		if (!slug) return fail(401, { error: 'That passcode is not right.' });
		cookies.set('session', signSession(env.SESSION_SECRET ?? '', slug), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 90
		});
		throw redirect(303, '/dashboard');
	}
};
```

- [ ] **Step 4: Pass the user to the layout** — `src/routes/dashboard/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.authed) throw redirect(303, '/login');
  return { user: locals.user };
};
```

- [ ] **Step 5: Show "Signed in as"** in `dashboard/+layout.svelte`. Add `let { children, data } = $props();` (currently `let { children } = $props();` on line 3 → add `data`). Then in the `.rail-foot` block, just above the sign-out form (after the `</div>` closing `.countdown`, around line 118):

```svelte
      {#if data?.user}<p class="whoami">Signed in as <strong>{data.user.name}</strong></p>{/if}
```
Add style:
```css
  .whoami { margin: 6px 4px 2px; font-size: 10.5px; letter-spacing: .04em; color: var(--sidebar-faint); }
  .whoami strong { color: var(--sidebar-active); font-weight: 600; }
```

- [ ] **Step 6: Set local dev passcodes** so you can log in. Generate two hashes and add them to `.env`:

Run:
```bash
node --input-type=module -e "import('./src/lib/server/auth.ts').then(async m => { console.log('PASSCODE_HASH_ALEX='+await m.hashPasscode('alex-2027')); console.log('PASSCODE_HASH_KATIE='+await m.hashPasscode('katie-2027')); })" 2>/dev/null || npx tsx -e "import { hashPasscode } from './src/lib/server/auth'; (async()=>{ console.log('PASSCODE_HASH_ALEX='+await hashPasscode('alex-2027')); console.log('PASSCODE_HASH_KATIE='+await hashPasscode('katie-2027')); })()"
```
Paste both lines into `.env` (and remove `ADMIN_PASSCODE_HASH`). Dev passcodes are `alex-2027` / `katie-2027`.

- [ ] **Step 7: Type-check + manual login**

Run: `npm run check`
Expected: PASS.

Run `npm run dev`; log in with `alex-2027` → rail shows "Signed in as Alex"; log in with `katie-2027` → "Signed in as Katie".

- [ ] **Step 8: Commit**

```bash
git add src/app.d.ts src/hooks.server.ts src/routes/login/+page.server.ts src/routes/dashboard/+layout.server.ts src/routes/dashboard/+layout.svelte
git commit -m "feat(auth): per-user login, locals.user, signed-in-as in rail"
```

---

## Task 7: Notes authorship + comments

Add author attribution and a Notion-style flat comment thread per note.

**Files:**
- Modify: `src/routes/dashboard/notes/edit/+server.ts`
- Modify: `src/routes/dashboard/notes/+page.server.ts`
- Modify: `src/lib/components/Notes.svelte`

**Interfaces:**
- Consumes: `locals.user` (Task 6), `notes.authorId/lastEditedById`, `noteComments`, `users` (Task 3).
- Produces: note ops set author; comment ops `comment.create {noteId, body}`, `comment.update {id, body}`, `comment.delete {id}`. `NoteRow` gains `authorName?, lastEditedByName?, comments?: NoteComment[]`.

- [ ] **Step 1: Author + comment ops** — update `notes/edit/+server.ts`. Add imports and use `locals.user`:

```ts
import { notes, noteComments } from '$lib/server/db/schema';
```
Change the guard to `if (!locals.user) throw error(401);`. In `create`, set author:
```ts
			.values({ body, category, entityType, entityId, createdAt: now, updatedAt: now, authorId: locals.user.id, lastEditedById: locals.user.id })
```
In `update`, set editor:
```ts
		await db.update(notes).set({ body, updatedAt: new Date(), lastEditedById: locals.user.id }).where(eq(notes.id, id));
```
Add comment ops before the final `throw error(400, …)`:
```ts
	if (op === 'comment.create') {
		const noteId = Number(data.noteId);
		const body = String(data.body ?? '').trim();
		if (!noteId || !body) throw error(400, 'bad comment');
		const now = new Date();
		const [row] = await db
			.insert(noteComments)
			.values({ noteId, authorId: locals.user.id, body, createdAt: now, updatedAt: now })
			.returning({ id: noteComments.id });
		return json({ ok: true, id: row.id });
	}

	if (op === 'comment.update') {
		const id = Number(data.id);
		const body = String(data.body ?? '').trim();
		if (!id || !body) throw error(400, 'bad comment');
		await db.update(noteComments).set({ body, updatedAt: new Date() }).where(eq(noteComments.id, id));
		return json({ ok: true });
	}

	if (op === 'comment.delete') {
		const id = Number(data.id);
		if (!id) throw error(400, 'bad id');
		await db.delete(noteComments).where(eq(noteComments.id, id));
		return json({ ok: true });
	}
```

- [ ] **Step 2: Load authors + comments** in `notes/+page.server.ts`. Add imports `noteComments, users`; after fetching `rows`, build author names and comments. Replace the final `enriched`/return with:

```ts
	const [people, comments] = await Promise.all([
		db.select({ id: users.id, name: users.name }).from(users),
		db.select().from(noteComments).orderBy(asc(noteComments.createdAt))
	]);
	const nameById = Object.fromEntries(people.map((p) => [p.id, p.name]));
	const commentsByNote: Record<number, typeof comments> = {};
	for (const c of comments) (commentsByNote[c.noteId] ??= []).push(c);

	const enriched = rows.map((r) => {
		let contextLabel: string | null = null;
		let contextHref: string | null = null;
		if (isEntityType(r.entityType)) {
			const kind = ENTITY_KINDS[r.entityType];
			contextHref = kind.href;
			contextLabel = (r.entityId != null && labels[r.entityType]?.[r.entityId]) || kind.label;
		}
		return {
			...r,
			contextLabel,
			contextHref,
			authorName: r.authorId != null ? (nameById[r.authorId] ?? null) : null,
			lastEditedByName: r.lastEditedById != null ? (nameById[r.lastEditedById] ?? null) : null,
			comments: (commentsByNote[r.id] ?? []).map((c) => ({
				...c,
				authorName: c.authorId != null ? (nameById[c.authorId] ?? null) : null
			}))
		};
	});

	return { notes: enriched };
```
(Add `asc` to the `drizzle-orm` import: `import { asc, desc } from 'drizzle-orm';`)

- [ ] **Step 3: Render authorship + comments** in `Notes.svelte`. Extend the `NoteRow` interface and add a `NoteComment` type:

```ts
	export interface NoteComment {
		id: number;
		body: string;
		authorName?: string | null;
		updatedAt: Date | string | number | null;
	}
	export interface NoteRow {
		id: number;
		body: string;
		category: string;
		entityType: string | null;
		entityId: number | null;
		pinned: boolean;
		updatedAt: Date | string | number | null;
		contextLabel?: string | null;
		contextHref?: string | null;
		authorName?: string | null;
		lastEditedByName?: string | null;
		comments?: NoteComment[];
	}
```
Add comment state + handlers in the `<script>`:
```ts
	let openComments = $state<Record<number, boolean>>({});
	let commentDraft = $state<Record<number, string>>({});

	async function addComment(noteId: number) {
		const body = (commentDraft[noteId] ?? '').trim();
		if (!body) return;
		await post({ op: 'comment.create', noteId, body });
		commentDraft[noteId] = '';
	}
	async function removeComment(id: number) {
		if (!confirm('Delete this comment?')) return;
		await post({ op: 'comment.delete', id });
	}
```
In the note's `.foot` meta line, show author. Replace the `<span class="meta">…</span>` with:
```svelte
					<span class="meta">
						{#if showContext && n.contextLabel}
							{#if n.contextHref}<a class="ctx" href={n.contextHref}>{n.contextLabel}</a>{:else}<span class="ctx">{n.contextLabel}</span>{/if}
							·
						{/if}
						{n.authorName ? n.authorName : 'Imported'}{n.lastEditedByName && n.lastEditedByName !== n.authorName ? ` · edited by ${n.lastEditedByName}` : ''} · {fmt(n.updatedAt)}
					</span>
```
Add a comments toggle button into the note's `.acts` (after the Delete button):
```svelte
						<button class="link" onclick={() => (openComments[n.id] = !openComments[n.id])}>
							Comments{(n.comments?.length ?? 0) ? ` (${n.comments?.length})` : ''}
						</button>
```
And render the thread after the `.foot` div, still inside the `{:else}` branch:
```svelte
					{#if openComments[n.id]}
						<div class="thread">
							{#each n.comments ?? [] as c (c.id)}
								<div class="comment">
									<p>{c.body}</p>
									<div class="cfoot">
										<span>{c.authorName ?? 'Imported'} · {fmt(c.updatedAt)}</span>
										<button class="link danger" onclick={() => removeComment(c.id)}>Delete</button>
									</div>
								</div>
							{/each}
							<div class="add">
								<textarea bind:value={commentDraft[n.id]} rows="1" placeholder="Add a comment…"></textarea>
								<button class="mini primary" disabled={busy || !(commentDraft[n.id] ?? '').trim()} onclick={() => addComment(n.id)}>Comment</button>
							</div>
						</div>
					{/if}
```
Add styles:
```css
	.thread { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 6px; }
	.comment p { margin: 0; font-size: 12.5px; line-height: 1.45; white-space: pre-wrap; }
	.cfoot { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 10.5px; color: var(--muted); margin-top: 2px; }
```

- [ ] **Step 4: Type-check + manual test**

Run: `npm run check`
Expected: PASS.

Manual (dev, logged in): create a note → shows "Alex · <date>"; add a comment → appears with author; reload → persists.

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/notes src/lib/components/Notes.svelte
git commit -m "feat(notes): author attribution and Notion-style comments"
```

---

## Task 8: Audit log helper + instrument all writes + Activity feed

**Files:**
- Create: `src/lib/server/audit.ts`, `src/lib/audit.ts`, `tests/audit.test.ts`
- Create: `src/routes/dashboard/activity/+page.server.ts`, `+page.svelte`
- Modify: every mutation path (listed in Step 4)
- Modify: `src/routes/dashboard/+layout.svelte` (nav + META)

**Interfaces:**
- Consumes: `auditLog`, `users` (Task 3), `locals.user` (Task 6).
- Produces: `recordAudit(locals, { action, entity, entityId?, summary }): Promise<void>`; `formatAuditLine(entry, userName): string`.

- [ ] **Step 1: Write the failing test** `tests/audit.test.ts` for the pure formatter:

```ts
import { describe, it, expect } from 'vitest';
import { formatAuditLine } from '../src/lib/audit';

describe('formatAuditLine', () => {
	it('names the actor and the action', () => {
		expect(
			formatAuditLine({ action: 'update', entity: 'vendor', summary: 'Booked Adam Lowndes' }, 'Katie')
		).toBe('Katie updated vendor — Booked Adam Lowndes');
	});
	it('falls back to System when no user', () => {
		expect(
			formatAuditLine({ action: 'create', entity: 'note', summary: 'Added a note' }, null)
		).toBe('System created note — Added a note');
	});
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- audit`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement both helpers.** `src/lib/audit.ts` (client-safe, pure):

```ts
export interface AuditEntryLite {
	action: string; // 'create' | 'update' | 'delete'
	entity: string;
	summary: string;
}

const VERB: Record<string, string> = { create: 'created', update: 'updated', delete: 'deleted' };

export function formatAuditLine(entry: AuditEntryLite, userName: string | null): string {
	const who = userName ?? 'System';
	const verb = VERB[entry.action] ?? entry.action;
	return `${who} ${verb} ${entry.entity} — ${entry.summary}`;
}
```
`src/lib/server/audit.ts`:
```ts
import { db } from './db/index';
import { auditLog } from './db/schema';

export interface AuditInput {
	action: 'create' | 'update' | 'delete';
	entity: string;
	entityId?: number | null;
	summary: string;
}

// Append one row to the audit log. Best-effort: a logging failure must never
// break the write that triggered it.
export async function recordAudit(locals: App.Locals, input: AuditInput): Promise<void> {
	try {
		await db.insert(auditLog).values({
			userId: locals.user?.id ?? null,
			action: input.action,
			entity: input.entity,
			entityId: input.entityId ?? null,
			summary: input.summary,
			createdAt: new Date()
		});
	} catch (e) {
		console.error('recordAudit failed', e);
	}
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `npm test -- audit`
Expected: PASS.

- [ ] **Step 5: Instrument every mutation.** In each handler below, import `{ recordAudit } from '$lib/server/audit'` and call it after the successful write. Use these exact calls:

`dashboard/vendors/edit/+server.ts` (after the update, before the Slack block):
```ts
	await recordAudit(locals, { action: 'update', entity: 'vendor', entityId: Number(id), summary: `${prev.category}${prev.name ? ' · ' + prev.name : ''}: ${field}` });
```
`dashboard/vendors/+page.server.ts` — `add` and `remove` take `{ locals }`:
```ts
  add: async ({ locals }) => {
    const [row] = await db.insert(vendors).values({ category: 'New', stage: 'Lead', sort: 999 }).returning({ id: vendors.id });
    await recordAudit(locals, { action: 'create', entity: 'vendor', entityId: row.id, summary: 'Added a vendor' });
  },
  remove: async ({ request, locals }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const [v] = await db.select({ category: vendors.category }).from(vendors).where(eq(vendors.id, id));
    await db.delete(vendors).where(eq(vendors.id, id));
    await recordAudit(locals, { action: 'delete', entity: 'vendor', entityId: id, summary: `Removed ${v?.category ?? 'a vendor'}` });
  }
```
`dashboard/notes/edit/+server.ts` — after each op's write:
- create: `await recordAudit(locals, { action: 'create', entity: 'note', entityId: row.id, summary: body.slice(0, 60) });`
- update: `await recordAudit(locals, { action: 'update', entity: 'note', entityId: id, summary: 'Edited a note' });`
- pin: `await recordAudit(locals, { action: 'update', entity: 'note', entityId: id, summary: data.pinned ? 'Pinned a note' : 'Unpinned a note' });`
- delete: `await recordAudit(locals, { action: 'delete', entity: 'note', entityId: id, summary: 'Deleted a note' });`
- comment.create: `await recordAudit(locals, { action: 'create', entity: 'comment', entityId: noteId, summary: body.slice(0, 60) });`
- comment.update: `await recordAudit(locals, { action: 'update', entity: 'comment', entityId: id, summary: 'Edited a comment' });`
- comment.delete: `await recordAudit(locals, { action: 'delete', entity: 'comment', entityId: id, summary: 'Deleted a comment' });`

For the remaining endpoints, add a `recordAudit` after the write, deriving `locals` from the handler args (all already receive `{ locals }` or need it added). Use these summaries:
- `dashboard/budget/line/+server.ts` → `{ action: <op>, entity: 'budget_line', entityId: id, summary: 'Updated a budget line' }` (use create/update/delete to match the op).
- `dashboard/budget/reorder/+server.ts` → `{ action: 'update', entity: 'budget_line', summary: 'Reordered the budget' }`.
- `dashboard/guests/edit/+server.ts` → `{ action: 'update', entity: 'guest', entityId: id, summary: 'Edited a guest' }` (or create/delete per op).
- `dashboard/seating/place/+server.ts` → `{ action: 'update', entity: 'seating', summary: 'Updated a seat assignment' }`.
- `dashboard/seating/layout/+server.ts` → `{ action: 'update', entity: 'seating', summary: 'Changed the floor layout' }`.
- `dashboard/invites/message/+server.ts` → `{ action: 'update', entity: 'invite', summary: 'Edited a personal message' }`.
- `dashboard/timeline/reorder/+server.ts` → `{ action: 'update', entity: 'timeline', summary: 'Reordered the timeline' }`.
- timeline item toggle handler (find the POST that sets `done`) → `{ action: 'update', entity: 'timeline', entityId: id, summary: 'Toggled a timeline task' }`.
- `dashboard/shopping/item/+server.ts` → `{ action: <op>, entity: 'shopping', entityId: id, summary: 'Updated the shopping list' }`.
- `dashboard/stationery/+server.ts` → `{ action: 'update', entity: 'stationery', summary: 'Updated stationery' }`.
- `dashboard/calendar/+page.server.ts` add/update/remove → `{ action: <op>, entity: 'appointment', entityId: id, summary: <title or 'an appointment'> }`.
- `dashboard/venue/quote/+server.ts` → `{ action: 'update', entity: 'venue', summary: 'Edited the venue quote' }`.

For any handler that doesn't already destructure `locals`, add it to the function signature. For each, guard with the existing `if (!locals.authed)`/`if (!locals.user)` pattern already present.

- [ ] **Step 6: Build the Activity feed loader** `dashboard/activity/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { auditLog, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			entity: auditLog.entity,
			summary: auditLog.summary,
			createdAt: auditLog.createdAt,
			userName: users.name
		})
		.from(auditLog)
		.leftJoin(users, eq(auditLog.userId, users.id))
		.orderBy(desc(auditLog.id))
		.limit(200);
	return { entries: rows };
};
```

- [ ] **Step 7: Build the Activity page** `dashboard/activity/+page.svelte`:

```svelte
<script lang="ts">
  import { formatAuditLine } from '$lib/audit';
  let { data } = $props();
  const fmt = (d: Date | string | number | null) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
</script>

<div class="feed">
  {#each data.entries as e (e.id)}
    <div class="row">
      <span class="line">{formatAuditLine(e, e.userName)}</span>
      <span class="when">{fmt(e.createdAt)}</span>
    </div>
  {:else}
    <p class="empty">No activity yet.</p>
  {/each}
</div>

<style>
  .feed { display: flex; flex-direction: column; gap: 2px; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
  .line { font-size: 13.5px; color: var(--ink); }
  .when { font-size: 11px; color: var(--muted); white-space: nowrap; }
  .empty { color: var(--muted); }
</style>
```

- [ ] **Step 8: Add Activity to nav + META** in `dashboard/+layout.svelte`. In the `Planning` group items, after Notes:
```ts
        ['/dashboard/activity', 'Activity', 'list']
```
META:
```ts
    '/dashboard/activity': { title: 'Activity', subtitle: 'Who changed what, and when' }
```

- [ ] **Step 9: Type-check + manual test**

Run: `npm run check`
Expected: PASS.

Manual (dev, logged in as Alex): edit a vendor field, add a note, add a comment → `/dashboard/activity` lists "Alex updated vendor — …", "Alex created note — …", attributed and time-stamped.

- [ ] **Step 10: Commit**

```bash
git add src/lib/audit.ts src/lib/server/audit.ts tests/audit.test.ts src/routes/dashboard/activity src/routes/dashboard src/routes/dashboard/+layout.svelte
git commit -m "feat(audit): audit log helper, write instrumentation, Activity feed"
```

---

## Task 9: Docs, env & final verification

**Files:**
- Modify: `.env.example`
- Modify: `DEPLOY.md`

- [ ] **Step 1: Update `.env.example`** — replace the Auth block (lines 9-15):

```
# ── Auth ──────────────────────────────────────────────────────────────────
# Random secret that signs the dashboard session cookie. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=
# Per-user passcode hashes (Alex & Katie). Generate each with hashPasscode() in
# src/lib/server/auth.ts. Dev passcodes are `alex-2027` / `katie-2027`.
PASSCODE_HASH_ALEX=
PASSCODE_HASH_KATIE=
```

- [ ] **Step 2: Document the migration run order in `DEPLOY.md`.** Near the existing migration line (`DATABASE_URL='libsql://…' … npm run db:migrate`), confirm the note reads:

```
# Schema + data changes ship together in drizzle migrations. Run once per deploy:
DATABASE_URL='libsql://…' DATABASE_AUTH_TOKEN='…' npm run db:migrate
```
And under "Migrations on future deploys", add: "Migration `0015_vendors_notes_audit` renames `suppliers`→`vendors`, seeds the `alex`/`katie` users, and maps old supplier statuses — it is data-preserving and idempotent-safe to run against Turso. Set `PASSCODE_HASH_ALEX` / `PASSCODE_HASH_KATIE` env vars (and remove `ADMIN_PASSCODE_HASH`)."

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: all suites pass (auth, users, audit, plus existing).

Run: `npm run check`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add .env.example DEPLOY.md
git commit -m "docs: per-user passcodes and vendors/notes/audit migration notes"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** §1 auth → Tasks 1,2,6; §2 audit → Task 8; §3 notes → Tasks 3,7; §4 vendors → Tasks 3,4,5; §5 migration → Tasks 3,4,9. All covered.
- **Type consistency:** `verifySession` returns `{slug}` (Task 1) consumed in Task 6; `resolvePasscodeSlug` (Task 2) consumed in Task 6; `recordAudit(locals, input)` (Task 8) — every call passes `locals` first. Vendor field names (`depositPaid`, `quotedAmount`, `followUpDate`, `priority`) match between schema (Task 3), endpoint (Task 5), and page (Task 5).
- **Migration safety:** rename via `ALTER TABLE`, status mapped before `DROP COLUMN`, users created before FK references — verified in Task 3 Step 9.
- **Known rough edge:** Drizzle snapshot for 0015 isn't regenerated (avoids the destructive rename prompt); `db:migrate` is unaffected. Flagged in Task 3.

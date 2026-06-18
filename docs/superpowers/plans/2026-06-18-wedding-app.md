# Wedding App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the single-file `Wedding_Dashboard.html` into a SvelteKit app with a refined-botanical redesign, a libSQL/Drizzle database, shared-passcode admin auth, and per-household QR-code RSVP pages.

**Architecture:** One SvelteKit app with two zones — a public zone (`/`, RSVP pages) and a passcode-gated dashboard (`/dashboard`). Server-side rendering throughout; all mutations via SvelteKit form actions plus a couple of JSON endpoints for autosave. All DB access isolated in `src/lib/server`. Database is libSQL (local file in dev, Turso or droplet file in prod) accessed through Drizzle ORM.

**Tech Stack:** SvelteKit (Svelte 5 runes), Drizzle ORM, `@libsql/client`, `drizzle-kit`, `qrcode`, `@sveltejs/adapter-auto`, Vitest.

**Reference source:** The existing dashboard lives at `/Users/alexbennett/Documents/Claude/Projects/Wedding 2027/Wedding_Dashboard.html`. Guest roster, quote lines, suppliers, timeline, and notes prose are ported from it. Keep it open while implementing the seed data and content tasks.

**Spec:** `docs/superpowers/specs/2026-06-18-wedding-app-design.md`

---

## File Structure

```
wedding/
  package.json, svelte.config.js, vite.config.ts, tsconfig.json, .env, .gitignore
  drizzle.config.ts
  drizzle/                                  generated migrations
  src/
    app.css                                 design tokens + base styles
    app.html
    hooks.server.ts                         auth gate
    lib/
      server/
        db/
          schema.ts                         all Drizzle tables
          index.ts                          drizzle client
          data.ts                           ported source data (roster, quote, etc.)
          seed.ts                           idempotent seeding + household grouping
        auth.ts                             passcode check + cookie sign/verify
        queries.ts                          shared read queries (counts, catering summary)
      components/
        Card.svelte  Stat.svelte  Pill.svelte  Alert.svelte
        Eyebrow.svelte  Rule.svelte  SectionHeading.svelte
      styles/tokens.css                     (imported by app.css)
    routes/
      +layout.svelte                        global shell, fonts
      +page.svelte                          public landing
      login/+page.svelte  login/+page.server.ts
      logout/+page.server.ts
      rsvp/[token]/+page.server.ts  rsvp/[token]/+page.svelte
      dashboard/
        +layout.server.ts                   auth guard + nav data
        +layout.svelte                      dashboard chrome (nav)
        +page.server.ts  +page.svelte       overview
        guests/+page.server.ts  guests/+page.svelte
        costs/+page.server.ts  costs/+page.svelte  costs/quote/+server.ts
        budget/+page.server.ts  budget/+page.svelte
        seating/+page.server.ts  seating/+page.svelte
        suppliers/+page.server.ts  suppliers/+page.svelte
        timeline/+page.server.ts  timeline/+page.svelte
        stationery/+server.ts                autosave endpoint (used from budget page)
        notes/+page.svelte                   static prose
        invites/+page.server.ts  invites/+page.svelte
  tests/
    seed.test.ts  auth.test.ts  rsvp.test.ts  quote.test.ts  queries.test.ts
```

Files that change together live together; each page owns its server load + actions. Logic worth testing (auth, seeding, RSVP writes, quote math, catering summary) is extracted into pure functions in `src/lib/server` so it can be unit-tested without a browser.

---

## Phase 0 — Project foundation

### Task 1: Scaffold the SvelteKit project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/routes/+page.svelte`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold with the SvelteKit minimal + TypeScript template**

Run from the project root (`/Users/alexbennett/Development/personal/wedding`):

```bash
npx sv create . --template minimal --types ts --no-add-ons --install npm
```

If `sv` prompts because the directory is non-empty (it contains `.claude/`, `docs/`, `.git/`), choose to continue. Expected: a SvelteKit project is created in place.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install drizzle-orm @libsql/client qrcode
npm install -D drizzle-kit @types/qrcode vitest
```

Expected: all install without peer-dependency errors.

- [ ] **Step 3: Switch to `adapter-auto`**

`adapter-auto` ships with the SvelteKit scaffold by default. Confirm `svelte.config.js` imports `@sveltejs/adapter-auto`. If the template used `adapter-node`, run `npm install -D @sveltejs/adapter-auto` and set:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

- [ ] **Step 4: Add the Vitest config to vite.config.ts**

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' }
});
```

- [ ] **Step 5: Add npm scripts**

In `package.json` `"scripts"`, ensure these exist:

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "node --experimental-strip-types src/lib/server/db/seed.ts"
}
```

- [ ] **Step 6: Update .gitignore**

Append:

```
node_modules
/.svelte-kit
/build
.env
*.db
*.db-*
```

- [ ] **Step 7: Verify the dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:5173` with the default page. Stop it with Ctrl-C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit project with drizzle, libsql, qrcode"
```

---

### Task 2: Define the database schema

**Files:**
- Create: `src/lib/server/db/schema.ts`, `drizzle.config.ts`
- Create: `.env`

- [ ] **Step 1: Add environment variables**

Create `.env`:

```
DATABASE_URL=file:./local.db
SESSION_SECRET=dev-secret-change-me
ADMIN_PASSCODE_HASH=
PUBLIC_BASE_URL=http://localhost:5173
```

(`ADMIN_PASSCODE_HASH` is filled in Task 6.)

- [ ] **Step 2: Write the Drizzle schema**

Create `src/lib/server/db/schema.ts`:

```ts
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const inviteGroups = sqliteTable('invite_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  message: text('message'),
  respondedAt: integer('responded_at', { mode: 'timestamp' })
});

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => inviteGroups.id),
  name: text('name').notNull(),
  side: text('side', { enum: ['G', 'B', 'X'] }).notNull(),
  relationshipGroup: text('relationship_group').notNull(),
  relation: text('relation'),
  role: text('role'),
  attendanceType: text('attendance_type', { enum: ['day', 'evening'] }).notNull(),
  isChild: integer('is_child', { mode: 'boolean' }).notNull().default(false),
  rsvpStatus: text('rsvp_status', { enum: ['pending', 'yes', 'no'] }).notNull().default('pending'),
  meal: text('meal', { enum: ['veg', 'non-veg'] }),
  dietaryNotes: text('dietary_notes')
});

export const budgetLines = sqliteTable('budget_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  budgeted: real('budgeted').notNull().default(0),
  confirmed: real('confirmed').notNull().default(0),
  paid: real('paid').notNull().default(0),
  status: text('status').notNull().default('todo'),
  sort: integer('sort').notNull().default(0)
});

export const timelinePhases = sqliteTable('timeline_phases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  window: text('window'),
  sort: integer('sort').notNull().default(0)
});

export const timelineItems = sqliteTable('timeline_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phaseId: integer('phase_id').notNull().references(() => timelinePhases.id),
  label: text('label').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0)
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  name: text('name'),
  contact: text('contact'),
  status: text('status').notNull().default('todo'),
  notes: text('notes'),
  sort: integer('sort').notNull().default(0)
});

export const seatAssignments = sqliteTable('seat_assignments', {
  guestId: integer('guest_id').primaryKey().references(() => guests.id),
  tableNo: integer('table_no').notNull()
});

export const quoteLines = sqliteTable('quote_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  section: text('section').notNull(),
  scope: text('scope', { enum: ['day', 'eve', 'fixed', 'custom'] }).notNull(),
  price: real('price').notNull().default(0),
  qty: integer('qty'),
  included: integer('included', { mode: 'boolean' }).notNull().default(false),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
  bond: integer('bond', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0)
});

export const stationeryItems = sqliteTable('stationery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0)
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});
```

- [ ] **Step 3: Write the Drizzle config**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'file:./local.db' }
});
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: a `drizzle/0000_*.sql` file is created containing `CREATE TABLE` statements for all tables.

- [ ] **Step 5: Apply the migration**

Run: `npm run db:migrate`
Expected: `local.db` is created. Verify with `sqlite3 local.db ".tables"` (or `npx drizzle-kit studio`) — all tables listed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db/schema.ts drizzle.config.ts drizzle/ .env.example
git commit -m "feat: add database schema and migrations"
```

(Create `.env.example` mirroring `.env` with empty secret values; do not commit `.env`.)

---

### Task 3: Create the Drizzle client

**Files:**
- Create: `src/lib/server/db/index.ts`

- [ ] **Step 1: Write the client**

```ts
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = createClient({
  url: env.DATABASE_URL ?? 'file:./local.db',
  authToken: env.DATABASE_AUTH_TOKEN // undefined for local file, set for Turso
});

export const db = drizzle(client, { schema });
export { schema };
```

- [ ] **Step 2: Type-check**

Run: `npm run check` (this runs `svelte-check`; the script exists in the scaffold).
Expected: no errors referencing `index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/index.ts
git commit -m "feat: add drizzle client"
```

---

## Phase 1 — Source data & seeding

### Task 4: Port source data from the HTML file

**Files:**
- Create: `src/lib/server/db/data.ts`

This task ports the static arrays from `Wedding_Dashboard.html` into typed structures. Keep the HTML file open and copy the data faithfully.

- [ ] **Step 1: Define types and port the data**

Create `src/lib/server/db/data.ts`. Port the `GUESTS`, `QUOTE_DEFAULT`, `VENDORS`, `TIMELINE`, and budget/stationery data from the HTML. Add two new fields per guest that don't exist in the source: `inviteGroup` (the household key) and `isChild`.

```ts
export type Side = 'G' | 'B' | 'X';
export type AttendanceType = 'day' | 'evening';

export interface SeedGuest {
  name: string;
  side: Side;
  relationshipGroup: string;
  relation?: string;
  role?: string;
  attendanceType: AttendanceType;
  meal?: 'veg' | 'non-veg';   // pre-known dietary from the source (e.g. existing "veg"/"pesc")
  isChild?: boolean;
  inviteGroup: string;        // household key — guests sharing this get ONE QR
}

// Map the source `t` field: "Day" -> "day", "Reception" -> "evening".
// Map the source `diet` field: "veg" -> meal "veg"; "pesc"/"pescatarian" -> dietaryNotes, leave meal undefined.
// `inviteGroup` rules (Step 2 below). `isChild` for: "Grace" (Dan & Rika's baby), "Florie Gledhill".

export const SEED_GUESTS: SeedGuest[] = [
  // ... port all rows from GUESTS[] in the HTML, applying the mappings above ...
  // Example rows showing the shape:
  { name: 'Janet Bennett', side: 'G', relationshipGroup: "Groom's family", relation: "Alex's mother", attendanceType: 'day', inviteGroup: 'janet-bennett' },
  { name: 'Chris Bennett', side: 'G', relationshipGroup: "Groom's family", relation: "Alex's brother", role: 'Best Man', attendanceType: 'day', inviteGroup: 'chris-hayley-bennett' },
  { name: 'Hayley Bennett', side: 'G', relationshipGroup: "Groom's family", relation: "Chris's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'chris-hayley-bennett' },
  { name: 'Dan Grady', side: 'G', relationshipGroup: "Groom's party & friends", relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
  { name: 'Zoe Grady', side: 'G', relationshipGroup: "Groom's party & friends", relation: "Dan's partner", attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
  { name: 'Grace', side: 'B', relationshipGroup: "Bride's work colleagues", relation: "Dan & Rika's daughter (baby)", attendanceType: 'day', isChild: true, inviteGroup: 'daniel-king-family' }
  // ... continue for all ~90 guests ...
];

export interface SeedQuoteLine {
  label: string; section: string; scope: 'day' | 'eve' | 'fixed' | 'custom';
  price: number; qty?: number; included?: boolean; confirmed?: boolean; bond?: boolean;
}
export const SEED_QUOTE: SeedQuoteLine[] = [
  // ... port QUOTE_DEFAULT[]: map {s->label, sec->section, scope, price, qty, inc->included, conf->confirmed, bond} ...
  { label: 'Event fee (incl. 3 canapés + 2 drinks pp, staff, crockery, linen, décor)', section: 'Event', scope: 'day', price: 50, confirmed: true }
  // ... continue ...
];

export interface SeedSupplier { category: string; name?: string; contact?: string; status: string; notes?: string; }
export const SEED_SUPPLIERS: SeedSupplier[] = [
  // ... port VENDORS[] [cat, name, contact, status, notes] ...
  { category: 'Venue & Catering', name: 'The Tithe Barn', contact: 'Laura · 01756 631000', status: 'booked', notes: 'Deposit paid. All food in-house. Dog-friendly.' }
  // ... continue ...
];

export interface SeedPhase { title: string; window: string; items: { label: string; done: boolean }[]; }
export const SEED_TIMELINE: SeedPhase[] = [
  // ... port TIMELINE[] [title, window, [[label, done], ...]] ...
  { title: 'Already booked', window: 'June 2026', items: [ { label: 'Budget & tracker started', done: true } ] }
  // ... continue ...
];

export interface SeedBudgetLine { category: string; budgeted: number; confirmed: number; paid: number; status: string; }
export const SEED_BUDGET: SeedBudgetLine[] = [
  // Derive from the HTML budget table defaults. If the budget rows are computed in the
  // <script> after line 536 of the HTML, read them there and port the category/budgeted/confirmed/paid values.
];

export const SEED_STATIONERY: string[] = [
  // Port the stationery checklist labels rendered by the HTML (state.statio list).
];

export const SEED_SETTINGS: Record<string, string> = {
  target: '30000', dayGuests: '61', eveGuests: '90', minSpend: '16455',
  tableCount: '7', seatMode: 'day'
};
```

> **Note for the implementer:** the HTML file was only partially read during planning (lines 1–536). Read lines 537–end to recover the exact budget rows, stationery list, and the tail of the vendor/timeline rendering before finalising `SEED_BUDGET` and `SEED_STATIONERY`. Port every guest row — do not summarise.

- [ ] **Step 2: Apply the invite-group (household) rules**

When assigning `inviteGroup`, group people who share one physical invite:
- A guest and their partner/spouse share a group (e.g. Dan + Zoe Grady → `dan-zoe-grady`).
- Families with children share the parents' group (baby Grace → her parents' group; Tom + Lisa + Florie → one group).
- Placeholder "+1" rows ("Joshua +1", "Mule Plus One", "Nick Partner") join their host's group — do **not** give them their own QR.
- Solo guests get their own single-person group.
- Evening-only work colleagues each get their own group unless explicitly a couple.

Use a stable kebab-case key derived from the household's lead name(s).

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/data.ts
git commit -m "feat: port source data with household grouping"
```

---

### Task 5: Write the idempotent seed script

**Files:**
- Create: `src/lib/server/db/seed.ts`
- Test: `tests/seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/seed.test.ts
import { describe, it, expect } from 'vitest';
import { buildInviteGroups, makeToken } from '../src/lib/server/db/seed';
import { SEED_GUESTS } from '../src/lib/server/db/data';

describe('buildInviteGroups', () => {
  it('creates one group per unique inviteGroup key', () => {
    const groups = buildInviteGroups(SEED_GUESTS);
    const keys = new Set(SEED_GUESTS.map((g) => g.inviteGroup));
    expect(groups.length).toBe(keys.size);
  });

  it('every group has a non-empty unique token', () => {
    const groups = buildInviteGroups(SEED_GUESTS);
    const tokens = groups.map((g) => g.token);
    expect(tokens.every((t) => t.length >= 16)).toBe(true);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('group name lists its members', () => {
    const groups = buildInviteGroups([
      { name: 'Dan Grady', side: 'G', relationshipGroup: 'x', attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
      { name: 'Zoe Grady', side: 'G', relationshipGroup: 'x', attendanceType: 'day', inviteGroup: 'dan-zoe-grady' }
    ]);
    expect(groups[0].name).toContain('Dan');
    expect(groups[0].name).toContain('Zoe');
  });
});

describe('makeToken', () => {
  it('produces a url-safe token', () => {
    expect(makeToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/seed.test.ts`
Expected: FAIL — `buildInviteGroups`/`makeToken` not exported.

- [ ] **Step 3: Implement the pure helpers + seed runner**

```ts
// src/lib/server/db/seed.ts
import { randomBytes } from 'node:crypto';
import { db } from './index';
import {
  inviteGroups, guests, budgetLines, timelinePhases, timelineItems,
  suppliers, quoteLines, stationeryItems, settings, seatAssignments
} from './schema';
import {
  SEED_GUESTS, SEED_QUOTE, SEED_SUPPLIERS, SEED_TIMELINE,
  SEED_BUDGET, SEED_STATIONERY, SEED_SETTINGS, type SeedGuest
} from './data';

export function makeToken(): string {
  return randomBytes(12).toString('base64url'); // 16 url-safe chars
}

export interface BuiltGroup { key: string; name: string; token: string; }

export function buildInviteGroups(seedGuests: SeedGuest[]): BuiltGroup[] {
  const byKey = new Map<string, string[]>();
  for (const g of seedGuests) {
    const list = byKey.get(g.inviteGroup) ?? [];
    list.push(g.name);
    byKey.set(g.inviteGroup, list);
  }
  return [...byKey.entries()].map(([key, names]) => ({
    key,
    name: formatGroupName(names),
    token: makeToken()
  }));
}

function formatGroupName(names: string[]): string {
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

export async function seed(): Promise<void> {
  // Idempotent: clear then re-insert. RSVP data is regenerated only on explicit reseed.
  await db.delete(seatAssignments);
  await db.delete(guests);
  await db.delete(inviteGroups);
  await db.delete(budgetLines);
  await db.delete(timelineItems);
  await db.delete(timelinePhases);
  await db.delete(suppliers);
  await db.delete(quoteLines);
  await db.delete(stationeryItems);
  await db.delete(settings);

  const groups = buildInviteGroups(SEED_GUESTS);
  const groupIdByKey = new Map<string, number>();
  for (const grp of groups) {
    const [row] = await db.insert(inviteGroups)
      .values({ name: grp.name, token: grp.token }).returning({ id: inviteGroups.id });
    groupIdByKey.set(grp.key, row.id);
  }

  for (const g of SEED_GUESTS) {
    await db.insert(guests).values({
      groupId: groupIdByKey.get(g.inviteGroup)!,
      name: g.name, side: g.side, relationshipGroup: g.relationshipGroup,
      relation: g.relation, role: g.role, attendanceType: g.attendanceType,
      isChild: g.isChild ?? false, meal: g.meal ?? null
    });
  }

  for (let i = 0; i < SEED_QUOTE.length; i++) {
    const q = SEED_QUOTE[i];
    await db.insert(quoteLines).values({
      label: q.label, section: q.section, scope: q.scope, price: q.price,
      qty: q.qty ?? null, included: q.included ?? false,
      confirmed: q.confirmed ?? false, bond: q.bond ?? false, sort: i
    });
  }

  for (let i = 0; i < SEED_SUPPLIERS.length; i++) {
    const s = SEED_SUPPLIERS[i];
    await db.insert(suppliers).values({ ...s, sort: i });
  }

  for (let p = 0; p < SEED_TIMELINE.length; p++) {
    const phase = SEED_TIMELINE[p];
    const [prow] = await db.insert(timelinePhases)
      .values({ title: phase.title, window: phase.window, sort: p })
      .returning({ id: timelinePhases.id });
    for (let i = 0; i < phase.items.length; i++) {
      await db.insert(timelineItems).values({
        phaseId: prow.id, label: phase.items[i].label, done: phase.items[i].done, sort: i
      });
    }
  }

  for (let i = 0; i < SEED_BUDGET.length; i++) {
    await db.insert(budgetLines).values({ ...SEED_BUDGET[i], sort: i });
  }
  for (let i = 0; i < SEED_STATIONERY.length; i++) {
    await db.insert(stationeryItems).values({ label: SEED_STATIONERY[i], done: false, sort: i });
  }
  for (const [key, value] of Object.entries(SEED_SETTINGS)) {
    await db.insert(settings).values({ key, value });
  }
}

// Allow `node --experimental-strip-types src/lib/server/db/seed.ts`
if (process.argv[1]?.endsWith('seed.ts')) {
  seed().then(() => { console.log('Seeded.'); process.exit(0); })
        .catch((e) => { console.error(e); process.exit(1); });
}
```

> The `tests/seed.test.ts` only imports the **pure** helpers (`buildInviteGroups`, `makeToken`), so importing `./index` (which reads env) is avoided at test time — keep those helpers at the top and free of DB calls.

- [ ] **Step 4: Run the tests**

Run: `npm test -- tests/seed.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Run the seed against the local DB**

Run: `npm run db:seed`
Expected: prints "Seeded." Verify counts: `sqlite3 local.db "SELECT count(*) FROM guests; SELECT count(*) FROM invite_groups;"` — guests should be the full roster (~90), groups fewer.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db/seed.ts tests/seed.test.ts
git commit -m "feat: idempotent seed with household grouping and tests"
```

---

## Phase 2 — Authentication

### Task 6: Passcode auth helpers

**Files:**
- Create: `src/lib/server/auth.ts`
- Test: `tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPasscode, verifyPasscode, signSession, verifySession } from '../src/lib/server/auth';

const SECRET = 'test-secret';

describe('passcode', () => {
  it('verifies a correct passcode against its hash', async () => {
    const hash = await hashPasscode('letus-in');
    expect(await verifyPasscode('letus-in', hash)).toBe(true);
  });
  it('rejects a wrong passcode', async () => {
    const hash = await hashPasscode('letus-in');
    expect(await verifyPasscode('nope', hash)).toBe(false);
  });
});

describe('session cookie', () => {
  it('round-trips a valid signed token', () => {
    const token = signSession(SECRET);
    expect(verifySession(token, SECRET)).toBe(true);
  });
  it('rejects a tampered token', () => {
    const token = signSession(SECRET) + 'x';
    expect(verifySession(token, SECRET)).toBe(false);
  });
  it('rejects a token signed with a different secret', () => {
    const token = signSession('other');
    expect(verifySession(token, SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/auth.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement auth helpers**

```ts
// src/lib/server/auth.ts
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(passcode, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const [salt, derived] = stored.split(':');
  if (!salt || !derived) return false;
  const check = scryptSync(passcode, salt, 32);
  const expected = Buffer.from(derived, 'hex');
  return check.length === expected.length && timingSafeEqual(check, expected);
}

// Session cookie value is "issuedAt.signature". Verifies integrity, not expiry-by-default.
export function signSession(secret: string): string {
  const payload = String(Date.now());
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- tests/auth.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Generate the real passcode hash and store it**

Run a one-off to produce a hash for the chosen passcode (replace `OUR-PASSCODE`):

```bash
node --input-type=module -e "import('./src/lib/server/auth.ts').then(async m => console.log(await m.hashPasscode('OUR-PASSCODE')))"
```

Paste the output into `.env` as `ADMIN_PASSCODE_HASH=...`. (If the `.ts` import fails under plain node, run via `npx tsx` instead.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/auth.ts tests/auth.test.ts
git commit -m "feat: passcode hashing and signed session helpers"
```

---

### Task 7: Auth gate, login, and logout

**Files:**
- Create: `src/hooks.server.ts`, `src/routes/login/+page.svelte`, `src/routes/login/+page.server.ts`, `src/routes/logout/+page.server.ts`
- Create: `src/app.d.ts` locals typing (modify if present)

- [ ] **Step 1: Type `locals`**

In `src/app.d.ts`, inside `interface Locals`:

```ts
declare global {
  namespace App {
    interface Locals { authed: boolean; }
  }
}
export {};
```

- [ ] **Step 2: Write the hook**

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifySession } from '$lib/server/auth';

const COOKIE = 'session';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(COOKIE);
  event.locals.authed = verifySession(token, env.SESSION_SECRET ?? '');

  if (event.url.pathname.startsWith('/dashboard') && !event.locals.authed) {
    throw redirect(303, '/login');
  }
  return resolve(event);
};
```

- [ ] **Step 3: Write the login page server action**

```ts
// src/routes/login/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifyPasscode, signSession } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const passcode = String(data.get('passcode') ?? '');
    const ok = await verifyPasscode(passcode, env.ADMIN_PASSCODE_HASH ?? '');
    if (!ok) return fail(401, { error: 'That passcode is not right.' });
    cookies.set('session', signSession(env.SESSION_SECRET ?? ''), {
      path: '/', httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90
    });
    throw redirect(303, '/dashboard');
  }
};
```

- [ ] **Step 4: Write the login page**

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<main class="login">
  <p class="eyebrow">Alex &amp; Katie</p>
  <h1 class="script">Planning</h1>
  <form method="POST" use:enhance>
    <label for="pc">Passcode</label>
    <input id="pc" name="passcode" type="password" autocomplete="current-password" autofocus />
    {#if form?.error}<p class="err">{form.error}</p>{/if}
    <button type="submit">Enter</button>
  </form>
</main>

<style>
  .login { max-width: 360px; margin: 14vh auto; text-align: center; padding: 0 24px; }
  form { display: grid; gap: 10px; margin-top: 24px; text-align: left; }
  label { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  input { border: 1px solid var(--line); border-radius: 8px; padding: 11px 14px; font: inherit; }
  button { margin-top: 8px; padding: 12px; border: 0; border-radius: 8px; background: var(--sage); color: #fff; letter-spacing: .1em; text-transform: uppercase; font-size: 12px; cursor: pointer; }
  .err { color: var(--terra); font-size: 13px; }
</style>
```

- [ ] **Step 5: Write logout**

```ts
// src/routes/logout/+page.server.ts
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
export const actions: Actions = {
  default: async ({ cookies }) => { cookies.delete('session', { path: '/' }); throw redirect(303, '/login'); }
};
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. Visit `/dashboard` → expect redirect to `/login`. Enter the wrong passcode → error. Enter the right one → redirected to `/dashboard` (will 500 until Task 9 exists; that's fine — confirm the cookie is set and the redirect happens). Visit `/logout` posting the form clears it.

- [ ] **Step 7: Commit**

```bash
git add src/hooks.server.ts src/routes/login src/routes/logout src/app.d.ts
git commit -m "feat: passcode auth gate, login and logout"
```

---

## Phase 3 — Design system & shell

### Task 8: Design tokens, fonts, and shared components

**Files:**
- Create: `src/app.css`, `src/lib/styles/tokens.css`
- Create: `src/lib/components/{Card,Stat,Pill,Alert,Eyebrow,Rule,SectionHeading}.svelte`
- Modify: `src/app.html`, `src/routes/+layout.svelte`

- [ ] **Step 1: Write the design tokens (refined botanical)**

Create `src/lib/styles/tokens.css`. Start from the existing palette but elevate it: warmer paper, deeper sage, a hairline rule, and a dusty-rose accent. Pair a display serif (Cormorant Garamond) with a clean sans (Inter) replacing Oswald; keep Style Script only for the couple's name.

```css
:root {
  --bg: #fbfaf6; --ink: #211f1a; --body: #4a473f; --muted: #9a968a; --faint: #a8a496;
  --line: #e8e3d6; --line2: #f1ecdf; --card: #ffffff;
  --sage: #6f7d59; --sage-deep: #51603f; --sage-soft: #eef1e7;
  --terra: #b05c3f; --terra-bg: #faf0ea; --tan: #c2a18a; --rule: #cbbd9e;
  --rose: #c08a86; --rose-bg: #f6ecea;
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Inter', system-ui, sans-serif;
  --script: 'Style Script', cursive;
}
```

- [ ] **Step 2: Write base styles**

Create `src/app.css`:

```css
@import './lib/styles/tokens.css';

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--body);
  font-family: var(--sans); font-weight: 400; line-height: 1.6;
  -webkit-font-smoothing: antialiased; }
h1, h2, h3 { color: var(--ink); }
.script { font-family: var(--script); font-weight: 400; }
.eyebrow { font-weight: 500; letter-spacing: .38em; text-transform: uppercase;
  font-size: 11px; color: var(--muted); }
a { color: var(--sage-deep); }
```

- [ ] **Step 3: Load fonts in app.html**

In `src/app.html`, inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&family=Style+Script&display=swap" rel="stylesheet" />
```

- [ ] **Step 4: Import app.css in the root layout**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 5: Write the shared components**

Create each component. They are presentational and take props/snippets.

```svelte
<!-- src/lib/components/Card.svelte -->
<script lang="ts">
  let { kicker = '', children } = $props();
</script>
<section class="card">
  {#if kicker}<h3 class="kick">{kicker}</h3>{/if}
  {@render children()}
</section>
<style>
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px;
    padding: 24px 26px; margin-bottom: 18px; }
  .kick { font-family: var(--sans); font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 16px; }
</style>
```

```svelte
<!-- src/lib/components/Stat.svelte -->
<script lang="ts">
  let { value, label, accent = false } = $props();
</script>
<div class="stat">
  <div class="v" class:accent>{value}</div>
  <div class="l">{label}</div>
</div>
<style>
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; }
  .v { font-family: var(--serif); font-weight: 600; font-size: 32px; color: var(--ink); line-height: 1; }
  .v.accent { color: var(--sage); }
  .l { font-weight: 500; letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; color: var(--muted); margin-top: 8px; }
</style>
```

```svelte
<!-- src/lib/components/Pill.svelte -->
<script lang="ts">
  let { tone = 'neut', children } = $props(); // neut|green|rose|tan|terra
</script>
<span class="pill {tone}">{@render children()}</span>
<style>
  .pill { display: inline-block; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
    font-size: 10px; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .neut { background: #f0ede5; color: #8a8678; }
  .green { background: var(--sage-soft); color: var(--sage-deep); }
  .rose { background: var(--rose-bg); color: var(--rose); }
  .tan { background: #f0e8da; color: #9a7b53; }
  .terra { background: var(--terra-bg); color: var(--terra); }
</style>
```

```svelte
<!-- src/lib/components/Alert.svelte -->
<script lang="ts">
  let { title = '', tone = 'terra', children } = $props(); // terra|sage
</script>
<div class="alert {tone}">
  {#if title}<div class="at">{title}</div>{/if}
  <div class="bd">{@render children()}</div>
</div>
<style>
  .alert { border-left: 3px solid var(--terra); background: var(--terra-bg);
    padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 0 0 20px; font-size: 14px; }
  .alert.sage { border-left-color: var(--sage); background: var(--sage-soft); }
  .at { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 10.5px;
    color: var(--terra); margin-bottom: 7px; }
  .alert.sage .at { color: var(--sage-deep); }
</style>
```

```svelte
<!-- src/lib/components/Eyebrow.svelte -->
<script lang="ts">let { children } = $props();</script>
<p class="eyebrow">{@render children()}</p>
```

```svelte
<!-- src/lib/components/Rule.svelte -->
<div class="rule"></div>
<style>.rule { width: 46px; height: 1px; background: var(--rule); margin: 0 0 26px; }</style>
```

```svelte
<!-- src/lib/components/SectionHeading.svelte -->
<script lang="ts">let { children } = $props();</script>
<h2 class="sh script">{@render children()}</h2>
<style>
  .sh { font-family: var(--serif); font-weight: 600; font-size: 48px; color: var(--ink);
    margin: 4px 0 8px; line-height: 1; letter-spacing: .005em; }
</style>
```

- [ ] **Step 6: Verify visually**

Run: `npm run dev`. The login page should now render with the new fonts/tokens. Confirm Cormorant + Inter are loading (Network tab) and the sage button looks right.

- [ ] **Step 7: Commit**

```bash
git add src/app.css src/app.html src/lib/styles src/lib/components src/routes/+layout.svelte
git commit -m "feat: refined-botanical design tokens and shared components"
```

---

### Task 9: Dashboard shell (layout + nav + auth load)

**Files:**
- Create: `src/routes/dashboard/+layout.server.ts`, `src/routes/dashboard/+layout.svelte`

- [ ] **Step 1: Layout server load (guard belt-and-braces + provides nav)**

```ts
// src/routes/dashboard/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.authed) throw redirect(303, '/login');
  return {};
};
```

- [ ] **Step 2: Dashboard chrome**

```svelte
<!-- src/routes/dashboard/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();
  const tabs = [
    ['/dashboard', 'Overview'], ['/dashboard/budget', 'Budget'],
    ['/dashboard/costs', 'Costs'], ['/dashboard/guests', 'Guests'],
    ['/dashboard/seating', 'Seating'], ['/dashboard/suppliers', 'Suppliers'],
    ['/dashboard/timeline', 'Timeline'], ['/dashboard/invites', 'Invites'],
    ['/dashboard/notes', 'Notes']
  ];
</script>

<header class="top">
  <p class="eyebrow">The Tithe Barn · Bolton Abbey</p>
  <h1 class="script">Alex &amp; Katie</h1>
  <div class="meta">Thursday 2 April 2027 · 2.30pm</div>
</header>
<nav>
  {#each tabs as [href, label]}
    <a {href} class:active={page.url.pathname === href}>{label}</a>
  {/each}
  <form method="POST" action="/logout" class="out"><button>Sign out</button></form>
</nav>
<main>{@render children()}</main>

<style>
  .top { text-align: center; padding: 48px 24px 26px; }
  .top h1 { font-size: clamp(52px, 9vw, 92px); margin: 4px 0 6px; line-height: 1; }
  .meta { letter-spacing: .26em; text-transform: uppercase; font-size: 11px; color: #5f5b50; }
  nav { display: flex; gap: 26px; justify-content: center; flex-wrap: wrap; align-items: center;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 0 16px; }
  nav a { font-weight: 500; letter-spacing: .12em; text-transform: uppercase; font-size: 11.5px;
    padding: 15px 2px; color: var(--muted); text-decoration: none; border-bottom: 2px solid transparent; }
  nav a.active { color: var(--ink); border-bottom-color: var(--sage); }
  .out button { background: none; border: 0; color: var(--faint); font: inherit; font-size: 11.5px;
    letter-spacing: .12em; text-transform: uppercase; cursor: pointer; padding: 15px 0; }
  main { max-width: 1060px; margin: 0 auto; padding: 34px 22px 80px; }
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, log in, confirm `/dashboard` renders the shell (sub-pages 404 until built — that's expected) and the nav highlights correctly.

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/+layout.server.ts src/routes/dashboard/+layout.svelte
git commit -m "feat: dashboard shell with nav and auth guard"
```

---

## Phase 4 — Dashboard read/CRUD views

### Task 10: Shared queries (counts + catering summary)

**Files:**
- Create: `src/lib/server/queries.ts`
- Test: `tests/queries.test.ts`

- [ ] **Step 1: Write the failing test for the pure summary function**

```ts
// tests/queries.test.ts
import { describe, it, expect } from 'vitest';
import { summarise } from '../src/lib/server/queries';

const rows = [
  { attendanceType: 'day', isChild: false, rsvpStatus: 'yes', meal: 'veg', role: 'Best Man' },
  { attendanceType: 'day', isChild: false, rsvpStatus: 'yes', meal: 'non-veg', role: null },
  { attendanceType: 'day', isChild: true,  rsvpStatus: 'yes', meal: null, role: null },
  { attendanceType: 'evening', isChild: false, rsvpStatus: 'pending', meal: null, role: null },
  { attendanceType: 'day', isChild: false, rsvpStatus: 'no', meal: null, role: null }
] as const;

describe('summarise', () => {
  it('counts day/evening totals', () => {
    const s = summarise(rows as any);
    expect(s.day).toBe(4);
    expect(s.evening).toBe(1);
    expect(s.total).toBe(5);
  });
  it('counts rsvp yes and wedding party', () => {
    const s = summarise(rows as any);
    expect(s.rsvpYes).toBe(3);
    expect(s.party).toBe(1);
  });
  it('breaks catering into adult veg / non-veg / kids', () => {
    const s = summarise(rows as any);
    expect(s.cateringVeg).toBe(1);
    expect(s.cateringNonVeg).toBe(1);
    expect(s.kids).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/queries.test.ts`
Expected: FAIL — `summarise` not exported.

- [ ] **Step 3: Implement queries + summary**

```ts
// src/lib/server/queries.ts
import { db } from './db/index';
import { guests, inviteGroups } from './db/schema';
import { eq } from 'drizzle-orm';

export interface GuestRow {
  attendanceType: 'day' | 'evening'; isChild: boolean;
  rsvpStatus: 'pending' | 'yes' | 'no'; meal: 'veg' | 'non-veg' | null; role: string | null;
}

export interface Summary {
  day: number; evening: number; total: number; rsvpYes: number; party: number;
  kids: number; cateringVeg: number; cateringNonVeg: number;
}

export function summarise(rows: GuestRow[]): Summary {
  const s: Summary = { day: 0, evening: 0, total: rows.length, rsvpYes: 0, party: 0, kids: 0, cateringVeg: 0, cateringNonVeg: 0 };
  for (const r of rows) {
    if (r.attendanceType === 'day') s.day++; else s.evening++;
    if (r.rsvpStatus === 'yes') s.rsvpYes++;
    if (r.role) s.party++;
    if (r.rsvpStatus === 'yes' && r.isChild) s.kids++;
    if (r.rsvpStatus === 'yes' && !r.isChild && r.meal === 'veg') s.cateringVeg++;
    if (r.rsvpStatus === 'yes' && !r.isChild && r.meal === 'non-veg') s.cateringNonVeg++;
  }
  return s;
}

export async function allGuests() {
  return db.select().from(guests);
}

export async function groupWithMembers(token: string) {
  const [group] = await db.select().from(inviteGroups).where(eq(inviteGroups.token, token));
  if (!group) return null;
  const members = await db.select().from(guests).where(eq(guests.groupId, group.id));
  return { group, members };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/queries.test.ts`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/queries.ts tests/queries.test.ts
git commit -m "feat: shared guest queries and catering summary with tests"
```

---

### Task 11: Overview page

**Files:**
- Create: `src/routes/dashboard/+page.server.ts`, `src/routes/dashboard/+page.svelte`

- [ ] **Step 1: Load data**

```ts
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';
import { db } from '$lib/server/db/index';
import { quoteLines } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  const guests = await allGuests();
  const summary = summarise(guests as unknown as GuestRow[]);
  const quote = await db.select().from(quoteLines);
  // days-to-go computed client-side to avoid SSR/CSR clock mismatch
  return { summary, weddingISO: '2027-04-02T14:30:00' };
};
```

- [ ] **Step 2: Render overview**

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import Card from '$lib/components/Card.svelte';
  import Alert from '$lib/components/Alert.svelte';
  let { data } = $props();
  let days = $state(0);
  $effect(() => {
    days = Math.max(0, Math.ceil((new Date(data.weddingISO).getTime() - Date.now()) / 86400000));
  });
</script>

<SectionHeading>Where you are</SectionHeading><Rule />
<div class="grid">
  <Stat value={`${days}`} label="Days to go" accent />
  <Stat value={`${data.summary.day} / ${data.summary.evening}`} label="Day / evening" />
  <Stat value={`${data.summary.total}`} label="Total guests" />
  <Stat value={`${data.summary.rsvpYes}`} label="RSVP'd yes" accent />
  <Stat value={`${data.summary.kids}`} label="Children" />
</div>

<Alert title="Notice of marriage — timing matters">
  You give notice at <b>Bradford &amp; Keighley Register Office</b> (City Hall, BD1 1HY), not North Yorkshire.
  Bradford won't let you book until you're <b>within 6 months of the wedding</b> — so book from <b>early October 2026</b>.
</Alert>

<Card kicker="Catering split (from RSVPs)">
  <p>Adults — vegetarian: <b>{data.summary.cateringVeg}</b> · non-veg: <b>{data.summary.cateringNonVeg}</b> · children: <b>{data.summary.kids}</b></p>
</Card>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, log in, confirm overview renders with seeded counts and a live days-to-go.

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/+page.server.ts src/routes/dashboard/+page.svelte
git commit -m "feat: dashboard overview page"
```

---

### Task 12: Guests page (read, grouped, with RSVP columns)

**Files:**
- Create: `src/routes/dashboard/guests/+page.server.ts`, `src/routes/dashboard/guests/+page.svelte`

- [ ] **Step 1: Load + group**

```ts
// src/routes/dashboard/guests/+page.server.ts
import type { PageServerLoad } from './$types';
import { allGuests } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
  const guests = await allGuests();
  return { guests };
};
```

- [ ] **Step 2: Render table grouped by relationship group**

```svelte
<!-- src/routes/dashboard/guests/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Pill from '$lib/components/Pill.svelte';
  let { data } = $props();
  let q = $state('');

  const sideTone: Record<string, 'green'|'rose'|'tan'> = { G: 'green', B: 'rose', X: 'tan' };
  const sideLabel: Record<string, string> = { G: 'Groom', B: 'Bride', X: 'Both' };

  let filtered = $derived(data.guests.filter((g) =>
    !q || g.name.toLowerCase().includes(q.toLowerCase()) || (g.relation ?? '').toLowerCase().includes(q.toLowerCase())));
  let groups = $derived([...new Set(filtered.map((g) => g.relationshipGroup))]);
</script>

<SectionHeading>Guest list</SectionHeading><Rule />
<input class="srch" placeholder="Search guests…" bind:value={q} />

<div class="card">
  <table>
    <thead><tr><th>Name</th><th>Side</th><th>Relationship</th><th>Role</th><th>RSVP</th><th>Meal</th><th>Dietary</th></tr></thead>
    <tbody>
      {#each groups as grp}
        {@const rows = filtered.filter((g) => g.relationshipGroup === grp)}
        <tr class="section"><td colspan="7">{grp} · {rows.length}</td></tr>
        {#each rows as g}
          <tr>
            <td class="name">{g.name}{#if g.isChild} <Pill tone="tan">Child</Pill>{/if}</td>
            <td><Pill tone={sideTone[g.side]}>{sideLabel[g.side]}</Pill></td>
            <td>{g.relation ?? ''}</td>
            <td>{g.role ?? '—'}</td>
            <td><Pill tone={g.rsvpStatus === 'yes' ? 'green' : g.rsvpStatus === 'no' ? 'terra' : 'neut'}>{g.rsvpStatus}</Pill></td>
            <td>{g.isChild ? 'Kids menu' : (g.meal ?? '—')}</td>
            <td class="diet">{g.dietaryNotes ?? ''}</td>
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>

<style>
  .srch { border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; width: 260px; max-width: 100%;
    font: inherit; margin-bottom: 16px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 6px 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; font-size: 10px;
    color: var(--muted); padding: 11px 12px; border-bottom: 1px solid var(--line); }
  td { padding: 9px 12px; border-bottom: 1px solid var(--line2); font-size: 13.5px; }
  td.name { font-weight: 600; color: var(--ink); }
  td.diet { color: var(--terra); font-size: 12px; }
  tr.section td { font-weight: 600; letter-spacing: .12em; text-transform: uppercase; font-size: 10.5px;
    color: var(--sage-deep); background: var(--sage-soft); }
</style>
```

- [ ] **Step 3: Verify + commit**

Run dev, confirm guests render grouped with RSVP/meal columns.

```bash
git add src/routes/dashboard/guests
git commit -m "feat: guests page with RSVP columns"
```

---

### Task 13: Costs / quote calculator (load + autosave endpoint)

**Files:**
- Create: `src/routes/dashboard/costs/+page.server.ts`, `src/routes/dashboard/costs/+page.svelte`, `src/routes/dashboard/costs/quote/+server.ts`
- Test: `tests/quote.test.ts`

- [ ] **Step 1: Write the failing test for the quote math**

```ts
// tests/quote.test.ts
import { describe, it, expect } from 'vitest';
import { computeQuote } from '../src/lib/server/quote';

const lines = [
  { scope: 'day', price: 50, qty: null, bond: false },
  { scope: 'eve', price: 15, qty: null, bond: false },
  { scope: 'fixed', price: 2900, qty: null, bond: false },
  { scope: 'custom', price: 2.4, qty: 56, bond: false },
  { scope: 'fixed', price: 500, qty: null, bond: true }
] as const;

describe('computeQuote', () => {
  it('sums chargeable spend by scope', () => {
    const r = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(r.spend).toBeCloseTo(61*50 + 90*15 + 2900 + 56*2.4);
  });
  it('separates the refundable bond', () => {
    const r = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(r.bond).toBe(500);
  });
  it('applies a minimum-spend top-up only when below minimum', () => {
    const low = computeQuote(lines as any, { day: 1, eve: 1, min: 20000 });
    expect(low.topup).toBeGreaterThan(0);
    const high = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(high.topup).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/quote.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the quote math**

```ts
// src/lib/server/quote.ts
export interface QuoteLineCalc { scope: 'day'|'eve'|'fixed'|'custom'; price: number; qty: number | null; bond: boolean; }
export interface QuoteInputs { day: number; eve: number; min: number; }
export interface QuoteResult { spend: number; bond: number; topup: number; grand: number; }

export function lineQty(line: QuoteLineCalc, i: QuoteInputs): number {
  if (line.scope === 'day') return i.day;
  if (line.scope === 'eve') return i.eve;
  if (line.scope === 'fixed') return 1;
  return line.qty ?? 0;
}

export function computeQuote(lines: QuoteLineCalc[], i: QuoteInputs): QuoteResult {
  let spend = 0, bond = 0;
  for (const line of lines) {
    const total = lineQty(line, i) * line.price;
    if (line.bond) bond += total; else spend += total;
  }
  const topup = Math.max(0, i.min - spend);
  return { spend, bond, topup, grand: spend + topup + bond };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/quote.test.ts`
Expected: PASS.

- [ ] **Step 5: Page load**

```ts
// src/routes/dashboard/costs/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { quoteLines, settings } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const lines = await db.select().from(quoteLines).orderBy(asc(quoteLines.sort));
  const setRows = await db.select().from(settings);
  const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
  return { lines, day: Number(s.dayGuests ?? 61), eve: Number(s.eveGuests ?? 90), min: Number(s.minSpend ?? 16455) };
};
```

- [ ] **Step 6: Autosave endpoint (price/qty)**

```ts
// src/routes/dashboard/costs/quote/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { quoteLines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const { id, field, value } = await request.json();
  if (field !== 'price' && field !== 'qty') throw error(400, 'bad field');
  await db.update(quoteLines).set({ [field]: Number(value) || 0 }).where(eq(quoteLines.id, id));
  return json({ ok: true });
};
```

- [ ] **Step 7: Costs page (reactive recompute + autosave on blur)**

```svelte
<!-- src/routes/dashboard/costs/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { computeQuote } from '$lib/server/quote';
  let { data } = $props();
  let day = $state(data.day), eve = $state(data.eve), min = $state(data.min);
  let lines = $state(data.lines.map((l) => ({ ...l })));
  let result = $derived(computeQuote(lines as any, { day, eve, min }));
  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function saveLine(line: any, field: 'price'|'qty') {
    await fetch('/dashboard/costs/quote', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: line.id, field, value: line[field] }) });
  }
</script>

<SectionHeading>Venue quote</SectionHeading><Rule />
<div class="ctrls">
  <label>Day guests <input type="number" bind:value={day} /></label>
  <label>Evening guests <input type="number" bind:value={eve} /></label>
  <label>Min spend £ <input type="number" bind:value={min} /></label>
</div>

<div class="card">
  <table>
    <thead><tr><th>Item</th><th>Scope</th><th class="r">Qty</th><th class="r">Price £</th><th class="r">Total</th></tr></thead>
    <tbody>
      {#each lines as line}
        {@const qty = line.scope === 'day' ? day : line.scope === 'eve' ? eve : line.scope === 'fixed' ? 1 : (line.qty ?? 0)}
        <tr>
          <td>{line.label}</td>
          <td class="scope">{line.scope}</td>
          <td class="r">{#if line.scope === 'custom'}<input class="qty" type="number" bind:value={line.qty} onblur={() => saveLine(line, 'qty')} />{:else}{qty}{/if}</td>
          <td class="r"><input class="price" type="number" step="0.01" bind:value={line.price} onblur={() => saveLine(line, 'price')} /></td>
          <td class="r">{gbp(qty * line.price)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="card totals">
  <div class="row"><span>Chargeable subtotal</span><span>{gbp(result.spend)}</span></div>
  <div class="row"><span>Minimum-spend top-up</span><span>{gbp(result.topup)}</span></div>
  <div class="row"><span>Refundable bond</span><span>{gbp(result.bond)}</span></div>
  <div class="row grand"><span>Estimated total payable</span><span>{gbp(result.grand)}</span></div>
</div>

<style>
  .ctrls { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 16px; }
  .ctrls label { display: grid; gap: 6px; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .ctrls input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; width: 110px; font: inherit; font-size: 16px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 6px 14px; overflow-x: auto; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 11px 12px; border-bottom: 1px solid var(--line); }
  th.r, td.r { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid var(--line2); font-size: 13.5px; }
  td.scope { color: var(--faint); font-size: 11.5px; }
  input.price, input.qty { border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; text-align: right; width: 80px; font: inherit; }
  .totals { padding: 16px 24px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--line2); }
  .row.grand { border-top: 2px solid var(--ink); margin-top: 6px; font-family: var(--serif); font-size: 20px; font-weight: 600; color: var(--ink); }
</style>
```

- [ ] **Step 8: Verify + commit**

Edit a price, blur, reload — value persists.

```bash
git add src/routes/dashboard/costs src/lib/server/quote.ts tests/quote.test.ts
git commit -m "feat: costs/quote calculator with autosave and tested math"
```

---

### Task 14: Budget page (CRUD via form actions + stationery autosave)

**Files:**
- Create: `src/routes/dashboard/budget/+page.server.ts`, `src/routes/dashboard/budget/+page.svelte`, `src/routes/dashboard/stationery/+server.ts`

- [ ] **Step 1: Load + CRUD actions**

```ts
// src/routes/dashboard/budget/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { budgetLines, stationeryItems, settings } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const lines = await db.select().from(budgetLines).orderBy(asc(budgetLines.sort));
  const statio = await db.select().from(stationeryItems).orderBy(asc(stationeryItems.sort));
  const setRows = await db.select().from(settings);
  const target = Number(Object.fromEntries(setRows.map((r) => [r.key, r.value])).target ?? 30000);
  return { lines, statio, target };
};

export const actions: Actions = {
  add: async ({ request }) => {
    const f = await request.formData();
    await db.insert(budgetLines).values({ category: String(f.get('category') ?? 'New line'), budgeted: 0, confirmed: 0, paid: 0, status: 'todo', sort: 999 });
  },
  update: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    await db.update(budgetLines).set({
      category: String(f.get('category')), budgeted: Number(f.get('budgeted')) || 0,
      confirmed: Number(f.get('confirmed')) || 0, paid: Number(f.get('paid')) || 0,
      status: String(f.get('status'))
    }).where(eq(budgetLines.id, id));
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(budgetLines).where(eq(budgetLines.id, Number(f.get('id'))));
  },
  setTarget: async ({ request }) => {
    const f = await request.formData();
    await db.update(settings).set({ value: String(Number(f.get('target')) || 0) }).where(eq(settings.key, 'target'));
  }
};
```

- [ ] **Step 2: Stationery checklist autosave endpoint**

```ts
// src/routes/dashboard/stationery/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { stationeryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const { id, done } = await request.json();
  await db.update(stationeryItems).set({ done: !!done }).where(eq(stationeryItems.id, id));
  return json({ ok: true });
};
```

- [ ] **Step 3: Budget page UI (editable rows, add/remove, totals, stationery)**

```svelte
<!-- src/routes/dashboard/budget/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  let earmark = $derived(data.lines.reduce((a, l) => a + l.budgeted, 0));
  let confirmed = $derived(data.lines.reduce((a, l) => a + l.confirmed, 0));
  let paid = $derived(data.lines.reduce((a, l) => a + l.paid, 0));

  async function toggleStatio(item: any, checked: boolean) {
    await fetch('/dashboard/stationery', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id, done: checked }) });
  }
</script>

<SectionHeading>Budget</SectionHeading><Rule />
<div class="grid">
  <form method="POST" action="?/setTarget" use:enhance class="stat-form">
    <label>Target £ <input name="target" type="number" value={data.target} /></label>
    <button>Save</button>
  </form>
  <Stat value={gbp(earmark)} label="Total earmarked" />
  <Stat value={gbp(confirmed)} label="Confirmed costs" />
  <Stat value={gbp(paid)} label="Paid to date" accent />
</div>

<div class="card">
  <table>
    <thead><tr><th>Category</th><th class="r">Budgeted</th><th class="r">Confirmed</th><th class="r">Paid</th><th>Status</th><th></th></tr></thead>
    <tbody>
      {#each data.lines as line (line.id)}
        <tr>
          <td colspan="6" class="rowcell">
            <form method="POST" action="?/update" use:enhance class="rowform">
              <input type="hidden" name="id" value={line.id} />
              <input name="category" value={line.category} class="cat" />
              <input name="budgeted" type="number" value={line.budgeted} class="num" />
              <input name="confirmed" type="number" value={line.confirmed} class="num" />
              <input name="paid" type="number" value={line.paid} class="num" />
              <select name="status" value={line.status}><option value="todo">To do</option><option value="booked">Booked</option><option value="paid">Paid</option></select>
              <button class="save">Save</button>
            </form>
            <form method="POST" action="?/remove" use:enhance class="rm"><input type="hidden" name="id" value={line.id} /><button>×</button></form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <form method="POST" action="?/add" use:enhance class="addrow">
    <input name="category" placeholder="New budget line…" />
    <button>+ Add line</button>
  </form>
</div>

<Card kicker="Stationery — what you'll need">
  {#each data.statio as item}
    <label class="statio"><input type="checkbox" checked={item.done} onchange={(e) => toggleStatio(item, (e.target as HTMLInputElement).checked)} /> {item.label}</label>
  {/each}
</Card>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .stat-form { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; display: grid; gap: 8px; }
  .stat-form label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: grid; gap: 6px; }
  .stat-form input { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 18px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 14px 18px; margin-bottom: 18px; }
  table { width: 100%; }
  th { text-align: left; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 8px; }
  th.r { text-align: right; }
  .rowform { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 6px 0; }
  .rowform .cat { flex: 1 1 180px; }
  .rowform input, .rowform select { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
  .rowform .num { width: 90px; text-align: right; }
  .rowcell { display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--line2); }
  .save, .addrow button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
  .rm button { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .addrow { display: flex; gap: 10px; margin-top: 12px; }
  .addrow input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; }
  .statio { display: block; padding: 5px 0; font-size: 14px; }
</style>
```

- [ ] **Step 4: Verify + commit**

Add a line, edit it, remove it, toggle stationery, change target — all persist across reload.

```bash
git add src/routes/dashboard/budget src/routes/dashboard/stationery
git commit -m "feat: budget CRUD and stationery checklist"
```

---

### Task 15: Suppliers page (CRUD)

**Files:**
- Create: `src/routes/dashboard/suppliers/+page.server.ts`, `src/routes/dashboard/suppliers/+page.svelte`

- [ ] **Step 1: Load + actions**

```ts
// src/routes/dashboard/suppliers/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { suppliers } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => ({
  suppliers: await db.select().from(suppliers).orderBy(asc(suppliers.sort))
});

export const actions: Actions = {
  add: async () => { await db.insert(suppliers).values({ category: 'New', status: 'todo', sort: 999 }); },
  update: async ({ request }) => {
    const f = await request.formData();
    await db.update(suppliers).set({
      category: String(f.get('category')), name: String(f.get('name') ?? ''),
      contact: String(f.get('contact') ?? ''), status: String(f.get('status')),
      notes: String(f.get('notes') ?? '')
    }).where(eq(suppliers.id, Number(f.get('id'))));
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(suppliers).where(eq(suppliers.id, Number(f.get('id'))));
  }
};
```

- [ ] **Step 2: UI (follow the budget page row-form pattern)**

```svelte
<!-- src/routes/dashboard/suppliers/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<SectionHeading>Suppliers</SectionHeading><Rule />
<div class="card">
  {#each data.suppliers as s (s.id)}
    <div class="row">
      <form method="POST" action="?/update" use:enhance class="rowform">
        <input type="hidden" name="id" value={s.id} />
        <input name="category" value={s.category} placeholder="Category" />
        <input name="name" value={s.name ?? ''} placeholder="Supplier" />
        <input name="contact" value={s.contact ?? ''} placeholder="Contact" />
        <select name="status" value={s.status}><option value="todo">To do</option><option value="short">Shortlist</option><option value="booked">Booked</option></select>
        <input name="notes" value={s.notes ?? ''} placeholder="Notes" class="notes" />
        <button>Save</button>
      </form>
      <form method="POST" action="?/remove" use:enhance><input type="hidden" name="id" value={s.id} /><button class="rm">×</button></form>
    </div>
  {/each}
  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add supplier</button></form>
</div>

<style>
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
  .row { display: flex; gap: 8px; align-items: center; border-bottom: 1px solid var(--line2); padding: 6px 0; }
  .rowform { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
  .rowform input, .rowform select { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
  .rowform .notes { flex: 1 1 200px; }
  .rowform button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .add { margin-top: 12px; }
  .add button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
</style>
```

- [ ] **Step 3: Verify + commit**

```bash
git add src/routes/dashboard/suppliers
git commit -m "feat: suppliers CRUD page"
```

---

### Task 16: Timeline page (phases + items CRUD, toggle done)

**Files:**
- Create: `src/routes/dashboard/timeline/+page.server.ts`, `src/routes/dashboard/timeline/+page.svelte`

- [ ] **Step 1: Load grouped by phase + actions**

```ts
// src/routes/dashboard/timeline/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { timelinePhases, timelineItems } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const phases = await db.select().from(timelinePhases).orderBy(asc(timelinePhases.sort));
  const items = await db.select().from(timelineItems).orderBy(asc(timelineItems.sort));
  return { phases: phases.map((p) => ({ ...p, items: items.filter((i) => i.phaseId === p.id) })) };
};

export const actions: Actions = {
  toggle: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const [row] = await db.select().from(timelineItems).where(eq(timelineItems.id, id));
    if (row) await db.update(timelineItems).set({ done: !row.done }).where(eq(timelineItems.id, id));
  },
  addItem: async ({ request }) => {
    const f = await request.formData();
    await db.insert(timelineItems).values({ phaseId: Number(f.get('phaseId')), label: String(f.get('label') ?? 'New task'), done: false, sort: 999 });
  },
  removeItem: async ({ request }) => {
    const f = await request.formData();
    await db.delete(timelineItems).where(eq(timelineItems.id, Number(f.get('id'))));
  },
  addPhase: async ({ request }) => {
    const f = await request.formData();
    await db.insert(timelinePhases).values({ title: String(f.get('title') ?? 'New phase'), window: String(f.get('window') ?? ''), sort: 999 });
  }
};
```

- [ ] **Step 2: UI**

```svelte
<!-- src/routes/dashboard/timeline/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<SectionHeading>Timeline</SectionHeading><Rule />
{#each data.phases as phase (phase.id)}
  <div class="phase">
    <div class="head"><span class="t">{phase.title}</span><span class="w">{phase.window}</span></div>
    {#each phase.items as item (item.id)}
      <div class="item" class:done={item.done}>
        <form method="POST" action="?/toggle" use:enhance><input type="hidden" name="id" value={item.id} /><button class="dot" class:on={item.done} aria-label="toggle"></button></form>
        <span class="x">{item.label}</span>
        <form method="POST" action="?/removeItem" use:enhance><input type="hidden" name="id" value={item.id} /><button class="rm">×</button></form>
      </div>
    {/each}
    <form method="POST" action="?/addItem" use:enhance class="additem">
      <input type="hidden" name="phaseId" value={phase.id} />
      <input name="label" placeholder="Add a task…" /><button>+</button>
    </form>
  </div>
{/each}
<form method="POST" action="?/addPhase" use:enhance class="addphase">
  <input name="title" placeholder="New phase title" /><input name="window" placeholder="Window (e.g. Spring 2027)" /><button>+ Add phase</button>
</form>

<style>
  .phase { margin-bottom: 26px; }
  .head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .head .t { font-family: var(--serif); font-weight: 600; font-size: 20px; color: var(--ink); }
  .head .w { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: var(--sage); }
  .item { display: flex; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line2); }
  .item .x { flex: 1; font-size: 14px; }
  .item.done .x { color: var(--muted); text-decoration: line-through; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--rule); background: transparent; cursor: pointer; padding: 0; }
  .dot.on { background: var(--sage); border-color: var(--sage); }
  .rm { background: none; border: 0; color: var(--faint); font-size: 16px; cursor: pointer; }
  .additem { display: flex; gap: 8px; margin-top: 8px; }
  .additem input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; }
  .additem button, .addphase button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; }
  .addphase { display: flex; gap: 8px; margin-top: 20px; }
  .addphase input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; }
</style>
```

- [ ] **Step 3: Verify + commit**

```bash
git add src/routes/dashboard/timeline
git commit -m "feat: timeline phases and items CRUD"
```

---

### Task 17: Seating page (assignments)

**Files:**
- Create: `src/routes/dashboard/seating/+page.server.ts`, `src/routes/dashboard/seating/+page.svelte`

- [ ] **Step 1: Load + assign/unassign/table-count actions**

```ts
// src/routes/dashboard/seating/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { guests, seatAssignments, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const all = await db.select().from(guests);
  const seats = await db.select().from(seatAssignments);
  const setRows = await db.select().from(settings);
  const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
  const seatMap = new Map(seats.map((x) => [x.guestId, x.tableNo]));
  return {
    tableCount: Number(s.tableCount ?? 7),
    seatMode: s.seatMode ?? 'day',
    guests: all.map((g) => ({ ...g, tableNo: seatMap.get(g.id) ?? null }))
  };
};

export const actions: Actions = {
  assign: async ({ request }) => {
    const f = await request.formData();
    const guestId = Number(f.get('guestId'));
    const tableNo = Number(f.get('tableNo'));
    if (Number.isNaN(tableNo)) {
      await db.delete(seatAssignments).where(eq(seatAssignments.guestId, guestId));
    } else {
      await db.insert(seatAssignments).values({ guestId, tableNo })
        .onConflictDoUpdate({ target: seatAssignments.guestId, set: { tableNo } });
    }
  },
  setTableCount: async ({ request }) => {
    const f = await request.formData();
    await db.update(settings).set({ value: String(Number(f.get('tableCount')) || 1) }).where(eq(settings.key, 'tableCount'));
  },
  clear: async () => { await db.delete(seatAssignments); }
};
```

- [ ] **Step 2: UI (unassigned list + tables, dropdown to assign)**

```svelte
<!-- src/routes/dashboard/seating/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
  let pool = $derived(data.seatMode === 'day' ? data.guests.filter((g) => g.attendanceType === 'day') : data.guests);
  let unassigned = $derived(pool.filter((g) => g.tableNo == null));
  const tables = $derived(Array.from({ length: data.tableCount }, (_, i) => i + 1));
</script>

<SectionHeading>Seating chart</SectionHeading><Rule />
<div class="ctrls">
  <form method="POST" action="?/setTableCount" use:enhance>
    <label>Tables <input name="tableCount" type="number" min="1" max="30" value={data.tableCount} /></label><button>Set</button>
  </form>
  <form method="POST" action="?/clear" use:enhance><button class="clear">Clear all</button></form>
</div>

<div class="card">
  <h3 class="kick">Unassigned · {unassigned.length}</h3>
  <div class="chips">
    {#each unassigned as g (g.id)}
      <form method="POST" action="?/assign" use:enhance class="chip">
        <span>{g.name}</span>
        <input type="hidden" name="guestId" value={g.id} />
        <select name="tableNo" onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}>
          <option value="">Table…</option>
          {#each tables as t}<option value={t}>Table {t}</option>{/each}
        </select>
      </form>
    {/each}
  </div>
</div>

<div class="tables">
  {#each tables as t}
    {@const seated = pool.filter((g) => g.tableNo === t)}
    <div class="tbl">
      <div class="cap"><span class="nm">Table {t}</span><span class="ct" class:over={seated.length > 10}>{seated.length}/10</span></div>
      <ul>
        {#each seated as g (g.id)}
          <li>{g.name}
            <form method="POST" action="?/assign" use:enhance class="inline"><input type="hidden" name="guestId" value={g.id} /><input type="hidden" name="tableNo" value="" /><button class="rm">×</button></form>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</div>

<style>
  .ctrls { display: flex; gap: 18px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .ctrls form { display: flex; gap: 8px; align-items: center; }
  .ctrls label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; gap: 8px; align-items: center; }
  .ctrls input { border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; width: 80px; font: inherit; }
  .ctrls button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 11px; text-transform: uppercase; }
  .ctrls .clear { background: transparent; color: var(--faint); border: 1px solid var(--line); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 18px; }
  .kick { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; background: #faf8f2; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; font-size: 12.5px; }
  .chip select { border: 0; background: transparent; color: var(--sage); cursor: pointer; font: inherit; font-size: 11px; }
  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: 16px; }
  .tbl { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .cap { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .cap .nm { font-weight: 600; }
  .cap .ct { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--sage); }
  .cap .ct.over { color: var(--terra); }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 3px 0; }
  .inline { display: inline; }
  .rm { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 13px; }
</style>
```

- [ ] **Step 3: Verify + commit**

Assign a guest to a table, reload — persists. Remove with ×.

```bash
git add src/routes/dashboard/seating
git commit -m "feat: seating assignments page"
```

---

### Task 18: Notes page (static prose)

**Files:**
- Create: `src/routes/dashboard/notes/+page.svelte`

- [ ] **Step 1: Port the research/notes cards from the HTML**

```svelte
<!-- src/routes/dashboard/notes/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Card from '$lib/components/Card.svelte';
  import Alert from '$lib/components/Alert.svelte';
</script>

<SectionHeading>Research &amp; notes</SectionHeading><Rule />
<Card kicker="The Tithe Barn, Bolton Abbey (Cripps & Co)">
  <p>16th-century Grade II* listed barn on the Bolton Abbey Estate. Capacity 200 (ceremony & feast), 300 (drinks & dancing). Licensed for civil ceremonies. Late licence to 1am, Funktion-One sound, underfloor heating, fire pits, dog-friendly.</p>
  <p><b>All food & drink is in-house</b> — no external caterer. Book a <b>Feast Night</b> to taste & finalise the menu. Quote changes allowed up to 6 weeks before.</p>
  <p class="fine">enquiries@crippsboltonabbey.com · +44 1756 631 000 · coordinator Laura</p>
</Card>
<Card kicker="Adam Lowndes — Photographer (booked)">
  <p>Stoke-on-Trent based, travels UK. Relaxed, personality-led style. hello@adamlowndes.co.uk · 07527 547 073</p>
</Card>
<Alert title="Check the shopping list against venue rules">
  Confetti must be <b>fresh petals only</b>. No fireworks, confetti cannons, Chinese lanterns, balloons or drones. Confirm whether sparklers are allowed. No décor fixed to walls/beams.
</Alert>

<style>.fine { font-size: 12.5px; color: var(--muted); }</style>
```

> Port the remaining note cards (venue logistics, "good to know") from the HTML faithfully.

- [ ] **Step 2: Verify + commit**

```bash
git add src/routes/dashboard/notes
git commit -m "feat: research and notes page"
```

---

## Phase 5 — RSVP, QR codes, and public pages

### Task 19: RSVP submission logic (tested)

**Files:**
- Create: `src/lib/server/rsvp.ts`
- Test: `tests/rsvp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/rsvp.test.ts
import { describe, it, expect } from 'vitest';
import { parseRsvp } from '../src/lib/server/rsvp';

const members = [
  { id: 1, isChild: false }, { id: 2, isChild: false }, { id: 3, isChild: true }
];

describe('parseRsvp', () => {
  it('maps per-guest attendance, meal and dietary; nulls meal for children and decliners', () => {
    const fd = new FormData();
    fd.set('attend_1', 'yes'); fd.set('meal_1', 'veg'); fd.set('diet_1', 'no nuts');
    fd.set('attend_2', 'no');  fd.set('meal_2', 'non-veg');
    fd.set('attend_3', 'yes'); fd.set('diet_3', 'small portion');
    fd.set('message', 'Cannot wait!');
    const r = parseRsvp(fd, members);
    expect(r.message).toBe('Cannot wait!');
    expect(r.guests).toEqual([
      { id: 1, rsvpStatus: 'yes', meal: 'veg', dietaryNotes: 'no nuts' },
      { id: 2, rsvpStatus: 'no', meal: null, dietaryNotes: null },        // declined -> meal nulled
      { id: 3, rsvpStatus: 'yes', meal: null, dietaryNotes: 'small portion' } // child -> no meal
    ]);
  });

  it('defaults missing attendance to pending', () => {
    const r = parseRsvp(new FormData(), [{ id: 9, isChild: false }]);
    expect(r.guests[0].rsvpStatus).toBe('pending');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/rsvp.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the parser**

```ts
// src/lib/server/rsvp.ts
export interface RsvpMember { id: number; isChild: boolean; }
export interface ParsedGuest { id: number; rsvpStatus: 'pending'|'yes'|'no'; meal: 'veg'|'non-veg'|null; dietaryNotes: string | null; }
export interface ParsedRsvp { guests: ParsedGuest[]; message: string | null; }

export function parseRsvp(fd: FormData, members: RsvpMember[]): ParsedRsvp {
  const guests = members.map((m) => {
    const attend = String(fd.get(`attend_${m.id}`) ?? 'pending');
    const status = attend === 'yes' ? 'yes' : attend === 'no' ? 'no' : 'pending';
    const rawMeal = String(fd.get(`meal_${m.id}`) ?? '');
    const meal = (status === 'yes' && !m.isChild && (rawMeal === 'veg' || rawMeal === 'non-veg')) ? rawMeal : null;
    const rawDiet = String(fd.get(`diet_${m.id}`) ?? '').trim();
    const dietaryNotes = status === 'yes' && rawDiet ? rawDiet : null;
    return { id: m.id, rsvpStatus: status as ParsedGuest['rsvpStatus'], meal, dietaryNotes };
  });
  const msg = String(fd.get('message') ?? '').trim();
  return { guests, message: msg || null };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/rsvp.test.ts`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/rsvp.ts tests/rsvp.test.ts
git commit -m "feat: RSVP form parsing with tests"
```

---

### Task 20: Public RSVP page (load + action + UI)

**Files:**
- Create: `src/routes/rsvp/[token]/+page.server.ts`, `src/routes/rsvp/[token]/+page.svelte`

- [ ] **Step 1: Load group by token, action writes via parser**

```ts
// src/routes/rsvp/[token]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { groupWithMembers } from '$lib/server/queries';
import { parseRsvp } from '$lib/server/rsvp';
import { db } from '$lib/server/db/index';
import { guests, inviteGroups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const data = await groupWithMembers(params.token);
  if (!data) throw error(404, 'Invitation not found');
  return { group: data.group, members: data.members };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data = await groupWithMembers(params.token);
    if (!data) throw error(404);
    const fd = await request.formData();
    const parsed = parseRsvp(fd, data.members.map((m) => ({ id: m.id, isChild: m.isChild })));
    for (const g of parsed.guests) {
      await db.update(guests).set({ rsvpStatus: g.rsvpStatus, meal: g.meal, dietaryNotes: g.dietaryNotes }).where(eq(guests.id, g.id));
    }
    await db.update(inviteGroups).set({ message: parsed.message, respondedAt: new Date() }).where(eq(inviteGroups.id, data.group.id));
    return { saved: true };
  }
};
```

- [ ] **Step 2: RSVP UI (per-person, kids menu, message, re-editable)**

```svelte
<!-- src/routes/rsvp/[token]/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

<main class="rsvp">
  <p class="eyebrow">You are invited to the wedding of</p>
  <h1 class="script">Alex &amp; Katie</h1>
  <p class="when">Thursday 2 April 2027 · The Tithe Barn, Bolton Abbey</p>

  {#if form?.saved}
    <div class="thanks">Thank you — your reply is saved. You can change it any time from this link.</div>
  {/if}

  <form method="POST" use:enhance>
    {#each data.members as m (m.id)}
      <fieldset>
        <legend>{m.name} <span class="type">· {m.attendanceType === 'day' ? 'Day & evening' : 'Evening reception'}</span></legend>
        <div class="attend">
          <label><input type="radio" name="attend_{m.id}" value="yes" checked={m.rsvpStatus === 'yes'} /> Joyfully accepts</label>
          <label><input type="radio" name="attend_{m.id}" value="no" checked={m.rsvpStatus === 'no'} /> Regretfully declines</label>
        </div>
        {#if m.isChild}
          <p class="kids">Children are served from our <b>kids' menu</b>.</p>
          <label class="field">Allergies / dietary notes<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} /></label>
        {:else}
          <div class="meal">
            <label><input type="radio" name="meal_{m.id}" value="veg" checked={m.meal === 'veg'} /> Vegetarian</label>
            <label><input type="radio" name="meal_{m.id}" value="non-veg" checked={m.meal === 'non-veg'} /> Non-vegetarian</label>
          </div>
          <label class="field">Allergies / dietary notes<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} /></label>
        {/if}
      </fieldset>
    {/each}
    <label class="field msg">A message to the couple (optional)<textarea name="message" rows="3">{data.group.message ?? ''}</textarea></label>
    <button type="submit">Send our reply</button>
  </form>
</main>

<style>
  .rsvp { max-width: 560px; margin: 0 auto; padding: 8vh 24px 80px; text-align: center; }
  .rsvp h1 { font-size: clamp(56px, 14vw, 96px); margin: 6px 0; }
  .when { letter-spacing: .14em; text-transform: uppercase; font-size: 11.5px; color: #5f5b50; margin-bottom: 28px; }
  .thanks { background: var(--sage-soft); color: var(--sage-deep); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
  fieldset { border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; margin: 0 0 16px; text-align: left; }
  legend { font-family: var(--serif); font-size: 22px; color: var(--ink); padding: 0 8px; }
  .type { font-family: var(--sans); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .attend, .meal { display: flex; gap: 18px; flex-wrap: wrap; margin: 10px 0; }
  .attend label, .meal label { font-size: 14px; }
  .kids { font-size: 13.5px; color: var(--body); background: var(--rose-bg); padding: 8px 12px; border-radius: 8px; }
  .field { display: grid; gap: 6px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-top: 8px; }
  .field input, .field textarea { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 14px; text-transform: none; letter-spacing: normal; color: var(--ink); }
  .msg { margin-top: 8px; }
  button { margin-top: 18px; background: var(--sage); color: #fff; border: 0; border-radius: 10px; padding: 14px 28px; letter-spacing: .1em; text-transform: uppercase; font-size: 13px; cursor: pointer; }
</style>
```

- [ ] **Step 3: Verify end-to-end**

Get a token: `sqlite3 local.db "SELECT token FROM invite_groups LIMIT 1;"`. Visit `/rsvp/<token>` (no login), submit, confirm the thank-you state, reload to see saved answers, then check the Guests dashboard shows the RSVP.

- [ ] **Step 4: Commit**

```bash
git add src/routes/rsvp
git commit -m "feat: public per-household RSVP page"
```

---

### Task 21: Invites dashboard (QR codes + print)

**Files:**
- Create: `src/routes/dashboard/invites/+page.server.ts`, `src/routes/dashboard/invites/+page.svelte`

- [ ] **Step 1: Load groups with members + server-rendered QR SVGs**

```ts
// src/routes/dashboard/invites/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';

export const load: PageServerLoad = async () => {
  const base = env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
  const groups = await db.select().from(inviteGroups).orderBy(asc(inviteGroups.name));
  const allGuests = await db.select().from(guests);
  const rows = await Promise.all(groups.map(async (g) => {
    const members = allGuests.filter((m) => m.groupId === g.id);
    const url = `${base}/rsvp/${g.token}`;
    const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 160 });
    const responded = members.filter((m) => m.rsvpStatus !== 'pending').length;
    return { id: g.id, name: g.name, url, qr, members, responded, total: members.length };
  }));
  return { rows };
};
```

- [ ] **Step 2: UI with print stylesheet**

```svelte
<!-- src/routes/dashboard/invites/+page.svelte -->
<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  let { data } = $props();
</script>

<div class="noprint">
  <SectionHeading>Invites &amp; QR codes</SectionHeading><Rule />
  <p class="hint">One card per household. Print this page to slip QR cards into your invitations. Each code opens that household's RSVP page.</p>
  <button onclick={() => window.print()}>Print all</button>
</div>

<div class="cards">
  {#each data.rows as r (r.id)}
    <div class="invite">
      <div class="qr">{@html r.qr}</div>
      <div class="who">
        <p class="eyebrow">Alex &amp; Katie · 2 Apr 2027</p>
        <h3>{r.name}</h3>
        <p class="members">{r.members.map((m) => m.name).join(', ')}</p>
        <p class="link noprint">{r.url} · <span class:done={r.responded === r.total}>{r.responded}/{r.total} replied</span></p>
      </div>
    </div>
  {/each}
</div>

<style>
  .hint { color: var(--body); max-width: 560px; }
  button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; cursor: pointer; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; margin-bottom: 24px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .invite { display: flex; gap: 16px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px; break-inside: avoid; }
  .qr { width: 110px; height: 110px; flex: 0 0 auto; }
  .qr :global(svg) { width: 100%; height: 100%; }
  .who h3 { font-family: var(--serif); font-size: 22px; margin: 4px 0; }
  .members { font-size: 12.5px; color: var(--body); }
  .link { font-size: 11px; color: var(--faint); margin-top: 6px; }
  .link .done { color: var(--sage-deep); }
  @media print {
    .noprint { display: none !important; }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .invite { border-color: #ddd; }
  }
</style>
```

- [ ] **Step 3: Verify + commit**

Confirm QR codes render, scanning one (or visiting the printed URL) opens the right RSVP page; print preview hides controls.

```bash
git add src/routes/dashboard/invites
git commit -m "feat: invites page with QR codes and print layout"
```

---

### Task 22: Public landing page

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Replace the scaffold landing with an elegant holding page**

```svelte
<!-- src/routes/+page.svelte -->
<main class="landing">
  <p class="eyebrow">Together with their families</p>
  <h1 class="script">Alex &amp; Katie</h1>
  <p class="date">are getting married</p>
  <p class="meta">Thursday 2 April 2027 · The Tithe Barn, Bolton Abbey</p>
  <p class="note">If you've received an invitation, please use the QR code or personal link to RSVP.</p>
</main>

<style>
  .landing { max-width: 620px; margin: 0 auto; padding: 16vh 24px; text-align: center; }
  .landing h1 { font-size: clamp(64px, 16vw, 120px); margin: 8px 0; }
  .date { font-family: var(--serif); font-size: 22px; color: var(--ink); }
  .meta { letter-spacing: .18em; text-transform: uppercase; font-size: 12px; color: #5f5b50; margin-top: 14px; }
  .note { color: var(--body); margin-top: 28px; }
</style>
```

- [ ] **Step 2: Verify + commit**

Visit `/` logged out — elegant landing, no auth required.

```bash
git add src/routes/+page.svelte
git commit -m "feat: public landing page"
```

---

## Phase 6 — Final verification

### Task 23: Full-app smoke test & docs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass (seed, auth, queries, quote, rsvp).

- [ ] **Step 2: Type-check and build**

Run: `npm run check && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Manual smoke checklist**

Run `npm run preview` and verify:
- `/` landing loads without auth.
- `/dashboard` redirects to `/login`; correct passcode grants access.
- Each dashboard tab renders seeded data.
- Budget/suppliers/timeline/seating CRUD persists across reload.
- Costs autosave persists.
- `/rsvp/<token>` submits and reflects on the Guests + Overview pages, with kids handled (no meal toggle) and catering split correct.
- Invites page renders QR codes and prints cleanly.

- [ ] **Step 4: Write README**

```markdown
# Alex & Katie — Wedding App

SvelteKit + Drizzle + libSQL. Private passcode dashboard + public QR RSVP.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env`; set `SESSION_SECRET`, `PUBLIC_BASE_URL`, and `ADMIN_PASSCODE_HASH`
   (generate the hash with the snippet in `src/lib/server/auth.ts`).
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev`

## Deploy
- DigitalOcean droplet: `adapter-auto` → node; ship `local.db` or point `DATABASE_URL` at a file on disk; back up by copying the file.
- Vercel + Turso: set `DATABASE_URL`/`DATABASE_AUTH_TOKEN` to the Turso DB; run migrations against it.

## Tests
`npm test`
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README and finalise wedding app"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** SvelteKit migration (Tasks 1, 9), Drizzle/libSQL (2, 3), passcode auth (6, 7), refined-botanical design (8), seed with household grouping + kids (4, 5), all dashboard tabs incl. CRUD for budget/suppliers/timeline/seating (11–18), inline-edit autosave for quote/stationery (13, 14), RSVP with per-person + kids menu + message (19, 20), QR + print (21), public landing (22), deployment notes (23). Notes-as-static is honoured (18).
- **Type consistency:** `summarise`/`GuestRow`, `computeQuote`/`QuoteLineCalc`, `parseRsvp`/`RsvpMember`, `buildInviteGroups`/`SeedGuest` are defined once and reused by their consumers. Schema field names (`rsvpStatus`, `attendanceType`, `isChild`, `tableNo`, `respondedAt`) are used consistently across queries, actions, and components.
- **Known implementer follow-up:** Task 4 requires reading `Wedding_Dashboard.html` lines 537–end to recover exact budget rows and stationery labels (flagged inline) — the planning read stopped at line 536.
```

# Notes authorship, vendor CRM & per-user auth — design

**Date:** 2026-06-26
**Status:** Approved — ready for implementation plan

## Summary

Three connected changes to the wedding dashboard, plus a safe data/schema migration:

1. **Per-user auth.** Replace the single shared passcode with two passcodes — one for Alex, one for Katie — so the session carries a pseudo-user identity. This unlocks attribution and audit logging.
2. **Audit logging across all dashboard writes**, plus a viewable Activity feed.
3. **Notes get authorship + Notion-style comments.**
4. **Suppliers redefined as Vendors** — a mini-CRM for everyone we're talking to; "supplier" becomes a state of a vendor (booked + deposit paid), set via a tickbox.

All schema and data changes ship as runnable migrations that work against both the local SQLite file and Turso.

## Non-goals

- No email/OAuth/multi-tenant auth — two pseudo-users only.
- No nested/threaded comment replies — flat comments per note (Notion-page style).
- No new permissions model — both users can do everything; identity is for attribution, not authorization.

---

## 1. Auth & identity

### Users

New `users` table holds **non-secret identity only** (attribution + FK target):

```
users
  id        integer pk autoincrement
  slug      text unique     -- 'alex' | 'katie'
  name      text            -- 'Alex' | 'Katie'
```

Seeded idempotently by the data-migration script.

### Passcodes (env)

Consistent with today's `ADMIN_PASSCODE_HASH`, passcode hashes stay in env:

- `PASSCODE_HASH_ALEX`
- `PASSCODE_HASH_KATIE`

`ADMIN_PASSCODE_HASH` is removed. `.env.example` documents the two new vars and how to generate them with `hashPasscode()`.

### Login

The login form is unchanged — a single passcode box. The server verifies the entered passcode against each user's hash; the user whose hash matches is the identity. No match → the existing "That passcode is not right." error.

### Session

`src/lib/server/auth.ts`:

- `signSession(secret, slug)` → `slug.issuedAt.sig` (HMAC over `slug.issuedAt`).
- `verifySession(token, secret)` → `{ slug } | null` (integrity-checked).

`hooks.server.ts` resolves the slug, looks up the user once, and sets `locals.user = { id, slug, name } | null`. `locals.authed` stays as a derived boolean (`!!locals.user`) so existing guards keep working.

`app.d.ts`: `Locals` gains `user: { id: number; slug: string; name: string } | null`.

The dashboard rail footer shows "Signed in as {name}".

---

## 2. Audit log (all dashboard writes)

### Table

```
audit_log
  id         integer pk autoincrement
  userId     integer fk -> users.id   -- nullable (system / unauthenticated cron)
  action     text   -- 'create' | 'update' | 'delete'
  entity     text   -- 'vendor' | 'note' | 'comment' | 'budget_line' | 'guest' | ...
  entityId   integer                  -- nullable
  summary    text   -- human-readable, e.g. "Booked Adam Lowndes"
  createdAt  integer (timestamp)
```

### Helper

`src/lib/server/audit.ts`:

```ts
recordAudit(locals, { action, entity, entityId, summary })
```

Reads `locals.user` for `userId`, stamps `createdAt`, inserts a row. Fire-and-await; never blocks the response on failure (wrapped so a logging error can't break the write).

### Instrumented write paths

Every mutation calls `recordAudit` as a one-liner. Coverage:

- Vendors: `dashboard/vendors/edit`, add/remove actions
- Notes & comments: `dashboard/notes/edit`
- Budget: `dashboard/budget/line`, `dashboard/budget/reorder`
- Guests: `dashboard/guests/edit`
- Seating: `dashboard/seating/place`, `dashboard/seating/layout`
- Invites: `dashboard/invites/message`
- Timeline: `dashboard/timeline/reorder`, item toggles
- Shopping: `dashboard/shopping/item`
- Stationery: `dashboard/stationery`
- Calendar/appointments
- Venue: `dashboard/venue/quote`

The cron timeline-check writes with `userId = null` (system).

### Activity feed

New route `/dashboard/activity`, added to the **Planning** nav group. Reverse-chronological list: `{name|System} {action} {entity} — {summary} · {relative time}`. Simple paginated/limited (e.g. last 200). Note-related entries also surface inline on a note (see §3).

---

## 3. Notes: authorship + comments

### Schema changes

`notes` gains:

- `authorId` integer fk -> users.id (nullable — existing rows backfill to null = "Imported")
- `lastEditedById` integer fk -> users.id (nullable)

New `note_comments` table:

```
note_comments
  id         integer pk autoincrement
  noteId     integer fk -> notes.id (cascade delete)
  authorId   integer fk -> users.id   -- nullable
  body       text not null
  createdAt  integer (timestamp)
  updatedAt  integer (timestamp)
```

Flat thread per note.

### Endpoint

`dashboard/notes/edit` (`+server.ts`) extended:

- `create` / `update` set `authorId` / `lastEditedById` from `locals.user`.
- New ops: `comment.create` `{ noteId, body }`, `comment.update` `{ id, body }`, `comment.delete` `{ id }`.
- All ops call `recordAudit`.

The notes load query joins authors and counts/loads comments so the UI can render attribution and threads.

### UI (`Notes.svelte`)

- Each note shows "**{author}** · {date}" and, when edited, "edited by {name}".
- A comments affordance per note: count + expand → flat list of comments (each with author + time + edit/delete for one's own) + an add-comment box.
- Author for new notes/comments is implicit (the signed-in user); no author picker.
- `NoteRow` type extended with `authorName`, `lastEditedByName`, `comments`.

---

## 4. Suppliers → Vendors (mini-CRM)

### Rename (data-preserving)

- Table `suppliers` → `vendors` (`ALTER TABLE ... RENAME TO`).
- Route `/dashboard/suppliers` → `/dashboard/vendors` (directory move; `dashboard/suppliers/edit` → `dashboard/vendors/edit`).
- Nav label "Suppliers" → "Vendors"; page META updated.
- `appointments.supplier_id` → `vendor_id` (`ALTER TABLE ... RENAME COLUMN`).
- `notes.entity_type` value `'supplier'` → `'vendor'`; `ENTITY_KINDS.supplier` → `vendor` in `src/lib/notes.ts`.

### New `vendors` columns (CRM)

- Contact (structured, keep freeform `contact` too): `phone`, `email`, `website`, `address`
- `stage` text — `Lead | Enquired | Quoted | Shortlisted | Booked` (replaces `todo/short/booked`)
- `quotedAmount` real, `depositAmount` real
- **`depositPaid` boolean — the tickbox.** Ticking it marks the vendor as the chosen supplier.
- `followUpDate` text (ISO date) — eligible to feed reminders later
- `priority` integer (1–3) — rank vendors within a category
- `description` text — freeform longer notes

`isSupplier` is **derived from `depositPaid`** (no separate stored column) — a vendor with `depositPaid = true` is the "Chosen supplier". Keeping it derived avoids two columns that can disagree.

### Behaviour

- The Vendors page presents all vendors as a CRM grouped/sortable by category and stage, with the new fields editable inline (autosave, matching the existing pattern).
- A vendor with `depositPaid` checked is badged "Chosen supplier".
- The existing Slack "booked" notification is **rewired**: it fires when `depositPaid` transitions false→true (was: `status → 'booked'`).
- All edits call `recordAudit`.

### Status → new fields mapping (migration)

| old `status` | new `stage`  | `depositPaid` |
|--------------|--------------|---------------|
| `booked`     | `Booked`     | `true`        |
| `short`      | `Shortlisted`| `false`       |
| `todo`       | `Lead`       | `false`       |

Existing `name`, `contact`, `notes`, `sort` preserved. Seed data (`SEED_SUPPLIERS`) updated to the new shape and renamed accordingly.

---

## 5. Migration strategy

### Schema migrations (`drizzle/`)

- Additive tables (`users`, `note_comments`, `audit_log`) and additive columns (vendors CRM fields, notes author columns) are generated via `drizzle-kit generate`.
- The **rename is hand-authored** in a migration file — `ALTER TABLE suppliers RENAME TO vendors`, `ALTER TABLE appointments RENAME COLUMN supplier_id TO vendor_id`, then `ADD COLUMN`s — so drizzle never interprets it as a destructive drop+create. The `_journal.json` and snapshot are updated to match the hand-authored file.
- Applied with the existing `npm run db:migrate` (drizzle-kit migrate), which targets `local.db` locally and Turso when `DATABASE_URL`/`DATABASE_AUTH_TOKEN` are set.

### Data migration (`npm run db:migrate:data`)

New script `src/lib/server/db/migrate-data.ts`, idempotent and re-runnable:

1. Seed `users` (alex, katie) if absent.
2. Map each vendor's legacy `status` → `stage` + `depositPaid` (only where `stage` not yet set).
3. `UPDATE notes SET entity_type = 'vendor' WHERE entity_type = 'supplier'`.
4. Leave existing note `authorId` null (rendered as "Imported").

### Run order (documented in DEPLOY.md)

```
npm run db:migrate        # schema
npm run db:migrate:data   # data backfill / mapping
```

Both safe to re-run. Works against local file and Turso.

---

## Risks & mitigations

- **Drizzle turning a rename into drop+create** → hand-author the rename migration; verify the generated SQL before committing.
- **Threading `locals.user` into every write** → centralised `recordAudit` helper keeps each call a one-liner; missing one only loses an audit row, never breaks a write.
- **Lockout from removing the shared passcode** → migration + `.env.example` make the two new hashes explicit; dev defaults documented so local login keeps working.
- **FK references after rename** → SQLite updates `appointments`' FK on `RENAME TO`; verified post-migration.

## Acceptance

- Logging in with Alex's vs Katie's passcode shows the right "Signed in as …".
- New notes/comments show the correct author; existing notes show "Imported".
- Comments can be added/edited/deleted on a note.
- Activity feed lists writes across vendors, notes, budget, etc., attributed correctly.
- Vendors page shows the CRM fields; ticking "deposit paid" badges "Chosen supplier" and fires Slack once.
- After `db:migrate` + `db:migrate:data`, all prior supplier/note data is intact and correctly mapped, on both local and Turso.

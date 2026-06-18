# Alex & Katie — Wedding App Design

**Date:** 2026-06-18
**Status:** Approved (design)
**Source:** Migration of `Wedding_Dashboard.html` (single-file vanilla HTML/JS) into a database-backed web app.

## Goal

Turn the existing single-file wedding dashboard into a real application that:

1. Is built on **SvelteKit** with a **refined-botanical** visual redesign (elegant, not corporate; honours the 16th-century barn / garden setting).
2. Persists planning data in a **SQLite-compatible database** so Alex & Katie can manage it for real.
3. Adds **per-household guest-facing RSVP pages** reached by **QR code**, capturing attendance, meal choice (veg/non-veg), allergies/dietary, and a message — the data that moves wedding planning forward.

This is a single iteration covering all three. The guest roster stays fixed/hardcoded (seeded), but RSVP data is live in the DB.

## Stack

- **SvelteKit** (Svelte 5 runes), server-side rendered.
- **Drizzle ORM** over **libSQL** — a local SQLite file in dev and on a DigitalOcean droplet; swappable to hosted **Turso** if deployed serverless. Same code either way.
- **`adapter-auto`** — deploys to a Node droplet (`adapter-node`) or Vercel without code changes.
- **Shared-passcode auth** — a single secret (env var, hashed) gates `/dashboard`; a signed session cookie keeps you logged in. No user table.
- **`qrcode`** library — server-side QR (inline SVG) for invite links.

## Architecture

Two zones in one app:

- **`/` (public, no login):** an elegant landing page + per-household RSVP pages reached by token/QR.
- **`/dashboard` (private, passcode):** the planning tool. Today's tabs become routes: overview, budget, costs, guests, seating, suppliers, timeline, notes — plus a new **invites** view for QR codes.

All mutations go through **SvelteKit form actions**, with a couple of `+server.ts` JSON endpoints for live-edit autosave (quote prices, stationery ticks). All DB access lives in `src/lib/server` and never reaches the client.

### Project structure

```
src/
  lib/
    server/db/       schema.ts, index.ts (drizzle client), seed.ts
    server/auth.ts   passcode check + cookie signing
    components/      shared Svelte components (Stat, Card, Pill, Alert, …)
    styles/          design tokens (the botanical system)
  routes/
    +layout.svelte                 global shell + fonts
    +page.svelte                   public landing
    login/                         passcode entry
    rsvp/[token]/                  guest RSVP page (load + form action)
    dashboard/
      +layout.server.ts            auth guard + shared data load
      +page.svelte                 overview
      budget/  costs/  guests/  seating/  suppliers/  timeline/  notes/  invites/
  hooks.server.ts                  auth gate, cookie check
drizzle/                           migrations
```

## Data model (Drizzle / libSQL)

Auth needs no table — passcode is an env var (hashed); a signed cookie marks the session.

### Guest & RSVP core

- **`invite_groups`** (households): `id`, `name` (e.g. "Dan & Zoe Grady"), `token` (unique random — the QR/link), `responded_at`, `message` (note to the couple). One QR per group.
- **`guests`** (seeded, immutable identity): `id`, `group_id` → invite_groups, `name`, `side` (G/B/X), `relationship_group`, `relation`, `role`, `attendance_type` (day/evening), `is_child` (boolean). DB-owned RSVP fields: `rsvp_status` (pending/yes/no), `meal` (veg/non-veg/null — null for children), `dietary_notes`.

### Admin-managed (full CRUD)

- **`budget_lines`**: `category`, `budgeted`, `confirmed`, `paid`, `status`, `sort`.
- **`timeline_phases`**: `title`, `window`, `sort`. **`timeline_items`**: `phase_id`, `label`, `done`, `sort`.
- **`suppliers`**: `category`, `name`, `contact`, `status`, `notes`, `sort`.
- **`seat_assignments`**: `guest_id`, `table_no`. (Table count + seat mode live in settings.)

### Seeded + inline-editable (DB-backed, like today)

- **`quote_lines`**: `label`, `section`, `scope` (day/eve/fixed/custom), `price`, `qty`, `included`, `confirmed`, `bond`, `sort`. Seeded from the current quote; prices/qty editable with autosave.
- **`stationery_items`**: `label`, `done`, `sort`.
- **`settings`** (key/value): target budget, day count, evening count, min spend, table count, seat mode, public base URL.

### Static (not DB)

- The Research & Notes cards are reference prose — they live in the page, not the database.

### Seeding (`seed.ts`, idempotent)

- Builds `invite_groups` by grouping the current roster into households (partners/families share one group + token).
- Placeholder rows ("Joshua +1", "Mule Plus One") are folded into their host's household so the QR goes to a real person.
- Marks children (`is_child`) — e.g. baby Grace, Florie Gledhill.
- Inserts all guests against their group; loads budget/timeline/suppliers/quote/stationery defaults from today's file.

## RSVP & QR flow

### Guest journey

1. Scan QR on the printed invite → `/rsvp/{token}` (unguessable random token, no login).
2. `load` fetches the invite group + members. Single elegant, mobile-first screen: couple's names, date, venue; each person sees their correct invitation type (day/evening, read-only).
3. **Per person**: *joyfully accepts / regretfully declines*. For each adult who accepts: **veg / non-veg** toggle + optional **allergies / dietary** field. For each **child**: *"Will {name} be joining us?"* + the **kids' menu displayed read-only** + an **allergies/dietary** field (no meal toggle). One **message to the couple** box for the whole group.
4. Submit → form action writes `rsvp_status`, `meal`, `dietary_notes` per guest and `message` + `responded_at` on the group → warm confirmation state.
5. **Re-editable**: returning to the link shows saved answers until RSVPs are closed. Progressive enhancement — works without JS.

### Couple's side — generating & printing QR codes

- **`/dashboard/invites`**: lists every household with name, members, RSVP status at a glance, the link, and a server-rendered **QR code** (inline SVG via `qrcode`).
- **Print stylesheet** for QR cards / a sheet to slip into printed invites.
- Public base URL from a setting/env var so tokens resolve to the real domain.

### Planning payoff

- **Guests** tab gains live RSVP columns (status, meal, dietary) from submissions.
- **Overview** RSVP / day-evening counts become real, with a **kids headcount** broken out.
- Catering summary separates **adults (veg/non-veg)** from **children**, plus a dietary-notes summary — accurate numbers for the venue.

## Design direction — refined botanical

- Keep the sage-green + warm-neutral spirit, elevated: generous whitespace, hairline rules, subtle botanical line art.
- Display serif (e.g. Cormorant / Fraunces) paired with a clean sans for body/UI.
- Editorial, timeless, warm — fits the relaxed garden-barn, dog-friendly, pizza-evening day. Dusty-rose accent optional (ties to the bridesmaid theme).
- Design tokens centralised in `src/lib/styles`.

## Deployment

- Dev: local libSQL file.
- Prod: DigitalOcean droplet (`adapter-node`) with a libSQL file on disk (back up by copying the file), or Vercel + Turso. `adapter-auto` selects automatically.
- Env vars: session secret, admin passcode (hashed), public base URL, DB URL/credentials.

## Out of scope (this iteration)

- Adding/removing guests via UI (roster is fixed/seeded).
- Individual accounts / multi-user auth (shared passcode only).
- Per-dish menu selection (fixed veg/non-veg; kids fixed menu).
- Email/SMS notifications.

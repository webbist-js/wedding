# Katie & Alex — Wedding App

A private wedding-planning dashboard for Katie & Alex, plus public per-household QR-code RSVP pages.

Built with **SvelteKit** (Svelte 5) · **Drizzle ORM** over **libSQL** · shared-passcode auth · `qrcode`.

## What's inside

- **Public**
  - `/` — elegant landing page.
  - `/rsvp/[token]` — each household's personal RSVP page (reached by QR code). Per-person attendance, veg/non-veg, allergies/dietary, kids' menu for children, and a message to the couple. Re-editable any time.
- **Private dashboard** (`/dashboard`, behind a shared passcode)
  - Overview (live counts + catering split from RSVPs), **Budget** (the money hub: every line expands to its suppliers, payments and lock), **Suppliers** (pipeline by stage; each supplier is filed under a budget line), Venue (live quote calculator with autosave and per-line locks), Shopping, **Guests** (households with contacts, RSVPs and each household's invite: QR code, link, personal message), Seating, Timeline, Calendar, Notes, Gallery, Activity.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` (default `file:./local.db` for local)
   - `SESSION_SECRET` (any long random string)
   - `ADMIN_PASSCODE_HASH` — generate from your chosen passcode:
     ```bash
     ./node_modules/.bin/tsx -e "import('./src/lib/server/auth.ts').then(async m => console.log(await m.hashPasscode('YOUR-PASSCODE')))"
     ```
   - `PUBLIC_BASE_URL` — the public origin used in QR links (e.g. `https://your-domain`).
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev`

The dev passcode (if you seeded the bundled `.env`) is `tithe-barn-2027`.

## Data model

The guest roster is seeded from `src/lib/server/db/data.ts` and then edited in the dashboard (rows are matched by `seed_key`, so reseeding preserves tokens and RSVP data). Their **RSVP status, meal, dietary notes, and household message** are written to the DB by the RSVP pages.

Money has one home per figure: a budget line's confirmed cost is derived from the suppliers filed under it (`vendors.budget_line_id`, committed = booked or deposit paid), the Venue line from the quote calculator, Shopping from the shopping list, and every paid penny is a row in `payments`. A **lock** on a quote line, budget line, supplier or the venue header marks it set & confirmed: the UI goes read-only and the server rejects other edits (HTTP 423).

## Deploy

`adapter-auto` targets the host automatically:
- **DigitalOcean droplet** → `adapter-node`; keep a libSQL file on disk (back up by copying the `.db` file).
- **Vercel + Turso** → set `DATABASE_URL` / `DATABASE_AUTH_TOKEN` to the Turso database and run migrations against it.

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm test` — Vitest unit tests (seeding, auth, catering summary, quote math, RSVP parsing)
- `npm run check` — svelte-check
- `npm run db:generate` / `npm run db:migrate` / `npm run db:seed`

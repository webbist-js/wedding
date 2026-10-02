# Guest list redesign — Design

**Date:** 2026-10-02
**Status:** Approved (user-supplied mockup is the visual spec)

## Goal

Turn the Guests page into a master–detail view with reporting: three report
cards, status + side filters, a compact household table, and a detail panel
for the selected household that holds everything the old card did (guests,
contact, invite/QR, personal message) plus invite-sent tracking.

## Layout (per mockup)

1. **Report row**
   - *RSVPs*: "n of N replied", big "yes attending so far", stacked bar
     yes / declined / awaiting with legend.
   - *Stats*: Guests · Day / Evening · Households · Children · Plus-ones ·
     Bride / Groom.
   - *Needs attention*: No postal address · No email or phone · Invite not
     sent — each with a count; clicking one filters the table to those
     households (click again to clear).
2. **Controls**: search · status pills (All / Awaiting / Replied / Declined
   with counts) · side pills (Both sides / Bride / Groom) · + Add household.
3. **Table** (left): Household (serif name + sub-line: relationship group ·
   first names · children · +N) · Side · Invited to (`2 Day`, `1 Eve`, or
   both) · Contact (Post / Email / Tel pills, lit when present) · RSVP (one
   dot per guest: sage = yes, terra = no, hollow = pending; label Awaiting /
   Attending / Declined / `1 of 2` / `1 attending`). Footer: "x of N
   households". Clicking a row selects it; `#h-<id>` deep-links.
4. **Panel** (right, sticky): name + status pill; "n guests · side · day/eve";
   **Guests** cards (name, role, remove; side, relationship group, relation;
   Day/Evening, Child, +1, Yes/No/— toggles; move to another household) and
   add-guest; **Contact** (address, email, phone); **Invite & RSVP link**
   (QR thumb, link, copy, download, personal line, "Mark invite as sent" ↔
   "Sent 14 Sep · undo", regenerate link); footer: Reset RSVPs · Delete
   household.

## Data

- `invite_groups.invite_sent_at` (text, ISO date, nullable) — migration
  `0024_invite_sent_at` (hand-written). Not seed-owned.
- Everything else already exists.

## Logic (`src/lib/guest-report.ts`, pure, tested)

- `householdSummary(h)` → side (B / G / X=mixed), invited {day, eve},
  rsvp {label, status, dots, yes, no, pending}, contact {post, email, tel},
  subline.
- `guestReport(households)` → rsvp totals, stats, attention counts.
- Status for filtering: *awaiting* = anyone pending; *replied* = all answered
  and at least one yes; *declined* = all no.
- Side filter: Bride shows households whose side is B or mixed; Groom shows
  G or mixed.

## Endpoints

- `guests/edit`: group field `inviteSentAt` (ISO date or empty to clear).
- `guests/+page.server` action `resetRsvps` (all members → pending,
  `responded_at` cleared; meals, dietary notes and messages kept).
- Existing: addGroup, removeGroup, addGuest, removeGuest, moveGuest,
  regenerateToken, QR endpoint, personalMessage.

## Components

- `guests/GuestReport.svelte` — the three cards.
- `guests/HouseholdTable.svelte` — table + footer, emits select.
- `guests/HouseholdPanel.svelte` — the detail panel (uses `InvitePanel`).
- `InvitePanel` gains `inviteSentAt` + sent/undo controls and the regenerate
  form slot.

## Out of scope

Bulk "mark all sent", CSV export, seating from this page.

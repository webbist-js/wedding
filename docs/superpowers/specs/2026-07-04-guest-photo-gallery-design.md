# Guest Photo Gallery — Design

**Date:** 2026-07-04
**Status:** Approved

## Goal

A QR code printed at the venue lets guests snap photos/videos straight from their
phone camera into our storage, and watch a live, password-protected gallery fill
up in real time. The couple manage everything (QR, moderation, deletion) from the
existing dashboard. Nobody without the QR token can upload.

## Decisions (agreed with Alex)

- **Storage:** Vercel Blob with client uploads, on a Vercel Pro upgrade
  (~$20/mo + pennies of Blob usage; Hobby's 1GB hard cap would kill uploads
  mid-reception). Downgrade after the event.
- **Moderation:** instant publish, hide/delete later from the dashboard.
- **Media:** photos **and** short videos. The Blob token enforces a 100MB hard
  cap and a content-type allowlist (a Blob token carries one size limit, not
  per-type limits); a client-side check nudges photos down to ~8MB but is
  advisory only.
- **Attribution:** optional "Who's this from?" name + caption — never blocks upload.
- **Gallery password:** `GALLERY_PASSWORD` env var (couple's choice: env-var over
  dashboard-managed). The QR route bypasses it via a signed cookie.
- **Tone:** playful and encouraging throughout (confetti on upload — reuse the
  existing `canvas-confetti` dependency).

## Architecture

### Secret + QR

- A random upload token (32 hex chars) lives in the `settings` table under
  `gallery_upload_token`, created on first dashboard visit if absent.
- The QR encodes `${PUBLIC_BASE_URL}/snaps/<token>`.
- Dashboard can **regenerate** the token — the kill switch if the QR leaks.
  (Regenerating invalidates the printed QR; confirmation required in UI.)

### Routes

| Route | Auth | Purpose |
|---|---|---|
| `/snaps/[token]` | valid token in URL | QR landing: "Add your photos" / "Watch the gallery" |
| `/gallery` | gallery cookie OR password form | Live gallery, polls feed ~8s |
| `POST /api/gallery/upload` | valid upload token | Vercel Blob `handleUpload` (client-token grant + completion) |
| `POST /api/gallery/register` | valid upload token | Insert `gallery_items` row after client upload completes |
| `GET /api/gallery/feed` | gallery cookie | JSON of visible items (id, url, kind, name, caption, createdAt) |
| `/dashboard/gallery` | existing session auth | Manage: stats, QR download, regenerate token, hide/delete |
| `GET /dashboard/gallery/qr` | existing session auth | 1024px print QR PNG (same pattern as invites QR) |

### Upload flow (guest phone)

1. `/snaps/[token]` server-load validates the token against settings; invalid →
   playful 404. Valid → page renders with the token available to the client.
2. "Add your photos" → `<input type="file" accept="image/*,video/*"
   capture="environment" multiple>` — opens the camera on mobile, camera-roll
   multi-select also works.
3. Client calls `upload()` from `@vercel/blob/client`, pointing at
   `/api/gallery/upload` with `clientPayload = { token, name, caption }`.
4. Server `handleUpload`:
   - `onBeforeGenerateToken`: reject unless `clientPayload.token` matches the
     settings row. Set `allowedContentTypes` (jpeg/png/webp/heic/gif +
     mp4/quicktime/webm), `maximumSizeInBytes` (100MB), random pathname suffix,
     path prefix `gallery/` (`dev/gallery/` when running locally so test blobs
     are easy to purge).
   - `onUploadCompleted`: insert the `gallery_items` row. **Caveat:** this
     callback does not fire on localhost, so the client also calls
     `POST /api/gallery/register` after upload; register re-validates the token,
     verifies the blob exists in our store via `head()`, and inserts
     idempotently (unique on pathname). Belt and braces in prod, sole path in dev.
5. Success → confetti + encouraging copy + "take another" reset.

### Gallery access

- Visiting `/snaps/[token]` (valid) sets a signed `gallery_access` cookie
  (HMAC with `SESSION_SECRET`, ~3 day expiry) — so "Watch the gallery" needs no
  password via the QR route.
- `/gallery` without the cookie shows a friendly password form → checks
  `GALLERY_PASSWORD` → sets the same cookie.
- Feed endpoint requires the cookie; returns only `hidden = false` items,
  newest first. Client polls every ~8s and animates new arrivals in.
- Videos render inline, tap-to-play, `preload="metadata"`.

### Schema

```ts
export const galleryItems = sqliteTable('gallery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blobUrl: text('blob_url').notNull(),
  blobPathname: text('blob_pathname').notNull().unique(), // idempotency key
  kind: text('kind', { enum: ['photo', 'video'] }).notNull(),
  contentType: text('content_type'),
  size: integer('size'),
  uploaderName: text('uploader_name'),
  caption: text('caption'),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
});
```

### Dashboard page

- Stats: item count by kind, total bytes.
- Print QR: download button hitting `/dashboard/gallery/qr` (1024px PNG,
  `errorCorrectionLevel: 'H'` — venue prints get scuffed).
- Copy gallery link + reminder of where the password lives.
- Grid of all items (including hidden, visually flagged) with hide/unhide and
  delete. Delete removes the DB row **and** the blob (`del()`); audit-logged
  like other dashboard mutations.
- Regenerate-token button with are-you-sure copy ("this breaks the printed QR").

### Security summary

- Upload grant and register both require the QR token — server-side check, no
  token = no Blob client token = no upload. Blob token itself carries the size
  and content-type caps, so a tampered client can't exceed them.
- Register verifies the pathname is under our `gallery/` prefix and exists in
  our store before inserting — no injecting foreign URLs into the feed.
- Gallery cookie is HMAC-signed; feed leaks nothing when absent.
- Dashboard endpoints ride the existing `locals.authed` session guard.

### Env

- `BLOB_READ_WRITE_TOKEN` — created by adding a Blob store to the Vercel project.
- `GALLERY_PASSWORD` — shared guest password for the non-QR gallery route.

## Error handling

- Invalid/stale QR token → playful 404 ("This QR has retired. Grab a drink and
  ask the couple!").
- Upload failure → friendly retry prompt, file kept selected.
- Oversized/wrong-type file → caught client-side before upload where possible,
  and rejected by the Blob token server-side regardless.
- Feed poll failures → silent retry with backoff; gallery keeps showing what it has.

## Testing

- Vitest: token validation (valid/invalid/regenerated), upload-grant refusal
  without token, register idempotency + foreign-pathname rejection, feed hides
  hidden items, gallery cookie sign/verify round-trip.
- Manual: phone camera capture flow end-to-end on a real device before printing
  the QR.

## Out of scope (YAGNI)

- Download-all/zip export, likes/reactions, per-guest upload limits, image
  transforms/thumbnails (Blob URLs serve directly; revisit only if gallery
  feels slow), approval queue.

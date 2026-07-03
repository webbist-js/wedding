# Guest Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QR-token-gated guest photo/video uploads to Vercel Blob with a live password-protected gallery and a dashboard management page.

**Architecture:** A secret upload token in the `settings` table gates everything guest-facing: `/snaps/[token]` is the QR landing page (camera capture → direct-to-Blob client upload → DB registration), `/gallery` is a polling live gallery unlocked by an HMAC cookie (set by the QR route or a `GALLERY_PASSWORD` form), and `/dashboard/gallery` manages it all behind existing session auth.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Drizzle + libsql (Turso), `@vercel/blob` client uploads, `qrcode`, `canvas-confetti`, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-guest-photo-gallery-design.md`
- Svelte 5 runes syntax (`$props()`, `$state()`, `$derived()`) — no legacy `export let`.
- Tabs for indentation (repo convention).
- Never add `Co-Authored-By` to commits (user's global rule).
- Blob token caps: 100MB max, content-type allowlist `image/jpeg image/png image/webp image/heic image/heif image/gif video/mp4 video/quicktime video/webm`.
- Blob path prefix: `gallery/` in prod, `dev/gallery/` under `vite dev` (`dev` from `$app/environment`).
- Gallery cookie: name `gallery_access`, HMAC-signed with `SESSION_SECRET`, 3-day validity.
- Playful, encouraging copy on all guest-facing pages; venue is "The Tithe Barn"; couple is Katie & Alex; wedding 2 April 2027.
- Pure logic gets vitest coverage; DB/endpoint glue stays thin (repo test convention — tests never hit the DB).

---

### Task 1: Dependency, schema & migration

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/lib/server/db/schema.ts` (append)
- Create: `drizzle/0017_*.sql` (generated)

**Interfaces:**
- Produces: `galleryItems` Drizzle table with columns `id, blobUrl, blobPathname (unique), kind ('photo'|'video'), contentType, size, uploaderName, caption, hidden (default false), createdAt`.

- [ ] **Step 1: Install @vercel/blob**

Run: `npm install @vercel/blob`
Expected: added to `dependencies` in package.json.

- [ ] **Step 2: Append table to schema**

Append to `src/lib/server/db/schema.ts`:

```ts
// Guest-uploaded photos & videos (the wedding-day live gallery). Rows are
// registered after a direct-to-Vercel-Blob client upload; `blobPathname` is
// unique so registration is idempotent (both the client register call and
// Blob's onUploadCompleted callback may fire for the same upload).
export const galleryItems = sqliteTable('gallery_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	blobUrl: text('blob_url').notNull(),
	blobPathname: text('blob_pathname').notNull().unique(),
	kind: text('kind', { enum: ['photo', 'video'] }).notNull(),
	contentType: text('content_type'),
	size: integer('size'),
	uploaderName: text('uploader_name'),
	caption: text('caption'),
	// Hidden items stay in storage but never appear in the public feed.
	hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
});
```

- [ ] **Step 3: Generate + run migration**

Run: `npm run db:generate` then `npm run db:migrate`
Expected: new `drizzle/0017_*.sql` containing `CREATE TABLE gallery_items`; migrate exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/server/db/schema.ts drizzle/
git commit -m "feat(gallery): add gallery_items table and @vercel/blob"
```

---

### Task 2: Server gallery helpers (TDD)

**Files:**
- Create: `src/lib/server/gallery.ts`
- Test: `tests/gallery.test.ts`

**Interfaces:**
- Consumes: `settings` table + `db` from Task-0 codebase; HMAC pattern from `src/lib/server/auth.ts`.
- Produces:
  - `GALLERY_COOKIE = 'gallery_access'`
  - `ALLOWED_CONTENT_TYPES: string[]`
  - `MAX_UPLOAD_BYTES: number` (100MB)
  - `signGalleryAccess(secret: string): string`
  - `verifyGalleryAccess(token: string | undefined, secret: string, now?: number): boolean`
  - `kindFromContentType(ct: string | null | undefined): 'photo' | 'video' | null`
  - `isAllowedPathname(pathname: string): boolean`
  - `getOrCreateUploadToken(): Promise<string>`
  - `regenerateUploadToken(): Promise<string>`
  - `isValidUploadToken(token: string | null | undefined): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

Create `tests/gallery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	signGalleryAccess,
	verifyGalleryAccess,
	kindFromContentType,
	isAllowedPathname
} from '../src/lib/server/gallery';

const SECRET = 'test-secret';
const DAY = 86_400_000;

describe('gallery access cookie', () => {
	it('round-trips a signed token', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET)).toBe(true);
	});
	it('rejects a tampered token', () => {
		expect(verifyGalleryAccess(signGalleryAccess(SECRET) + 'x', SECRET)).toBe(false);
	});
	it('rejects a token signed with another secret', () => {
		expect(verifyGalleryAccess(signGalleryAccess('other'), SECRET)).toBe(false);
	});
	it('rejects a missing token', () => {
		expect(verifyGalleryAccess(undefined, SECRET)).toBe(false);
	});
	it('rejects a token older than 3 days', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET, Date.now() + 4 * DAY)).toBe(false);
	});
	it('accepts a token younger than 3 days', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET, Date.now() + 2 * DAY)).toBe(true);
	});
});

describe('kindFromContentType', () => {
	it('maps images to photo', () => {
		expect(kindFromContentType('image/jpeg')).toBe('photo');
		expect(kindFromContentType('image/heic')).toBe('photo');
	});
	it('maps videos to video', () => {
		expect(kindFromContentType('video/mp4')).toBe('video');
	});
	it('returns null for anything else', () => {
		expect(kindFromContentType('application/pdf')).toBeNull();
		expect(kindFromContentType(null)).toBeNull();
	});
});

describe('isAllowedPathname', () => {
	it('accepts the prod prefix', () => {
		expect(isAllowedPathname('gallery/abc-123.jpg')).toBe(true);
	});
	it('accepts the dev prefix', () => {
		expect(isAllowedPathname('dev/gallery/abc.mp4')).toBe(true);
	});
	it('rejects foreign pathnames', () => {
		expect(isAllowedPathname('avatars/x.jpg')).toBe(false);
		expect(isAllowedPathname('galleryx/x.jpg')).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npx vitest run tests/gallery.test.ts`
Expected: FAIL — cannot resolve `../src/lib/server/gallery`.

- [ ] **Step 3: Implement**

Create `src/lib/server/gallery.ts`:

```ts
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db/index';
import { settings } from './db/schema';

export const GALLERY_COOKIE = 'gallery_access';

// One shared cap in the Blob client token — a token carries a single size
// limit, so videos set the ceiling; photos get a client-side nudge only.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'image/gif',
	'video/mp4',
	'video/quicktime',
	'video/webm'
];

const COOKIE_MAX_AGE_MS = 3 * 86_400_000;
const TOKEN_KEY = 'gallery_upload_token';

// Gallery-access cookie: "gallery.<issuedAt>.<sig>" — same HMAC shape as the
// dashboard session cookie, but anonymous and expiring (guests share it).
export function signGalleryAccess(secret: string): string {
	const payload = `gallery.${Date.now()}`;
	const sig = createHmac('sha256', secret).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

export function verifyGalleryAccess(
	token: string | undefined,
	secret: string,
	now: number = Date.now()
): boolean {
	if (!token) return false;
	const cut = token.lastIndexOf('.');
	if (cut < 0) return false;
	const payload = token.slice(0, cut);
	const sig = token.slice(cut + 1);
	const [scope, issuedAt] = payload.split('.');
	if (scope !== 'gallery' || !issuedAt) return false;
	const expected = createHmac('sha256', secret).update(payload).digest('base64url');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
	return now - Number(issuedAt) < COOKIE_MAX_AGE_MS;
}

export function kindFromContentType(ct: string | null | undefined): 'photo' | 'video' | null {
	if (!ct) return null;
	if (ct.startsWith('image/')) return 'photo';
	if (ct.startsWith('video/')) return 'video';
	return null;
}

// Registration only accepts blobs we issued tokens for — our prod prefix or
// the dev prefix used under `vite dev` (easy to purge test uploads).
export function isAllowedPathname(pathname: string): boolean {
	return pathname.startsWith('gallery/') || pathname.startsWith('dev/gallery/');
}

export async function getOrCreateUploadToken(): Promise<string> {
	const [row] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY));
	if (row) return row.value;
	const token = randomBytes(16).toString('hex');
	await db.insert(settings).values({ key: TOKEN_KEY, value: token });
	return token;
}

// The kill switch: invalidates every printed QR immediately.
export async function regenerateUploadToken(): Promise<string> {
	const token = randomBytes(16).toString('hex');
	const [existing] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY));
	if (existing) await db.update(settings).set({ value: token }).where(eq(settings.key, TOKEN_KEY));
	else await db.insert(settings).values({ key: TOKEN_KEY, value: token });
	return token;
}

export async function isValidUploadToken(token: string | null | undefined): Promise<boolean> {
	if (!token) return false;
	const [row] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY));
	if (!row) return false;
	const a = Buffer.from(token);
	const b = Buffer.from(row.value);
	return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/gallery.test.ts`
Expected: all PASS. (DB-backed functions intentionally untested — repo tests stay pure.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/gallery.ts tests/gallery.test.ts
git commit -m "feat(gallery): access-cookie signing, upload-token settings helpers"
```

---

### Task 3: Upload grant + registration endpoints

**Files:**
- Create: `src/routes/api/gallery/upload/+server.ts`
- Create: `src/routes/api/gallery/register/+server.ts`

**Interfaces:**
- Consumes: Task 2 helpers; `galleryItems` from Task 1.
- Produces:
  - `POST /api/gallery/upload` — Vercel Blob `handleUpload` body; refuses token grant unless `clientPayload.token` is valid.
  - `POST /api/gallery/register` — body `{ token, url, name?, caption? }`; verifies blob via `head()`, inserts idempotently; returns `{ ok: true }`.

- [ ] **Step 1: Upload grant endpoint**

Create `src/routes/api/gallery/upload/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import {
	ALLOWED_CONTENT_TYPES,
	MAX_UPLOAD_BYTES,
	isValidUploadToken,
	isAllowedPathname,
	kindFromContentType
} from '$lib/server/gallery';

// Vercel Blob client-upload handshake. The phone asks for a scoped upload
// token here; we only grant one when the request carries the secret QR token,
// and the grant itself carries the size cap + content-type allowlist so a
// tampered client can't exceed them.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as HandleUploadBody;

	const jsonResponse = await handleUpload({
		body,
		request,
		onBeforeGenerateToken: async (pathname, clientPayload) => {
			let payload: { token?: string; name?: string; caption?: string } = {};
			try {
				payload = JSON.parse(clientPayload ?? '{}');
			} catch {
				// fall through to the token check below
			}
			if (!(await isValidUploadToken(payload.token))) {
				throw new Error('That QR code is not valid any more.');
			}
			if (!isAllowedPathname(pathname)) {
				throw new Error('Unexpected upload path.');
			}
			return {
				allowedContentTypes: ALLOWED_CONTENT_TYPES,
				maximumSizeInBytes: MAX_UPLOAD_BYTES,
				addRandomSuffix: true,
				tokenPayload: JSON.stringify({
					name: payload.name?.slice(0, 80) ?? null,
					caption: payload.caption?.slice(0, 280) ?? null
				})
			};
		},
		// Fires in production once the blob lands (not on localhost — the client
		// register call below is the sole path in dev, belt-and-braces in prod).
		onUploadCompleted: async ({ blob, tokenPayload }) => {
			const meta = JSON.parse(tokenPayload ?? '{}');
			const kind = kindFromContentType(blob.contentType);
			if (!kind) return;
			await db
				.insert(galleryItems)
				.values({
					blobUrl: blob.url,
					blobPathname: blob.pathname,
					kind,
					contentType: blob.contentType,
					uploaderName: meta.name ?? null,
					caption: meta.caption ?? null,
					createdAt: new Date()
				})
				.onConflictDoNothing({ target: galleryItems.blobPathname });
		}
	});

	return json(jsonResponse);
};
```

- [ ] **Step 2: Registration endpoint**

Create `src/routes/api/gallery/register/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { head } from '@vercel/blob';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import {
	isValidUploadToken,
	isAllowedPathname,
	kindFromContentType
} from '$lib/server/gallery';

// Client-side completion path (onUploadCompleted doesn't fire on localhost).
// Metadata comes from head() — the blob store's word, not the client's — so
// nobody can register a URL they didn't actually upload to our store.
export const POST: RequestHandler = async ({ request }) => {
	const { token, url, name, caption } = await request.json();
	if (!(await isValidUploadToken(token))) throw error(403, 'invalid token');
	if (typeof url !== 'string') throw error(400, 'missing url');

	let blob;
	try {
		blob = await head(url);
	} catch {
		throw error(400, 'no such upload');
	}
	if (!isAllowedPathname(blob.pathname)) throw error(400, 'unexpected path');
	const kind = kindFromContentType(blob.contentType);
	if (!kind) throw error(400, 'unsupported type');

	await db
		.insert(galleryItems)
		.values({
			blobUrl: blob.url,
			blobPathname: blob.pathname,
			kind,
			contentType: blob.contentType,
			size: blob.size,
			uploaderName: typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : null,
			caption: typeof caption === 'string' && caption.trim() ? caption.trim().slice(0, 280) : null,
			createdAt: new Date()
		})
		.onConflictDoNothing({ target: galleryItems.blobPathname });

	return json({ ok: true });
};
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/gallery/
git commit -m "feat(gallery): token-gated blob upload grant + idempotent registration"
```

---

### Task 4: Live feed endpoint

**Files:**
- Create: `src/routes/api/gallery/feed/+server.ts`

**Interfaces:**
- Consumes: `GALLERY_COOKIE`, `verifyGalleryAccess` (Task 2); `galleryItems` (Task 1).
- Produces: `GET /api/gallery/feed` → `{ items: { id, url, kind, name, caption, at }[] }` (visible only, newest first). 401 without a valid gallery cookie.

- [ ] **Step 1: Implement**

Create `src/routes/api/gallery/feed/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { GALLERY_COOKIE, verifyGalleryAccess } from '$lib/server/gallery';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!verifyGalleryAccess(cookies.get(GALLERY_COOKIE), env.SESSION_SECRET ?? '')) {
		throw error(401);
	}
	const rows = await db
		.select()
		.from(galleryItems)
		.where(eq(galleryItems.hidden, false))
		.orderBy(desc(galleryItems.id));

	return json(
		{
			items: rows.map((r) => ({
				id: r.id,
				url: r.blobUrl,
				kind: r.kind,
				name: r.uploaderName,
				caption: r.caption,
				at: r.createdAt?.getTime() ?? null
			}))
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
```

- [ ] **Step 2: Type-check + full test run**

Run: `npm run check && npm test`
Expected: 0 errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/gallery/feed/
git commit -m "feat(gallery): cookie-gated live feed endpoint"
```

---

### Task 5: `/snaps/[token]` — QR landing & upload page

**Files:**
- Create: `src/routes/snaps/[token]/+page.server.ts`
- Create: `src/routes/snaps/[token]/+page.svelte`

**Interfaces:**
- Consumes: Task 2 helpers; `upload` from `@vercel/blob/client`; `POST /api/gallery/register` (Task 3).
- Produces: the guest upload experience; sets the `gallery_access` cookie so "Watch the gallery" needs no password.

- [ ] **Step 1: Server load**

Create `src/routes/snaps/[token]/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { GALLERY_COOKIE, isValidUploadToken, signGalleryAccess } from '$lib/server/gallery';

export const load: PageServerLoad = async ({ params, cookies }) => {
	if (!(await isValidUploadToken(params.token))) {
		// Playful 404 — the printed QR was regenerated or the URL was mangled.
		throw error(404, 'This QR has retired. Grab a drink and ask the happy couple!');
	}
	// Arriving via the QR proves you're in the room — unlock the gallery too.
	cookies.set(GALLERY_COOKIE, signGalleryAccess(env.SESSION_SECRET ?? ''), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 3 * 86_400
	});
	return { token: params.token };
};
```

- [ ] **Step 2: Page component**

Create `src/routes/snaps/[token]/+page.svelte`:

```svelte
<script lang="ts">
	import { upload } from '@vercel/blob/client';
	import { dev } from '$app/environment';
	import confetti from 'canvas-confetti';

	let { data } = $props();

	const PREFIX = dev ? 'dev/gallery' : 'gallery';
	const MAX_BYTES = 100 * 1024 * 1024;
	const CHEERS = [
		'You’re basically the official photographer now — take another!',
		'Gorgeous! The gallery just got better.',
		'That one’s going in a frame. More!',
		'Katie & Alex will love this. Keep them coming!',
		'Snapped and saved forever. One more?'
	];

	let files = $state<FileList | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let name = $state('');
	let caption = $state('');
	let busy = $state(false);
	let progress = $state({ done: 0, total: 0 });
	let cheer = $state('');
	let uploadError = $state('');

	async function send() {
		if (!files?.length || busy) return;
		busy = true;
		uploadError = '';
		cheer = '';
		const list = Array.from(files).filter((f) => f.size <= MAX_BYTES);
		const skipped = (files?.length ?? 0) - list.length;
		progress = { done: 0, total: list.length };
		try {
			for (const file of list) {
				const blob = await upload(`${PREFIX}/${file.name}`, file, {
					access: 'public',
					handleUploadUrl: '/api/gallery/upload',
					clientPayload: JSON.stringify({ token: data.token, name, caption })
				});
				// Belt-and-braces registration (sole path in dev — see register endpoint).
				await fetch('/api/gallery/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ token: data.token, url: blob.url, name, caption })
				});
				progress = { ...progress, done: progress.done + 1 };
			}
			cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
			if (skipped > 0) cheer += ` (${skipped} file${skipped > 1 ? 's' : ''} over 100MB skipped.)`;
			caption = '';
			files = null;
			if (fileInput) fileInput.value = '';
			confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } });
		} catch {
			uploadError = 'Hmm, that didn’t send — the barn Wi-Fi can be shy. Give it another go!';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Share your snaps — Katie &amp; Alex</title></svelte:head>

<main class="wrap">
	<p class="eyebrow">2 April 2027 · The Tithe Barn</p>
	<h1 class="script">You caught us!</h1>
	<p class="lede">
		Every photo and video you take lands straight in Katie &amp; Alex’s wedding album —
		the candid ones are always the best ones.
	</p>

	<label class="snap-btn" class:busy>
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*,video/*"
			capture="environment"
			multiple
			disabled={busy}
			onchange={(e) => (files = e.currentTarget.files)}
		/>
		📸 {files?.length ? `${files.length} ready — tap Send below!` : 'Snap or pick your photos'}
	</label>

	{#if files?.length}
		<div class="meta">
			<input type="text" placeholder="Who’s this from? (optional)" maxlength="80" bind:value={name} />
			<input type="text" placeholder="Say something lovely… (optional)" maxlength="280" bind:value={caption} />
			<button class="send" onclick={send} disabled={busy}>
				{#if busy}Sending {progress.done + 1} of {progress.total}…{:else}Send to the album 💌{/if}
			</button>
		</div>
	{/if}

	{#if cheer}<p class="cheer">{cheer}</p>{/if}
	{#if uploadError}<p class="oops">{uploadError}</p>{/if}

	<a class="gallery-link" href="/gallery">👀 Watch the gallery fill up live →</a>
</main>

<style>
	.wrap {
		max-width: 480px;
		margin: 0 auto;
		padding: 48px 24px 64px;
		text-align: center;
	}
	h1 {
		font-size: 56px;
		margin: 12px 0 8px;
	}
	.lede {
		color: var(--body);
		margin-bottom: 32px;
	}
	.snap-btn {
		display: block;
		background: var(--sage);
		color: #fff;
		border-radius: 16px;
		padding: 22px;
		font-size: 18px;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(111, 125, 89, 0.35);
	}
	.snap-btn.busy {
		opacity: 0.6;
	}
	.snap-btn input {
		display: none;
	}
	.meta {
		display: grid;
		gap: 10px;
		margin-top: 16px;
	}
	.meta input {
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font: inherit;
		background: var(--card);
	}
	.send {
		background: var(--terra);
		color: #fff;
		border: 0;
		border-radius: 12px;
		padding: 14px;
		font-size: 17px;
		font-weight: 600;
		cursor: pointer;
	}
	.send:disabled {
		opacity: 0.6;
	}
	.cheer {
		margin-top: 20px;
		color: var(--sage-deep);
		font-weight: 600;
	}
	.oops {
		margin-top: 20px;
		color: var(--terra);
	}
	.gallery-link {
		display: inline-block;
		margin-top: 36px;
		color: var(--sage-deep);
		font-weight: 600;
	}
</style>
```

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, seed a token by loading `/dashboard/gallery` later — for now insert one manually:
`sqlite3 local.db "INSERT OR REPLACE INTO settings (key, value) VALUES ('gallery_upload_token','devtoken1234');"`
Visit `http://localhost:5173/snaps/devtoken1234` → page renders, camera/file picker opens.
Visit `http://localhost:5173/snaps/wrong` → playful 404.
(Real upload needs `BLOB_READ_WRITE_TOKEN` in `.env` — verify separately if available.)

- [ ] **Step 4: Type-check + commit**

Run: `npm run check`
Expected: 0 errors.

```bash
git add src/routes/snaps/
git commit -m "feat(gallery): QR landing page with camera capture and confetti"
```

---

### Task 6: `/gallery` — password gate + live grid

**Files:**
- Create: `src/routes/gallery/+page.server.ts`
- Create: `src/routes/gallery/+page.svelte`

**Interfaces:**
- Consumes: `GALLERY_COOKIE`, `signGalleryAccess`, `verifyGalleryAccess` (Task 2); `GET /api/gallery/feed` (Task 4); `GALLERY_PASSWORD` env.
- Produces: public gallery route; form action `?/unlock` sets the cookie on correct password.

- [ ] **Step 1: Server load + unlock action**

Create `src/routes/gallery/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'node:crypto';
import { GALLERY_COOKIE, signGalleryAccess, verifyGalleryAccess } from '$lib/server/gallery';

export const load: PageServerLoad = async ({ cookies }) => {
	return {
		unlocked: verifyGalleryAccess(cookies.get(GALLERY_COOKIE), env.SESSION_SECRET ?? '')
	};
};

export const actions: Actions = {
	unlock: async ({ request, cookies }) => {
		const form = await request.formData();
		const guess = String(form.get('password') ?? '');
		const actual = env.GALLERY_PASSWORD ?? '';
		// Fail closed when GALLERY_PASSWORD is unset; QR arrivals still get in.
		const a = Buffer.from(guess);
		const b = Buffer.from(actual);
		const ok = actual.length > 0 && a.length === b.length && timingSafeEqual(a, b);
		if (!ok) return fail(403, { wrong: true });
		cookies.set(GALLERY_COOKIE, signGalleryAccess(env.SESSION_SECRET ?? ''), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 3 * 86_400
		});
		return { unlocked: true };
	}
};
```

- [ ] **Step 2: Page component**

Create `src/routes/gallery/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const unlocked = $derived(data.unlocked || !!form?.unlocked);

	type Item = {
		id: number;
		url: string;
		kind: 'photo' | 'video';
		name: string | null;
		caption: string | null;
		at: number | null;
	};

	let items = $state<Item[]>([]);
	let loaded = $state(false);

	async function poll() {
		try {
			const res = await fetch('/api/gallery/feed');
			if (!res.ok) return;
			const body = (await res.json()) as { items: Item[] };
			items = body.items;
			loaded = true;
		} catch {
			// transient network blip — keep showing what we have, next poll retries
		}
	}

	// $effect (not onMount) so polling starts the moment the form unlocks the
	// page without a full reload, and stops if it ever re-locks.
	$effect(() => {
		if (!unlocked) return;
		poll();
		const t = setInterval(poll, 8000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>The live album — Katie &amp; Alex</title></svelte:head>

<main class="wrap">
	{#if !unlocked}
		<div class="gate">
			<p class="eyebrow">2 April 2027 · The Tithe Barn</p>
			<h1 class="script">The live album</h1>
			<p>Psst — what’s the magic word? (It’s on your menu, or ask anyone in a nice frock.)</p>
			<form method="POST" action="?/unlock" use:enhance>
				<input type="password" name="password" placeholder="Magic word" autocomplete="off" />
				<button type="submit">Let me in ✨</button>
			</form>
			{#if form?.wrong}<p class="oops">Not quite — try again!</p>{/if}
		</div>
	{:else}
		<header class="head">
			<p class="eyebrow">Live from The Tithe Barn</p>
			<h1 class="script">Katie &amp; Alex</h1>
			<p class="sub">
				{items.length
					? `${items.length} ${items.length === 1 ? 'memory' : 'memories'} and counting — refreshes itself, just keep watching`
					: loaded
						? 'Nothing here yet — be the first to add a photo!'
						: 'Warming up the projector…'}
			</p>
		</header>
		<div class="grid">
			{#each items as item (item.id)}
				<figure>
					{#if item.kind === 'video'}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video src={item.url} controls playsinline preload="metadata"></video>
					{:else}
						<img src={item.url} alt={item.caption ?? 'Wedding photo'} loading="lazy" />
					{/if}
					{#if item.name || item.caption}
						<figcaption>
							{#if item.caption}<span class="cap">{item.caption}</span>{/if}
							{#if item.name}<span class="who">— {item.name}</span>{/if}
						</figcaption>
					{/if}
				</figure>
			{/each}
		</div>
	{/if}
</main>

<style>
	.wrap {
		max-width: 1100px;
		margin: 0 auto;
		padding: 40px 20px 80px;
	}
	.gate {
		max-width: 420px;
		margin: 10vh auto 0;
		text-align: center;
	}
	.gate h1 {
		font-size: 52px;
		margin: 10px 0;
	}
	.gate form {
		display: grid;
		gap: 10px;
		margin-top: 20px;
	}
	.gate input {
		padding: 13px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font: inherit;
		text-align: center;
	}
	.gate button {
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 10px;
		padding: 13px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}
	.oops {
		color: var(--terra);
		margin-top: 12px;
	}
	.head {
		text-align: center;
		margin-bottom: 28px;
	}
	.head h1 {
		font-size: 56px;
		margin: 8px 0 4px;
	}
	.sub {
		color: var(--muted);
	}
	.grid {
		columns: 3 280px;
		column-gap: 14px;
	}
	figure {
		break-inside: avoid;
		margin: 0 0 14px;
		background: var(--card);
		border: 1px solid var(--line2);
		border-radius: 12px;
		overflow: hidden;
		animation: pop 0.5s ease;
	}
	figure img,
	figure video {
		display: block;
		width: 100%;
		height: auto;
	}
	figcaption {
		padding: 10px 12px;
		font-size: 14px;
		color: var(--body);
	}
	.who {
		color: var(--muted);
		font-style: italic;
		margin-left: 4px;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
```

- [ ] **Step 3: Manual smoke test**

With `GALLERY_PASSWORD=magic` in `.env`: `/gallery` shows the gate; wrong password → "Not quite"; correct → grid appears. Visiting `/snaps/devtoken1234` first then `/gallery` skips the gate entirely.

- [ ] **Step 4: Type-check + commit**

Run: `npm run check`
Expected: 0 errors.

```bash
git add src/routes/gallery/
git commit -m "feat(gallery): password-gated live gallery with 8s polling"
```

---

### Task 7: Dashboard management page + QR + moderation endpoints

**Files:**
- Create: `src/routes/dashboard/gallery/+page.server.ts`
- Create: `src/routes/dashboard/gallery/+page.svelte`
- Create: `src/routes/dashboard/gallery/item/+server.ts`
- Create: `src/routes/dashboard/gallery/qr/+server.ts`
- Modify: `src/routes/dashboard/+layout.svelte` (NAV Planning group, META, camera icon)

**Interfaces:**
- Consumes: Tasks 1–2; `del` from `@vercel/blob`; `recordAudit`; QR pattern from `src/routes/dashboard/invites/qr/+server.ts`.
- Produces: `/dashboard/gallery` page; `POST /dashboard/gallery/item` `{ id, op: 'hide'|'unhide'|'delete' }`; `GET /dashboard/gallery/qr` → 1024px PNG; form action `?/regenerate`.

- [ ] **Step 1: Page server (load + regenerate action)**

Create `src/routes/dashboard/gallery/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { getOrCreateUploadToken, regenerateUploadToken } from '$lib/server/gallery';
import { recordAudit } from '$lib/server/audit';

export const load: PageServerLoad = async ({ url }) => {
	const token = await getOrCreateUploadToken();
	const items = await db.select().from(galleryItems).orderBy(desc(galleryItems.id));
	const base = env.PUBLIC_BASE_URL || url.origin;
	return {
		items: items.map((i) => ({
			id: i.id,
			url: i.blobUrl,
			kind: i.kind,
			name: i.uploaderName,
			caption: i.caption,
			hidden: i.hidden,
			size: i.size,
			at: i.createdAt?.getTime() ?? null
		})),
		snapsUrl: `${base}/snaps/${token}`,
		galleryUrl: `${base}/gallery`,
		totalBytes: items.reduce((n, i) => n + (i.size ?? 0), 0)
	};
};

export const actions: Actions = {
	regenerate: async ({ locals }) => {
		await regenerateUploadToken();
		await recordAudit(locals, {
			action: 'update',
			entity: 'gallery',
			summary: 'Regenerated the gallery QR token — old printed QRs are dead'
		});
		return { regenerated: true };
	}
};
```

- [ ] **Step 2: Moderation endpoint**

Create `src/routes/dashboard/gallery/item/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { recordAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, op } = await request.json();
	if (typeof id !== 'number' || !['hide', 'unhide', 'delete'].includes(op)) {
		throw error(400, 'bad request');
	}
	const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
	if (!item) throw error(404);

	if (op === 'delete') {
		// Remove the blob first — if that fails we keep the row so it stays visible
		// in the dashboard rather than leaking an orphaned blob we can't see.
		await del(item.blobUrl);
		await db.delete(galleryItems).where(eq(galleryItems.id, id));
		await recordAudit(locals, {
			action: 'delete',
			entity: 'gallery',
			entityId: id,
			summary: `Deleted a gallery ${item.kind}${item.uploaderName ? ` from ${item.uploaderName}` : ''}`
		});
	} else {
		await db.update(galleryItems).set({ hidden: op === 'hide' }).where(eq(galleryItems.id, id));
		await recordAudit(locals, {
			action: 'update',
			entity: 'gallery',
			entityId: id,
			summary: `${op === 'hide' ? 'Hid' : 'Unhid'} a gallery ${item.kind}`
		});
	}
	return json({ ok: true });
};
```

- [ ] **Step 3: QR endpoint**

Create `src/routes/dashboard/gallery/qr/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';
import { getOrCreateUploadToken } from '$lib/server/gallery';

// Print-resolution QR for the venue. Error correction 'H' — table cards get
// wine on them.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.authed) throw error(401);
	const token = await getOrCreateUploadToken();
	const base = env.PUBLIC_BASE_URL || url.origin;
	const png = await QRCode.toBuffer(`${base}/snaps/${token}`, {
		width: 1024,
		margin: 1,
		errorCorrectionLevel: 'H'
	});
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'content-disposition': 'attachment; filename="gallery-qr.png"',
			'cache-control': 'no-store'
		}
	});
};
```

- [ ] **Step 4: Dashboard page component**

Create `src/routes/dashboard/gallery/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let busyId = $state<number | null>(null);

	const photos = $derived(data.items.filter((i) => i.kind === 'photo').length);
	const videos = $derived(data.items.filter((i) => i.kind === 'video').length);
	const mb = $derived((data.totalBytes / 1024 / 1024).toFixed(1));

	async function itemOp(id: number, op: 'hide' | 'unhide' | 'delete') {
		if (op === 'delete' && !confirm('Delete this forever? It comes out of storage too.')) return;
		busyId = id;
		try {
			await fetch('/dashboard/gallery/item', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, op })
			});
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}

	function copy(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

<div class="stats">
	<div class="stat"><strong>{photos}</strong><span>photos</span></div>
	<div class="stat"><strong>{videos}</strong><span>videos</span></div>
	<div class="stat"><strong>{mb} MB</strong><span>stored</span></div>
</div>

<section class="card">
	<h2>The QR code</h2>
	<p class="hint">
		Print this for the venue — scanning opens the camera page and unlocks the gallery,
		no password needed. Gallery-only visitors use the link + <code>GALLERY_PASSWORD</code>.
	</p>
	<div class="row">
		<a class="btn" href="/dashboard/gallery/qr">Download print QR (PNG)</a>
		<button class="btn ghost" onclick={() => copy(data.snapsUrl)}>Copy upload link</button>
		<button class="btn ghost" onclick={() => copy(data.galleryUrl)}>Copy gallery link</button>
	</div>
	<form
		method="POST"
		action="?/regenerate"
		use:enhance
		onsubmit={(e) => {
			if (!confirm('Regenerate the token? Every ALREADY-PRINTED QR stops working. Only do this if the link leaked.'))
				e.preventDefault();
		}}
	>
		<button class="btn danger" type="submit">Regenerate token (kills printed QRs)</button>
		{#if form?.regenerated}<span class="done">Done — download and print the new QR.</span>{/if}
	</form>
</section>

<section class="card">
	<h2>Uploads</h2>
	{#if !data.items.length}
		<p class="hint">Nothing yet — it'll fill up fast on the day.</p>
	{/if}
	<div class="grid">
		{#each data.items as item (item.id)}
			<figure class:hidden-item={item.hidden}>
				{#if item.kind === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={item.url} preload="metadata" controls></video>
				{:else}
					<img src={item.url} alt={item.caption ?? 'Guest upload'} loading="lazy" />
				{/if}
				<figcaption>
					<span class="meta">{item.name ?? 'Anonymous'}{item.caption ? ` — ${item.caption}` : ''}</span>
					<span class="ops">
						{#if item.hidden}
							<button disabled={busyId === item.id} onclick={() => itemOp(item.id, 'unhide')}>Unhide</button>
						{:else}
							<button disabled={busyId === item.id} onclick={() => itemOp(item.id, 'hide')}>Hide</button>
						{/if}
						<button class="del" disabled={busyId === item.id} onclick={() => itemOp(item.id, 'delete')}>Delete</button>
					</span>
				</figcaption>
				{#if item.hidden}<span class="flag">hidden</span>{/if}
			</figure>
		{/each}
	</div>
</section>

<style>
	.stats {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
	}
	.stat {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 14px 18px;
		display: grid;
	}
	.stat strong {
		font-size: 22px;
		color: var(--ink);
	}
	.stat span {
		color: var(--muted);
		font-size: 13px;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 20px;
		margin-bottom: 16px;
	}
	.card h2 {
		margin: 0 0 6px;
		font-size: 17px;
	}
	.hint {
		color: var(--muted);
		font-size: 14px;
		margin: 0 0 12px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 14px;
	}
	.btn {
		display: inline-block;
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 9px;
		padding: 9px 14px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
	}
	.btn.ghost {
		background: var(--sage-soft);
		color: var(--sage-deep);
	}
	.btn.danger {
		background: var(--terra-bg);
		color: var(--terra);
	}
	.done {
		color: var(--sage-deep);
		font-size: 14px;
		margin-left: 10px;
	}
	.grid {
		columns: 4 200px;
		column-gap: 12px;
	}
	figure {
		position: relative;
		break-inside: avoid;
		margin: 0 0 12px;
		border: 1px solid var(--line2);
		border-radius: 10px;
		overflow: hidden;
	}
	figure.hidden-item {
		opacity: 0.45;
	}
	figure img,
	figure video {
		display: block;
		width: 100%;
		height: auto;
	}
	figcaption {
		padding: 8px 10px;
		font-size: 12.5px;
		display: grid;
		gap: 6px;
	}
	.meta {
		color: var(--body);
	}
	.ops {
		display: flex;
		gap: 8px;
	}
	.ops button {
		background: none;
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 3px 9px;
		font-size: 12px;
		cursor: pointer;
		color: var(--body);
	}
	.ops .del {
		color: var(--terra);
		border-color: var(--terra-bg);
	}
	.flag {
		position: absolute;
		top: 8px;
		left: 8px;
		background: var(--ink);
		color: #fff;
		font-size: 11px;
		border-radius: 6px;
		padding: 2px 7px;
	}
</style>
```

- [ ] **Step 5: Wire nav**

In `src/routes/dashboard/+layout.svelte`:

Add to the Planning group's items array (after Activity):
```ts
['/dashboard/gallery', 'Gallery', 'camera']
```

Add to `META`:
```ts
'/dashboard/gallery': { title: 'Photo gallery', subtitle: 'Guest snaps, the QR code & moderation' }
```

Add to the `icon` snippet (before the closing `{/if}`):
```svelte
{:else if name === 'camera'}<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>
```

- [ ] **Step 6: Verify + commit**

Run: `npm run check && npm test`
Expected: 0 errors, tests pass. Manual: `/dashboard/gallery` renders with stats, QR download works, nav shows Gallery.

```bash
git add src/routes/dashboard/gallery/ src/routes/dashboard/+layout.svelte
git commit -m "feat(gallery): dashboard management page, QR download, moderation"
```

---

### Task 8: Env docs, deploy notes & final verification

**Files:**
- Modify: `.env.example`
- Modify: `DEPLOY.md`

- [ ] **Step 1: Document env vars**

Append to `.env.example` after the Cron section:

```
# ── Gallery (guest photo uploads) ───────────────────────────────────────────
# Vercel Blob read-write token. Created automatically when you add a Blob
# store to the Vercel project (Storage tab → Create → Blob). Needed locally
# only to test real uploads.
BLOB_READ_WRITE_TOKEN=
# Shared guest password for /gallery (the non-QR route). Scanning the QR
# bypasses this. Pick something guests can be told out loud.
GALLERY_PASSWORD=
```

- [ ] **Step 2: Deploy notes**

Append a short section to `DEPLOY.md`:

```markdown
## Gallery (Vercel Blob)

1. Vercel project → Storage → Create → **Blob** → connect to this project.
   This injects `BLOB_READ_WRITE_TOKEN` into the deployment automatically.
2. Set `GALLERY_PASSWORD` in the project env vars.
3. **Plan:** Blob on Hobby hard-caps at 1GB storage / 10GB transfer and then
   blocks — upgrade to Pro before the wedding. Downgrade after.
4. Print the QR from `/dashboard/gallery` (error-correction H, 1024px).
5. Test the whole loop from a phone on mobile data before printing.
```

- [ ] **Step 3: Full verification**

Run: `npm run check && npm test && npm run build`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add .env.example DEPLOY.md
git commit -m "docs(gallery): env vars and Blob deploy notes"
```

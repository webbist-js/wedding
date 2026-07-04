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

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

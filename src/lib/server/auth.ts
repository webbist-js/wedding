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
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

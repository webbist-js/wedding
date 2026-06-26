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
	it('round-trips a valid signed token and returns the slug', () => {
		const token = signSession(SECRET, 'alex');
		expect(verifySession(token, SECRET)).toEqual({ slug: 'alex' });
	});
	it('rejects a tampered token', () => {
		const token = signSession(SECRET, 'alex') + 'x';
		expect(verifySession(token, SECRET)).toBeNull();
	});
	it('rejects a token signed with a different secret', () => {
		const token = signSession('other', 'katie');
		expect(verifySession(token, SECRET)).toBeNull();
	});
	it('returns null for a missing token', () => {
		expect(verifySession(undefined, SECRET)).toBeNull();
	});
});

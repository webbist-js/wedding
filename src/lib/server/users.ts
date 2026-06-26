import { verifyPasscode } from './auth';

// The two pseudo-users. Identity only — passcode hashes live in env
// (PASSCODE_HASH_ALEX / PASSCODE_HASH_KATIE), never in the DB.
export interface PseudoUser {
	slug: string;
	name: string;
}

export const PSEUDO_USERS: PseudoUser[] = [
	{ slug: 'alex', name: 'Alex' },
	{ slug: 'katie', name: 'Katie' }
];

// Return the slug whose stored hash matches the passcode, or null. `hashes` is
// keyed by slug so callers inject env values without this module touching $env.
export async function resolvePasscodeSlug(
	passcode: string,
	hashes: Record<string, string | undefined>
): Promise<string | null> {
	for (const u of PSEUDO_USERS) {
		const hash = hashes[u.slug];
		if (hash && (await verifyPasscode(passcode, hash))) return u.slug;
	}
	return null;
}

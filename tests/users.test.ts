import { describe, it, expect } from 'vitest';
import { hashPasscode } from '../src/lib/server/auth';
import { resolvePasscodeSlug, PSEUDO_USERS } from '../src/lib/server/users';

describe('resolvePasscodeSlug', () => {
	it('returns the slug whose hash matches', async () => {
		const hashes = {
			alex: await hashPasscode('alex-secret'),
			katie: await hashPasscode('katie-secret')
		};
		expect(await resolvePasscodeSlug('katie-secret', hashes)).toBe('katie');
		expect(await resolvePasscodeSlug('alex-secret', hashes)).toBe('alex');
	});
	it('returns null when nothing matches', async () => {
		const hashes = { alex: await hashPasscode('alex-secret') };
		expect(await resolvePasscodeSlug('nope', hashes)).toBeNull();
	});
	it('ignores users with no configured hash', async () => {
		expect(await resolvePasscodeSlug('anything', { alex: undefined, katie: undefined })).toBeNull();
	});
	it('lists exactly the two pseudo-users', () => {
		expect(PSEUDO_USERS.map((u) => u.slug)).toEqual(['alex', 'katie']);
	});
});

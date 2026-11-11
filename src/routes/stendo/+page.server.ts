import type { PageServerLoad } from './$types';
import { tripState } from '$lib/server/cp-trip';

// Everything SSR'd so the page is complete on first paint; the client polls
// /stendo/trip for fresh payments and activity poll results.
export const load: PageServerLoad = async ({ locals }) => ({ trip: await tripState(), organiser: locals.authed, now: Date.now() });

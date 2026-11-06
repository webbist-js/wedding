import type { PageServerLoad } from './$types';
import { HOUSES, LEADS, EXTRAS, VOTES_TOTAL } from '$lib/sten-do';
import { getOrCreateVoterId, aggregate, getBallot, listNames } from '$lib/server/sten-do';

// SSR the shortlist and the current tally so the board is populated on first
// paint (no flash of empty votes), and hand the client its own saved ballot.
export const load: PageServerLoad = async ({ cookies }) => {
	const voterId = getOrCreateVoterId(cookies);
	const [{ totals, voterCount }, mine, names] = await Promise.all([
		aggregate(),
		getBallot(voterId),
		listNames()
	]);
	return {
		houses: HOUSES,
		leads: LEADS,
		extras: EXTRAS,
		votesTotal: VOTES_TOTAL,
		totals,
		voterCount,
		mine: mine.picks,
		myName: mine.name,
		names
	};
};

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getOrCreateVoterId, aggregate, getBallot, listNames } from '$lib/server/sten-do';

// Polled by the page every few seconds for live totals. Returns the aggregate
// plus this voter's own stored ballot so the client can reconcile.
export const GET: RequestHandler = async ({ cookies }) => {
	const voterId = getOrCreateVoterId(cookies);
	const [{ totals, voterCount }, mine, names] = await Promise.all([
		aggregate(),
		getBallot(voterId),
		listNames()
	]);
	return json(
		{ totals, voterCount, mine: mine.picks, myName: mine.name, names },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

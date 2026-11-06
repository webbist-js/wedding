import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getOrCreateVoterId, claimBallot, aggregate, listNames, cleanName } from '$lib/server/sten-do';

// Called when a contestant sets their name. If that name already has a ballot
// (same person, new phone / cleared cookies) this browser takes it over and
// gets its picks back; otherwise the name is attached to this browser's ballot.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const voterId = getOrCreateVoterId(cookies);
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Expected JSON body');
	}
	const name = cleanName((body as { name?: unknown } | null)?.name);
	if (!name) throw error(400, 'Name required');
	const mine = await claimBallot(voterId, name);
	const [{ totals, voterCount }, names] = await Promise.all([aggregate(), listNames()]);
	return json(
		{ ok: true, name: mine.name, mine: mine.picks, claimed: mine.claimed, totals, voterCount, names },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

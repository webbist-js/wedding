import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getOrCreateVoterId, claimBallot, aggregate, cleanName } from '$lib/server/sten-do';

// Upsert this voter's ballot, then return the fresh aggregate so the client
// can settle its optimistic state against the real totals immediately.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const voterId = getOrCreateVoterId(cookies);
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Expected JSON body');
	}
	const { name, picks } = (body ?? {}) as { name?: unknown; picks?: unknown };
	// The name is the ballot's identity, so a nameless vote has nowhere to go.
	if (!cleanName(name)) throw error(400, 'Name required');
	// Resolves the name first (claiming an existing ballot if needed), then stores picks.
	const mine = await claimBallot(voterId, name, picks ?? {});
	const { totals, voterCount } = await aggregate();
	return json(
		{ ok: true, name: mine.name, mine: mine.picks, totals, voterCount },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getOrCreateVoterId, saveBallot, aggregate } from '$lib/server/sten-do';

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
	const mine = await saveBallot(voterId, name, picks);
	const { totals, voterCount } = await aggregate();
	return json(
		{ ok: true, mine, totals, voterCount },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { summary, getResponse, allResponses } from '$lib/server/stendo';

// Polled for live totals. `?name=` also returns that person's saved answers so
// picking your name on another device restores them.
export const GET: RequestHandler = async ({ url, locals }) => {
	const name = url.searchParams.get('name');
	const [s, mine, rows] = await Promise.all([
		summary(),
		name ? getResponse(name) : Promise.resolve(null),
		locals.authed ? allResponses() : Promise.resolve(null)
	]);
	return json({ ...s, mine, organiser: rows }, { headers: { 'cache-control': 'no-store' } });
};

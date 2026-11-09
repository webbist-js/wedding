import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { cleanName } from '$lib/stendo';
import { saveResponse, summary, allResponses } from '$lib/server/stendo';

// Upsert one person's answers and hand back the fresh totals.
export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Expected JSON body');
	}
	const name = cleanName((body as { name?: unknown } | null)?.name);
	if (!name) throw error(400, 'Name required');
	const mine = await saveResponse(name, body);
	const [s, rows] = await Promise.all([summary(), locals.authed ? allResponses() : Promise.resolve(null)]);
	return json({ ok: true, mine, ...s, organiser: rows }, { headers: { 'cache-control': 'no-store' } });
};

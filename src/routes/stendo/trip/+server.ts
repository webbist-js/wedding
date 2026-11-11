import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { tripState, recordPayment, setInterest, setNote } from '$lib/server/cp-trip';

const fresh = { 'cache-control': 'no-store' };

// Polled by /stendo for payments and activity poll results.
export const GET: RequestHandler = async ({ locals }) => json({ ...(await tripState()), organiser: locals.authed }, { headers: fresh });

// Everyone: interest. Organiser only: payment / note. Legacy calculator actions are retired.
export const POST: RequestHandler = async ({ request, locals }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Expected JSON body');
	}
	const organiserOnly = ['publish', 'payment', 'note'];
	if (organiserOnly.includes(String(body.action)) && !locals.authed) throw error(403, 'Only Alex can do that');
	try {
		switch (body.action) {
			case 'pledge':
			case 'approve':
			case 'publish':
				throw error(410, 'The calculator has been retired. The fixed £178-per-adult budget now applies.');
			case 'interest':
				await setInterest(body.person, body.activity, body.on === true);
				break;
			case 'payment':
				await recordPayment({ group: body.group, pence: body.pence, receivedOn: body.receivedOn, note: body.note });
				break;
			case 'note':
				await setNote(body.key, body.body);
				break;
			default:
				throw error(400, 'Unknown action');
		}
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(400, e instanceof Error ? e.message : 'Couldn’t save that');
	}
	return json({ ok: true, ...(await tripState()), organiser: locals.authed }, { headers: fresh });
};

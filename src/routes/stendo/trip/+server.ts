import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { tripState, pledge, approve, publish, recordPayment, setInterest, setNote } from '$lib/server/cp-trip';
import type { Contributions } from '$lib/cp-trip';

const fresh = { 'cache-control': 'no-store' };

// Polled by /stendo for live pledges, approvals, payments and poll results.
export const GET: RequestHandler = async ({ locals }) => json({ ...(await tripState()), organiser: locals.authed }, { headers: fresh });

// Everyone: pledge / approve / interest. Organiser only: publish / payment / note.
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
				await pledge(body.group, body.pence);
				break;
			case 'approve':
				await approve(body.group, (body.amounts ?? null) as Contributions | null);
				break;
			case 'interest':
				await setInterest(body.person, body.activity, body.on === true);
				break;
			case 'publish':
				await publish();
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

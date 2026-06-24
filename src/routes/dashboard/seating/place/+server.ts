import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { parseOccupant, placeOccupant } from '$lib/server/seating';

// Drag-and-drop seat placement. Body: { occupant: "guest:12"|"couple:bride",
// tableNo, seatNo }. tableNo null unseats. Swaps any occupant already in the seat.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { occupant, tableNo, seatNo } = await request.json();
	const o = parseOccupant(occupant);
	if (!o) throw error(400, 'bad occupant');
	await placeOccupant(
		o,
		tableNo == null || tableNo === '' ? null : Number(tableNo),
		seatNo == null || seatNo === '' ? null : Number(seatNo)
	);
	return json({ ok: true });
};

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { parseOccupant, placeOccupant, firstFreeSeat } from '$lib/server/seating';

// Seat placement. Body: { occupant: "guest:12"|"couple:bride", tableNo, seatNo }.
// - tableNo null → unseat.
// - seatNo a number → that exact seat (drag-to-seat; swaps any occupant there).
// - seatNo omitted/null with a tableNo → first free seat at that table
//   (table-level click/drop assignment from the Plan tab).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { occupant, tableNo, seatNo } = await request.json();
	const o = parseOccupant(occupant);
	if (!o) throw error(400, 'bad occupant');

	const table = tableNo == null || tableNo === '' ? null : Number(tableNo);
	let seat = seatNo == null || seatNo === '' ? null : Number(seatNo);
	if (table != null && seat == null) seat = await firstFreeSeat(table);

	await placeOccupant(o, table, seat);
	return json({ ok: true });
};

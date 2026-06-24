import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { seatingTables } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Persist a table's floor-plan placement (drag + rotate). Body:
// { id, posX, posY, rotation }. Positions are % of the room (0..100).
const clampPct = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 0));

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, posX, posY, rotation } = await request.json();
	if (!id) throw error(400, 'bad id');
	const patch: { posX?: number; posY?: number; rotation?: number } = {};
	if (posX != null) patch.posX = clampPct(posX);
	if (posY != null) patch.posY = clampPct(posY);
	if (rotation != null) patch.rotation = Math.round(Number(rotation)) % 360;
	await db.update(seatingTables).set(patch).where(eq(seatingTables.id, Number(id)));
	return json({ ok: true });
};

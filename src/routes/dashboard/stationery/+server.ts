import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { stationeryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const { id, done } = await request.json();
  await db.update(stationeryItems).set({ done: !!done }).where(eq(stationeryItems.id, id));
  await recordAudit(locals, { action: 'update', entity: 'stationery', entityId: Number(id), summary: 'Updated stationery' });
  return json({ ok: true });
};

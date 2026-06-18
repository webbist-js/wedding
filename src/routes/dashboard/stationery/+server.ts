import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { stationeryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const { id, done } = await request.json();
  await db.update(stationeryItems).set({ done: !!done }).where(eq(stationeryItems.id, id));
  return json({ ok: true });
};

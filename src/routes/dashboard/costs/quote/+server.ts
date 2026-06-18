import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { quoteLines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const { id, field, value } = await request.json();
  if (field !== 'price' && field !== 'qty') throw error(400, 'bad field');
  await db
    .update(quoteLines)
    .set({ [field]: Number(value) || 0 })
    .where(eq(quoteLines.id, id));
  return json({ ok: true });
};

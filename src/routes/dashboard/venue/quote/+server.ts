import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { quoteLines, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SETTING_KEYS = ['dayGuests', 'eveGuests', 'minSpend'];

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const body = await request.json();

  // Persist a guest-count / min-spend setting.
  if (typeof body.setting === 'string') {
    if (!SETTING_KEYS.includes(body.setting)) throw error(400, 'bad setting');
    await db
      .update(settings)
      .set({ value: String(Number(body.value) || 0) })
      .where(eq(settings.key, body.setting));
    return json({ ok: true });
  }

  // Persist a quote line price/qty edit.
  const { id, field, value } = body;
  if (field !== 'price' && field !== 'qty') throw error(400, 'bad field');
  await db
    .update(quoteLines)
    .set({ [field]: Number(value) || 0 })
    .where(eq(quoteLines.id, id));
  return json({ ok: true });
};

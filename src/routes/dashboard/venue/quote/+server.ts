import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { quoteLines, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SETTING_KEYS = ['dayGuests', 'eveGuests', 'minSpend'];
const SCOPES = new Set(['day', 'eve', 'fixed', 'custom']);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const body = await request.json();

  // Add a new quote line — returns its id so the client can track it.
  if (body.op === 'add') {
    const [row] = await db
      .insert(quoteLines)
      .values({ label: 'New item', section: 'Custom', scope: 'fixed', price: 0, sort: 999 })
      .returning({ id: quoteLines.id });
    return json({ id: row.id });
  }

  // Remove a quote line.
  if (body.op === 'remove') {
    await db.delete(quoteLines).where(eq(quoteLines.id, Number(body.id)));
    return json({ ok: true });
  }

  // Persist a guest-count / min-spend setting.
  if (typeof body.setting === 'string') {
    if (!SETTING_KEYS.includes(body.setting)) throw error(400, 'bad setting');
    await db
      .update(settings)
      .set({ value: String(Number(body.value) || 0) })
      .where(eq(settings.key, body.setting));
    return json({ ok: true });
  }

  // Persist a quote-line field edit.
  const { id, field, value } = body;
  if (field === 'label') {
    await db
      .update(quoteLines)
      .set({ label: String(value ?? '').trim() || 'Item' })
      .where(eq(quoteLines.id, Number(id)));
    return json({ ok: true });
  }
  if (field === 'scope') {
    const v = String(value ?? '');
    if (!SCOPES.has(v)) throw error(400, 'bad scope');
    await db
      .update(quoteLines)
      .set({ scope: v as 'day' | 'eve' | 'fixed' | 'custom' })
      .where(eq(quoteLines.id, Number(id)));
    return json({ ok: true });
  }
  if (field === 'bond') {
    await db
      .update(quoteLines)
      .set({ bond: !!value })
      .where(eq(quoteLines.id, Number(id)));
    return json({ ok: true });
  }
  if (field === 'price' || field === 'qty') {
    await db
      .update(quoteLines)
      .set({ [field]: Number(value) || 0 })
      .where(eq(quoteLines.id, Number(id)));
    return json({ ok: true });
  }
  throw error(400, 'bad field');
};

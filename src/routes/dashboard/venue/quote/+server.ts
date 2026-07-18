import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { quoteLines, quoteSections, settings } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

const SETTING_KEYS = ['dayGuests', 'eveGuests', 'minSpend', 'vegGuests'];
const SCOPES = new Set(['day', 'eve', 'fixed', 'custom']);

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.authed) throw error(401);
  const body = await request.json();
  await recordAudit(locals, { action: 'update', entity: 'venue', summary: 'Edited the venue quote' });

  // Add a new quote line at the end of the given section — returns its id so
  // the client can track it.
  if (body.op === 'add') {
    const section = String(body.section ?? 'Custom');
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${quoteLines.sort}), -1)` })
      .from(quoteLines);
    const [row] = await db
      .insert(quoteLines)
      .values({ label: 'New item', section, scope: 'fixed', price: 0, sort: max + 1 })
      .returning({ id: quoteLines.id });
    return json({ id: row.id });
  }

  // Remove a quote line.
  if (body.op === 'remove') {
    await db.delete(quoteLines).where(eq(quoteLines.id, Number(body.id)));
    return json({ ok: true });
  }

  // Persist a drag-and-drop reorder: every line's section + position in one go.
  if (body.op === 'reorder') {
    if (!Array.isArray(body.lines)) throw error(400, 'bad reorder');
    for (const l of body.lines) {
      await db
        .update(quoteLines)
        .set({ section: String(l.section), sort: Number(l.sort) || 0 })
        .where(eq(quoteLines.id, Number(l.id)));
    }
    return json({ ok: true });
  }

  // ---- Section header management ----

  if (body.op === 'addSection') {
    const name = String(body.name ?? '').trim() || 'New section';
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${quoteSections.sort}), -1)` })
      .from(quoteSections);
    const [row] = await db
      .insert(quoteSections)
      .values({ name, sort: max + 1 })
      .returning({ id: quoteSections.id });
    return json({ id: row.id });
  }

  // Rename a section: lines reference sections by name, so both move together.
  if (body.op === 'renameSection') {
    const name = String(body.name ?? '').trim() || 'Section';
    const [row] = await db
      .select()
      .from(quoteSections)
      .where(eq(quoteSections.id, Number(body.id)));
    if (!row) throw error(404, 'no such section');
    await db.update(quoteSections).set({ name }).where(eq(quoteSections.id, row.id));
    await db.update(quoteLines).set({ section: name }).where(eq(quoteLines.section, row.name));
    return json({ ok: true });
  }

  // Remove a section header; its lines (if any) move to the section named in
  // `moveTo`, which the client picks as the nearest neighbour.
  if (body.op === 'removeSection') {
    const [row] = await db
      .select()
      .from(quoteSections)
      .where(eq(quoteSections.id, Number(body.id)));
    if (!row) throw error(404, 'no such section');
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(quoteLines)
      .where(eq(quoteLines.section, row.name));
    if (n > 0) {
      const moveTo = String(body.moveTo ?? '');
      if (!moveTo) throw error(400, 'section not empty');
      await db.update(quoteLines).set({ section: moveTo }).where(eq(quoteLines.section, row.name));
    }
    await db.delete(quoteSections).where(eq(quoteSections.id, row.id));
    return json({ ok: true });
  }

  // Persist a section header reorder.
  if (body.op === 'sectionOrder') {
    if (!Array.isArray(body.sections)) throw error(400, 'bad order');
    for (const s of body.sections) {
      await db
        .update(quoteSections)
        .set({ sort: Number(s.sort) || 0 })
        .where(eq(quoteSections.id, Number(s.id)));
    }
    return json({ ok: true });
  }

  // Cost basis is a string setting, not numeric.
  if (body.setting === 'venueCostBasis') {
    const v = String(body.value ?? '');
    if (!['manual', 'estimate', 'confirmed'].includes(v)) throw error(400, 'bad basis');
    await db.update(settings).set({ value: v }).where(eq(settings.key, 'venueCostBasis'));
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
  if (field === 'meal') {
    const v = String(value ?? '');
    if (!['any', 'veg', 'nonveg'].includes(v)) throw error(400, 'bad meal');
    await db
      .update(quoteLines)
      .set({ meal: v as 'any' | 'veg' | 'nonveg' })
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

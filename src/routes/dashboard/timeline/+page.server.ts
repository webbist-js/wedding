import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { timelinePhases, timelineItems } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

export const load: PageServerLoad = async () => {
  const phases = await db.select().from(timelinePhases).orderBy(asc(timelinePhases.sort));
  const items = await db.select().from(timelineItems).orderBy(asc(timelineItems.sort));
  return { phases: phases.map((p) => ({ ...p, items: items.filter((i) => i.phaseId === p.id) })) };
};

export const actions: Actions = {
  toggle: async ({ request, locals }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const [row] = await db.select().from(timelineItems).where(eq(timelineItems.id, id));
    if (row) await db.update(timelineItems).set({ done: !row.done }).where(eq(timelineItems.id, id));
    await recordAudit(locals, { action: 'update', entity: 'timeline', entityId: id, summary: 'Toggled a timeline task' });
  },
  addItem: async ({ request, locals }) => {
    const f = await request.formData();
    const [row] = await db.insert(timelineItems).values({ phaseId: Number(f.get('phaseId')), label: String(f.get('label') ?? 'New task'), done: false, sort: 999 }).returning({ id: timelineItems.id });
    await recordAudit(locals, { action: 'create', entity: 'timeline', entityId: row.id, summary: 'Added a timeline task' });
  },
  removeItem: async ({ request, locals }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    await db.delete(timelineItems).where(eq(timelineItems.id, id));
    await recordAudit(locals, { action: 'delete', entity: 'timeline', entityId: id, summary: 'Removed a timeline task' });
  },
  addPhase: async ({ request, locals }) => {
    const f = await request.formData();
    const [row] = await db.insert(timelinePhases).values({ title: String(f.get('title') ?? 'New phase'), window: String(f.get('window') ?? ''), sort: 999 }).returning({ id: timelinePhases.id });
    await recordAudit(locals, { action: 'create', entity: 'timeline', entityId: row.id, summary: 'Added a timeline phase' });
  },
  setDueDate: async ({ request, locals }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const raw = String(f.get('dueDate') ?? '').trim();
    // YYYY-MM-DD; empty clears the date and the sent-reminders log.
    const value = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    await db
      .update(timelineItems)
      .set({ dueDate: value, notificationsSent: '' })
      .where(eq(timelineItems.id, id));
    await recordAudit(locals, { action: 'update', entity: 'timeline', entityId: id, summary: 'Set a due date' });
  }
};

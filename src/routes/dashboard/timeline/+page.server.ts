import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { timelinePhases, timelineItems } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const phases = await db.select().from(timelinePhases).orderBy(asc(timelinePhases.sort));
  const items = await db.select().from(timelineItems).orderBy(asc(timelineItems.sort));
  return { phases: phases.map((p) => ({ ...p, items: items.filter((i) => i.phaseId === p.id) })) };
};

export const actions: Actions = {
  toggle: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const [row] = await db.select().from(timelineItems).where(eq(timelineItems.id, id));
    if (row) await db.update(timelineItems).set({ done: !row.done }).where(eq(timelineItems.id, id));
  },
  addItem: async ({ request }) => {
    const f = await request.formData();
    await db.insert(timelineItems).values({ phaseId: Number(f.get('phaseId')), label: String(f.get('label') ?? 'New task'), done: false, sort: 999 });
  },
  removeItem: async ({ request }) => {
    const f = await request.formData();
    await db.delete(timelineItems).where(eq(timelineItems.id, Number(f.get('id'))));
  },
  addPhase: async ({ request }) => {
    const f = await request.formData();
    await db.insert(timelinePhases).values({ title: String(f.get('title') ?? 'New phase'), window: String(f.get('window') ?? ''), sort: 999 });
  }
};

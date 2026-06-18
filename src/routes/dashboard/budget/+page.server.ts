import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { budgetLines, stationeryItems, settings } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const lines = await db.select().from(budgetLines).orderBy(asc(budgetLines.sort));
  const statio = await db.select().from(stationeryItems).orderBy(asc(stationeryItems.sort));
  const setRows = await db.select().from(settings);
  const target = Number(Object.fromEntries(setRows.map((r) => [r.key, r.value])).target ?? 30000);
  return { lines, statio, target };
};

export const actions: Actions = {
  add: async ({ request }) => {
    const f = await request.formData();
    await db.insert(budgetLines).values({ category: String(f.get('category') ?? 'New line'), budgeted: 0, confirmed: 0, paid: 0, status: 'todo', sort: 999 });
  },
  update: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    await db.update(budgetLines).set({
      category: String(f.get('category')), budgeted: Number(f.get('budgeted')) || 0,
      confirmed: Number(f.get('confirmed')) || 0, paid: Number(f.get('paid')) || 0,
      status: String(f.get('status'))
    }).where(eq(budgetLines.id, id));
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(budgetLines).where(eq(budgetLines.id, Number(f.get('id'))));
  },
  setTarget: async ({ request }) => {
    const f = await request.formData();
    await db.update(settings).set({ value: String(Number(f.get('target')) || 0) }).where(eq(settings.key, 'target'));
  }
};

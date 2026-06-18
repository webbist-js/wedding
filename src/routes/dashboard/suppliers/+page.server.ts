import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { suppliers } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => ({
  suppliers: await db.select().from(suppliers).orderBy(asc(suppliers.sort))
});

export const actions: Actions = {
  add: async () => {
    await db.insert(suppliers).values({ category: 'New', status: 'todo', sort: 999 });
  },
  update: async ({ request }) => {
    const f = await request.formData();
    await db
      .update(suppliers)
      .set({
        category: String(f.get('category')),
        name: String(f.get('name') ?? ''),
        contact: String(f.get('contact') ?? ''),
        status: String(f.get('status')),
        notes: String(f.get('notes') ?? '')
      })
      .where(eq(suppliers.id, Number(f.get('id'))));
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(suppliers).where(eq(suppliers.id, Number(f.get('id'))));
  }
};

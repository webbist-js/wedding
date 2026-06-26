import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { vendors, appointments, notes } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => ({
  vendors: await db.select().from(vendors).orderBy(asc(vendors.sort)),
  appointments: await db
    .select({
      id: appointments.id,
      title: appointments.title,
      date: appointments.date,
      time: appointments.time,
      vendorId: appointments.vendorId
    })
    .from(appointments)
    .orderBy(asc(appointments.date), asc(appointments.time)),
  // Cross-linked notes filed against a vendor — also surface in the Notes hub.
  notes: await db
    .select()
    .from(notes)
    .where(eq(notes.entityType, 'vendor'))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id))
});

export const actions: Actions = {
  add: async () => {
    await db.insert(vendors).values({ category: 'New', stage: 'Lead', sort: 999 });
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(vendors).where(eq(vendors.id, Number(f.get('id'))));
  }
};

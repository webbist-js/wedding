import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { suppliers, appointments, notes } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';

export const load: PageServerLoad = async () => ({
  suppliers: await db.select().from(suppliers).orderBy(asc(suppliers.sort)),
  appointments: await db
    .select({
      id: appointments.id,
      title: appointments.title,
      date: appointments.date,
      time: appointments.time,
      supplierId: appointments.supplierId
    })
    .from(appointments)
    .orderBy(asc(appointments.date), asc(appointments.time)),
  // Cross-linked notes filed against a supplier — also surface in the Notes hub.
  notes: await db
    .select()
    .from(notes)
    .where(eq(notes.entityType, 'supplier'))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id))
});

export const actions: Actions = {
  add: async () => {
    await db.insert(suppliers).values({ category: 'New', status: 'todo', sort: 999 });
  },
  update: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const category = String(f.get('category'));
    const name = String(f.get('name') ?? '');
    const contact = String(f.get('contact') ?? '');
    const status = String(f.get('status'));

    // Detect a transition into "booked" so we can ping Slack once.
    const [prev] = await db.select({ status: suppliers.status }).from(suppliers).where(eq(suppliers.id, id));

    await db
      .update(suppliers)
      .set({ category, name, contact, status, notes: String(f.get('notes') ?? '') })
      .where(eq(suppliers.id, id));

    if (status === 'booked' && prev?.status !== 'booked') {
      const base = env.PUBLIC_BASE_URL ?? '';
      await notifySupplierBooked({
        category,
        name: name || null,
        contact: contact || null,
        dashboardUrl: base ? `${base}/dashboard/suppliers` : undefined
      });
    }
  },
  remove: async ({ request }) => {
    const f = await request.formData();
    await db.delete(suppliers).where(eq(suppliers.id, Number(f.get('id'))));
  }
};

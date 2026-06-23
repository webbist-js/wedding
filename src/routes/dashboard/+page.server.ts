import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';
import { db } from '$lib/server/db/index';
import { appointments, suppliers } from '$lib/server/db/schema';
import { asc, eq, gte } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const guests = await allGuests();
  const summary = summarise(guests as unknown as GuestRow[]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      date: appointments.date,
      time: appointments.time,
      supplierName: suppliers.name,
      supplierCategory: suppliers.category
    })
    .from(appointments)
    .leftJoin(suppliers, eq(appointments.supplierId, suppliers.id))
    .where(gte(appointments.date, today))
    .orderBy(asc(appointments.date), asc(appointments.time))
    .limit(5);
  return { summary, weddingISO: '2027-04-02T14:30:00', upcoming };
};

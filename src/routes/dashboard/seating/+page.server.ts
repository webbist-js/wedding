import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { guests, seatAssignments, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const all = await db.select().from(guests);
  const seats = await db.select().from(seatAssignments);
  const setRows = await db.select().from(settings);
  const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
  const seatMap = new Map(seats.map((x) => [x.guestId, x.tableNo]));
  return {
    tableCount: Number(s.tableCount ?? 7),
    seatMode: s.seatMode ?? 'day',
    guests: all.map((g) => ({ ...g, tableNo: seatMap.get(g.id) ?? null }))
  };
};

export const actions: Actions = {
  assign: async ({ request }) => {
    const f = await request.formData();
    const guestId = Number(f.get('guestId'));
    const raw = f.get('tableNo');
    if (!raw) {
      await db.delete(seatAssignments).where(eq(seatAssignments.guestId, guestId));
    } else {
      const tableNo = Number(raw);
      await db
        .insert(seatAssignments)
        .values({ guestId, tableNo })
        .onConflictDoUpdate({ target: seatAssignments.guestId, set: { tableNo } });
    }
  },
  setTableCount: async ({ request }) => {
    const f = await request.formData();
    await db
      .update(settings)
      .set({ value: String(Number(f.get('tableCount')) || 1) })
      .where(eq(settings.key, 'tableCount'));
  },
  clear: async () => {
    await db.delete(seatAssignments);
  }
};

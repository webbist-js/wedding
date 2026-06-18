import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { quoteLines, settings } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const lines = await db.select().from(quoteLines).orderBy(asc(quoteLines.sort));
  const setRows = await db.select().from(settings);
  const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
  return {
    lines,
    day: Number(s.dayGuests ?? 61),
    eve: Number(s.eveGuests ?? 90),
    min: Number(s.minSpend ?? 16455)
  };
};

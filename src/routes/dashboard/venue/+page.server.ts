import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { quoteLines, quoteSections, settings, guests } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { resolveHeadcounts, type CostBasis } from '$lib/headcount';

export const load: PageServerLoad = async () => {
  const lines = await db.select().from(quoteLines).orderBy(asc(quoteLines.sort));
  const sections = await db.select().from(quoteSections).orderBy(asc(quoteSections.sort));
  // Lines whose section has no header row (e.g. data predating the sections
  // table) still need a band to live under — create one so section edits work.
  for (const l of lines) {
    if (!sections.some((s) => s.name === l.section)) {
      const [row] = await db
        .insert(quoteSections)
        .values({ name: l.section, sort: sections.length })
        .returning();
      sections.push(row);
    }
  }
  const setRows = await db.select().from(settings);
  const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
  const manual = {
    day: Number(s.dayGuests ?? 61),
    eve: Number(s.eveGuests ?? 90),
    veg: Number(s.vegGuests ?? 0)
  };
  const allGuests = await db.select().from(guests);
  return {
    lines,
    sections,
    manual,
    min: Number(s.minSpend ?? 16455),
    basis: (['manual', 'estimate', 'confirmed'].includes(s.venueCostBasis)
      ? s.venueCostBasis
      : 'estimate') as CostBasis,
    // All three bases resolved server-side so the page can show the comparison
    // strip without re-deriving guest logic client-side.
    counts: {
      manual,
      estimate: resolveHeadcounts('estimate', allGuests, manual),
      confirmed: resolveHeadcounts('confirmed', allGuests, manual)
    },
    originalQuote: Number(s.venueOriginalQuote ?? 17319.4)
  };
};

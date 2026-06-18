import type { PageServerLoad } from './$types';
import { allGuests, summarise, type GuestRow } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
  const guests = await allGuests();
  const summary = summarise(guests as unknown as GuestRow[]);
  return { summary, weddingISO: '2027-04-02T14:30:00' };
};

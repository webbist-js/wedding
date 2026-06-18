import type { PageServerLoad } from './$types';
import { allGuests } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
  const guests = await allGuests();
  return { guests };
};

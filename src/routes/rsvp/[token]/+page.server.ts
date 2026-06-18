import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { groupWithMembers } from '$lib/server/queries';
import { parseRsvp } from '$lib/server/rsvp';
import { db } from '$lib/server/db/index';
import { guests, inviteGroups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const data = await groupWithMembers(params.token);
  if (!data) throw error(404, 'Invitation not found');
  return { group: data.group, members: data.members };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data = await groupWithMembers(params.token);
    if (!data) throw error(404);
    const fd = await request.formData();
    const parsed = parseRsvp(fd, data.members.map((m) => ({ id: m.id, isChild: m.isChild })));
    for (const g of parsed.guests) {
      await db.update(guests).set({ rsvpStatus: g.rsvpStatus, meal: g.meal, dietaryNotes: g.dietaryNotes }).where(eq(guests.id, g.id));
    }
    await db.update(inviteGroups).set({ message: parsed.message, respondedAt: new Date() }).where(eq(inviteGroups.id, data.group.id));
    return { saved: true };
  }
};

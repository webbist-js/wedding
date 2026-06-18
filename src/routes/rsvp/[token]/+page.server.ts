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
    const memberById = new Map(data.members.map((m) => [m.id, m]));
    for (const g of parsed.guests) {
      const update: Record<string, string | null | 'veg' | 'non-veg' | 'pending' | 'yes' | 'no'> = {
        rsvpStatus: g.rsvpStatus,
        meal: g.meal,
        dietaryNotes: g.dietaryNotes
      };
      // For plus-one slots, let the guest fill in their actual name and relation.
      const member = memberById.get(g.id);
      if (member?.isPlusOne) {
        const name = String(fd.get(`name_${g.id}`) ?? '').trim();
        const relation = String(fd.get(`relation_${g.id}`) ?? '').trim();
        if (name) update.name = name;
        if (relation) update.relation = relation;
      }
      await db.update(guests).set(update).where(eq(guests.id, g.id));
    }
    const allergies = String(fd.get('allergies') ?? '').trim() || null;
    await db.update(inviteGroups).set({
      message: parsed.message,
      allergiesNote: allergies,
      respondedAt: new Date()
    }).where(eq(inviteGroups.id, data.group.id));
    return { saved: true };
  }
};

export interface RsvpMember { id: number; isChild: boolean; }
export interface ParsedGuest { id: number; rsvpStatus: 'pending'|'yes'|'no'; meal: 'veg'|'non-veg'|null; dietaryNotes: string | null; }
export interface ParsedRsvp { guests: ParsedGuest[]; message: string | null; }

export function parseRsvp(fd: FormData, members: RsvpMember[]): ParsedRsvp {
  const guests = members.map((m) => {
    const attend = String(fd.get(`attend_${m.id}`) ?? 'pending');
    const status = attend === 'yes' ? 'yes' : attend === 'no' ? 'no' : 'pending';
    const rawMeal = String(fd.get(`meal_${m.id}`) ?? '');
    const meal: ParsedGuest['meal'] =
      status === 'yes' && !m.isChild && (rawMeal === 'veg' || rawMeal === 'non-veg') ? rawMeal : null;
    const rawDiet = String(fd.get(`diet_${m.id}`) ?? '').trim();
    const dietaryNotes = status === 'yes' && rawDiet ? rawDiet : null;
    return { id: m.id, rsvpStatus: status as ParsedGuest['rsvpStatus'], meal, dietaryNotes };
  });
  const msg = String(fd.get('message') ?? '').trim();
  return { guests, message: msg || null };
}

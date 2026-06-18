import { db } from './db/index';
import { guests, inviteGroups } from './db/schema';
import { eq } from 'drizzle-orm';

export interface GuestRow {
  attendanceType: 'day' | 'evening';
  isChild: boolean;
  rsvpStatus: 'pending' | 'yes' | 'no';
  meal: 'veg' | 'non-veg' | null;
  role: string | null;
}

export interface Summary {
  day: number;
  evening: number;
  total: number;
  rsvpYes: number;
  party: number;
  kids: number;
  cateringVeg: number;
  cateringNonVeg: number;
}

export function summarise(rows: GuestRow[]): Summary {
  const s: Summary = {
    day: 0,
    evening: 0,
    total: rows.length,
    rsvpYes: 0,
    party: 0,
    kids: 0,
    cateringVeg: 0,
    cateringNonVeg: 0
  };
  for (const r of rows) {
    if (r.attendanceType === 'day') s.day++;
    else s.evening++;
    if (r.rsvpStatus === 'yes') s.rsvpYes++;
    if (r.role) s.party++;
    if (r.rsvpStatus === 'yes' && r.isChild) s.kids++;
    if (r.rsvpStatus === 'yes' && !r.isChild && r.meal === 'veg') s.cateringVeg++;
    if (r.rsvpStatus === 'yes' && !r.isChild && r.meal === 'non-veg') s.cateringNonVeg++;
  }
  return s;
}

export async function allGuests() {
  return db.select().from(guests);
}

export async function groupWithMembers(token: string) {
  const [group] = await db.select().from(inviteGroups).where(eq(inviteGroups.token, token));
  if (!group) return null;
  const members = await db.select().from(guests).where(eq(guests.groupId, group.id));
  return { group, members };
}

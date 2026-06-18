import { describe, it, expect } from 'vitest';
import { summarise } from '../src/lib/server/queries';

const rows = [
  { attendanceType: 'day', isChild: false, rsvpStatus: 'yes', meal: 'veg', role: 'Best Man' },
  { attendanceType: 'day', isChild: false, rsvpStatus: 'yes', meal: 'non-veg', role: null },
  { attendanceType: 'day', isChild: true,  rsvpStatus: 'yes', meal: null, role: null },
  { attendanceType: 'evening', isChild: false, rsvpStatus: 'pending', meal: null, role: null },
  { attendanceType: 'day', isChild: false, rsvpStatus: 'no', meal: null, role: null }
] as const;

describe('summarise', () => {
  it('counts day/evening totals', () => {
    const s = summarise(rows as any);
    expect(s.day).toBe(4);
    expect(s.evening).toBe(1);
    expect(s.total).toBe(5);
  });
  it('counts rsvp yes and wedding party', () => {
    const s = summarise(rows as any);
    expect(s.rsvpYes).toBe(3);
    expect(s.party).toBe(1);
  });
  it('breaks catering into adult veg / non-veg / kids', () => {
    const s = summarise(rows as any);
    expect(s.cateringVeg).toBe(1);
    expect(s.cateringNonVeg).toBe(1);
    expect(s.kids).toBe(1);
  });
});

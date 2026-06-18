import { describe, it, expect } from 'vitest';
import { parseRsvp } from '../src/lib/server/rsvp';

const members = [
  { id: 1, isChild: false }, { id: 2, isChild: false }, { id: 3, isChild: true }
];

describe('parseRsvp', () => {
  it('maps per-guest attendance, meal and dietary; nulls meal for children and decliners', () => {
    const fd = new FormData();
    fd.set('attend_1', 'yes'); fd.set('meal_1', 'veg'); fd.set('diet_1', 'no nuts');
    fd.set('attend_2', 'no');  fd.set('meal_2', 'non-veg');
    fd.set('attend_3', 'yes'); fd.set('diet_3', 'small portion');
    fd.set('message', 'Cannot wait!');
    const r = parseRsvp(fd, members);
    expect(r.message).toBe('Cannot wait!');
    expect(r.guests).toEqual([
      { id: 1, rsvpStatus: 'yes', meal: 'veg', dietaryNotes: 'no nuts' },
      { id: 2, rsvpStatus: 'no', meal: null, dietaryNotes: null },
      { id: 3, rsvpStatus: 'yes', meal: null, dietaryNotes: 'small portion' }
    ]);
  });

  it('defaults missing attendance to pending', () => {
    const r = parseRsvp(new FormData(), [{ id: 9, isChild: false }]);
    expect(r.guests[0].rsvpStatus).toBe('pending');
  });
});

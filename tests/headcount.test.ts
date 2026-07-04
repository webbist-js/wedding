import { describe, it, expect } from 'vitest';
import { resolveHeadcounts, type HeadcountGuest } from '../src/lib/headcount';

const g = (over: Partial<HeadcountGuest>): HeadcountGuest => ({
	attendanceType: 'day',
	isChild: false,
	rsvpStatus: 'pending',
	meal: null,
	...over
});
const MANUAL = { day: 61, eve: 90, veg: 6 };

describe('manual basis', () => {
	it('returns the manual counts untouched', () => {
		expect(resolveHeadcounts('manual', [g({})], MANUAL)).toEqual(MANUAL);
	});
});

describe('estimate basis', () => {
	it('counts everyone not declined; eve = day + evening-only', () => {
		const guests = [
			g({}), // pending day — counted
			g({ rsvpStatus: 'yes' }),
			g({ rsvpStatus: 'no' }), // declined — excluded
			g({ attendanceType: 'evening' }),
			g({ attendanceType: 'evening', rsvpStatus: 'no' })
		];
		const r = resolveHeadcounts('estimate', guests, MANUAL);
		expect(r.day).toBe(2);
		expect(r.eve).toBe(3);
	});
	it('extrapolates the responded veg share to the full day count', () => {
		const guests = [
			g({ rsvpStatus: 'yes', meal: 'veg' }),
			g({ rsvpStatus: 'yes', meal: 'non-veg' }),
			g({}),
			g({})
		];
		// 1 of 2 responders veg → 50% of 4 day guests = 2
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(2);
	});
	it('falls back to manual veg (capped at day) when nobody has chosen', () => {
		const guests = [g({}), g({})];
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(2);
	});
	it('ignores children in the veg share', () => {
		const guests = [
			g({ rsvpStatus: 'yes', meal: 'veg', isChild: true }),
			g({ rsvpStatus: 'yes', meal: 'non-veg' })
		];
		expect(resolveHeadcounts('estimate', guests, MANUAL).veg).toBe(0);
	});
});

describe('confirmed basis', () => {
	it('counts RSVP yes only, veg from chosen meals', () => {
		const guests = [
			g({ rsvpStatus: 'yes', meal: 'veg' }),
			g({ rsvpStatus: 'yes', meal: 'non-veg' }),
			g({ rsvpStatus: 'yes' }), // yes, no meal picked → non-veg for pricing
			g({}), // pending — not confirmed
			g({ attendanceType: 'evening', rsvpStatus: 'yes' })
		];
		const r = resolveHeadcounts('confirmed', guests, MANUAL);
		expect(r).toEqual({ day: 3, eve: 4, veg: 1 });
	});
});

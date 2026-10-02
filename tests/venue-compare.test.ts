import { describe, it, expect } from 'vitest';
import { describeBasis } from '../src/lib/venue-compare';

describe('describeBasis', () => {
	it('with nobody confirmed, reports the floor (min spend + bond) and no guests', () => {
		const r = { spend: 12764.2, bond: 600, topup: 3690.8, grand: 17055 };
		expect(describeBasis(r, { day: 0, eve: 0, veg: 0 }, 16455)).toEqual({
			noGuests: true,
			topup: 3690.8,
			floor: 17055
		});
	});
	it('with guests below the minimum, passes the top-up through', () => {
		const r = { spend: 15000, bond: 600, topup: 1455, grand: 17055 };
		const d = describeBasis(r, { day: 20, eve: 30, veg: 2 }, 16455);
		expect(d.noGuests).toBe(false);
		expect(d.topup).toBe(1455);
	});
	it('above the minimum there is no top-up', () => {
		const r = { spend: 18922.2, bond: 600, topup: 0, grand: 19522.2 };
		expect(describeBasis(r, { day: 88, eve: 139, veg: 6 }, 16455).topup).toBe(0);
	});
});

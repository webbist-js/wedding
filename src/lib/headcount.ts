// Resolves the venue calculator's headcounts from the chosen cost basis.
// Pure: callers pass guest rows + the manually-typed fallback counts.

export type CostBasis = 'manual' | 'estimate' | 'confirmed';

export interface Headcounts {
	day: number;
	eve: number; // total evening attendance (day guests stay on)
	veg: number; // vegetarian mains among day guests; non-veg = day - veg
}

export interface HeadcountGuest {
	attendanceType: 'day' | 'evening';
	isChild: boolean;
	rsvpStatus: 'pending' | 'yes' | 'no';
	meal: 'veg' | 'non-veg' | null;
}

export function resolveHeadcounts(
	basis: CostBasis,
	guests: HeadcountGuest[],
	manual: Headcounts
): Headcounts {
	if (basis === 'manual') return { ...manual };

	// Meal choices only come from adult RSVP-yes responders.
	const respondedVeg = guests.filter(
		(g) => g.rsvpStatus === 'yes' && !g.isChild && g.meal === 'veg'
	).length;
	const respondedMeals = guests.filter(
		(g) => g.rsvpStatus === 'yes' && !g.isChild && g.meal !== null
	).length;

	if (basis === 'confirmed') {
		const day = guests.filter((g) => g.attendanceType === 'day' && g.rsvpStatus === 'yes').length;
		const eveOnly = guests.filter(
			(g) => g.attendanceType === 'evening' && g.rsvpStatus === 'yes'
		).length;
		return { day, eve: day + eveOnly, veg: respondedVeg };
	}

	// estimate: everyone still expected (not declined); veg share of responders
	// extrapolated to the full day count, manual fallback before any responses.
	const day = guests.filter((g) => g.attendanceType === 'day' && g.rsvpStatus !== 'no').length;
	const eveOnly = guests.filter(
		(g) => g.attendanceType === 'evening' && g.rsvpStatus !== 'no'
	).length;
	const veg =
		respondedMeals > 0
			? Math.round((day * respondedVeg) / respondedMeals)
			: Math.min(manual.veg, day);
	return { day, eve: day + eveOnly, veg };
}

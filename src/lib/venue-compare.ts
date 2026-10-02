// Explains a venue quote figure for one cost basis so the compare cards can
// say *why* a number is what it is — in particular that with nobody confirmed
// the "confirmed" cost is just the venue's minimum spend plus the bond.
import type { QuoteResult } from './quote';
import type { Headcounts } from './headcount';

export interface BasisDescription {
	noGuests: boolean; // no day or evening guests on this basis
	topup: number; // minimum-spend top-up currently applying (0 when above min)
	floor: number; // what you'd owe with nobody there: min spend + bond
}

export function describeBasis(r: QuoteResult, heads: Headcounts, min: number): BasisDescription {
	return {
		noGuests: heads.day === 0 && heads.eve === 0,
		topup: r.topup,
		floor: min + r.bond
	};
}

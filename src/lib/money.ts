// Pure money semantics shared by the budget rollup and its tests.

// Display formatter: whole pounds stay clean (£16), anything with pence shows
// both digits (£15.80) — never silently rounds.
export function gbp(n: number): string {
	const pence = Math.round(n * 100) / 100;
	return (
		'£' +
		pence.toLocaleString(
			'en-GB',
			Number.isInteger(pence)
				? { maximumFractionDigits: 0 }
				: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
		)
	);
}

export interface VendorMoney {
	quotedAmount?: number | null;
	stage: string;
	depositPaid: boolean;
}

// "Committed" = contractually on the hook: booked, or deposit down.
export function isCommitted(v: Pick<VendorMoney, 'stage' | 'depositPaid'>): boolean {
	return v.depositPaid || v.stage === 'Booked';
}

// A vendor-linked budget line's confirmed cost. Quotes from uncommitted
// vendors stay out of "confirmed" — they're still estimates.
export function linkedConfirmed(v: VendorMoney): number {
	return isCommitted(v) ? (v.quotedAmount ?? 0) : 0;
}

export function sumPayments(ps: { amount: number }[]): number {
	return ps.reduce((a, p) => a + p.amount, 0);
}

export function derivedStatus(
	confirmed: number,
	paid: number,
	committed: boolean
): 'Paid' | 'Deposit' | 'Booked' | 'Estimate' {
	if (confirmed > 0 && paid >= confirmed) return 'Paid';
	if (paid > 0) return 'Deposit';
	if (committed) return 'Booked';
	return 'Estimate';
}

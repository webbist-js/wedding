import { describe, it, expect } from 'vitest';
import { isCommitted, linkedConfirmed, sumPayments, derivedStatus, gbp } from '../src/lib/money';

describe('gbp', () => {
	it('keeps whole pounds clean', () => {
		expect(gbp(16)).toBe('£16');
		expect(gbp(30000)).toBe('£30,000');
	});
	it('always shows both pence digits when fractional', () => {
		expect(gbp(15.8)).toBe('£15.80');
		expect(gbp(58.28)).toBe('£58.28');
	});
	it('ignores floating-point dust', () => {
		expect(gbp(16.000000001)).toBe('£16');
		expect(gbp(0.1 + 0.2)).toBe('£0.30');
	});
});

describe('linkedConfirmed', () => {
	it('counts a booked vendor quote', () => {
		expect(linkedConfirmed({ quotedAmount: 2750, stage: 'Booked', depositPaid: false })).toBe(2750);
	});
	it('counts a deposit-paid vendor even mid-pipeline', () => {
		expect(linkedConfirmed({ quotedAmount: 600, stage: 'Quoted', depositPaid: true })).toBe(600);
	});
	it('ignores uncommitted quotes', () => {
		expect(linkedConfirmed({ quotedAmount: 900, stage: 'Quoted', depositPaid: false })).toBe(0);
	});
	it('treats a committed vendor with no quote as zero', () => {
		expect(linkedConfirmed({ quotedAmount: null, stage: 'Booked', depositPaid: true })).toBe(0);
	});
});

describe('sumPayments', () => {
	it('sums amounts', () => {
		expect(sumPayments([{ amount: 400 }, { amount: 100.5 }])).toBe(500.5);
	});
	it('is zero for none', () => {
		expect(sumPayments([])).toBe(0);
	});
});

describe('derivedStatus', () => {
	it('Paid when payments cover the confirmed cost', () => {
		expect(derivedStatus(2750, 2750, true)).toBe('Paid');
	});
	it('Deposit when partially paid', () => {
		expect(derivedStatus(2750, 400, true)).toBe('Deposit');
	});
	it('Booked when committed but unpaid', () => {
		expect(derivedStatus(2750, 0, true)).toBe('Booked');
	});
	it('Estimate when uncommitted', () => {
		expect(derivedStatus(0, 0, false)).toBe('Estimate');
	});
	it('never Paid at zero confirmed', () => {
		expect(derivedStatus(0, 50, false)).toBe('Deposit');
	});
});

describe('isCommitted', () => {
	it('booked stage commits', () => expect(isCommitted({ stage: 'Booked', depositPaid: false })).toBe(true));
	it('deposit commits', () => expect(isCommitted({ stage: 'Lead', depositPaid: true })).toBe(true));
	it('lead does not', () => expect(isCommitted({ stage: 'Lead', depositPaid: false })).toBe(false));
});

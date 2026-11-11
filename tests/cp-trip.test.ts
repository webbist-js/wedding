import { describe, it, expect } from 'vitest';
import {
	BOOKING, GROUPS, HOUSES, ORIGINAL, breakdown, lineFor, deltas, allocate, assertContribution, poundsToPence,
	proposalStatus, publishAgreement, currentAgreement, ledger, validatePayment, BASELINE_AGREEMENT, ContributionError,
	gbp, signed, countdown, daysUntil, groupsIn, PEOPLE, ADULTS,
	type Consent, type Agreement, type Payment, type GroupId, type Contributions
} from '../src/lib/cp-trip';

const totalOf = (id: GroupId, c?: Contributions) => lineFor(c ? breakdown(c) : ORIGINAL, id).total;
const sum = (b: ReturnType<typeof breakdown>) => b.lines.reduce((s, l) => s + l.total, 0);
const NOW = Date.UTC(2026, 10, 10, 12);

describe('who sleeps where', () => {
	it('puts the right people in each lodge', () => {
		expect(groupsIn('h1').map((g) => g.label)).toEqual(['Kie & Elisa', 'Alex & Katie', 'Oliver & Phoebe', 'Mule']);
		expect(groupsIn('h2').map((g) => g.label)).toEqual(['Chris & Jenn', 'Adam & Lysanne']);
		expect(groupsIn('h3').map((g) => g.label)).toEqual(['Chris & Hayley & Theo']);
		expect(groupsIn('h1').reduce((n, g) => n + g.adults, 0)).toBe(7);
		expect(ADULTS).toBe(13);
		expect(PEOPLE).toHaveLength(13);
	});

	it('lodge costs add up to the booking', () => {
		expect(HOUSES.reduce((s, h) => s + h.costPence, 0)).toBe(BOOKING.totalPence);
		expect(HOUSES.find((h) => h.id === 'h1')!.costPence - HOUSES.find((h) => h.id === 'h1')!.accommodationPence).toBe(7_900);
	});
});

describe('original costs', () => {
	it('match the confirmed baseline and total £3,557.00', () => {
		expect(ORIGINAL.total).toBe(355_700);
		expect(sum(ORIGINAL)).toBe(355_700);
		expect(Object.fromEntries(ORIGINAL.lines.map((l) => [l.group, l.total]))).toEqual({
			'kie-elisa': 55_000,
			'alex-katie': 114_900,
			'oliver-phoebe': 55_000,
			mule: 30_000,
			'chris-jenn': 22_950,
			'adam-lysanne': 22_950,
			'chris-hayley': 54_900
		});
	});

	it('moves £150 of House 1 onto Alex & Katie as the Big House Tax', () => {
		expect(Object.fromEntries(ORIGINAL.lines.map((l) => [l.group, l.bigHouseTax]))).toEqual({
			'kie-elisa': -7_000,
			'alex-katie': 15_000,
			'oliver-phoebe': -7_000,
			mule: -1_000,
			'chris-jenn': 0,
			'adam-lysanne': 0,
			'chris-hayley': 0
		});
		expect(ORIGINAL.lines.reduce((s, l) => s + l.bigHouseTax, 0)).toBe(0);
	});

	it('starts House 1 from an equal £310 per adult', () => {
		for (const id of ['kie-elisa', 'alex-katie', 'oliver-phoebe'] as const) expect(lineFor(ORIGINAL, id).accommodation).toBe(62_000);
		expect(lineFor(ORIGINAL, 'mule').accommodation).toBe(31_000);
	});

	it('keeps the £79 gym and bike extras with Alex & Katie alone', () => {
		expect(lineFor(ORIGINAL, 'alex-katie').extras).toBe(7_900);
		for (const g of GROUPS.filter((g) => g.id !== 'alex-katie')) expect(lineFor(ORIGINAL, g.id).extras).toBe(0);
	});

	it('applies the £100 gifts, and Mule gets none', () => {
		expect(lineFor(ORIGINAL, 'alex-katie').giftsGiven).toBe(30_000);
		for (const id of ['chris-jenn', 'adam-lysanne'] as const) expect(lineFor(ORIGINAL, id).giftsReceived).toBe(10_000);
		expect(lineFor(ORIGINAL, 'chris-hayley').giftsReceived).toBe(10_000);
		expect(lineFor(ORIGINAL, 'mule').giftsReceived).toBe(0);
		expect(ORIGINAL.lines.reduce((s, l) => s + l.giftsReceived, 0)).toBe(30_000);
	});
});

describe('the Fancy House Tax', () => {
	it('changes nothing with zero contributions', () => {
		expect(breakdown({ 'chris-jenn': 0, 'adam-lysanne': 0 }).lines).toEqual(ORIGINAL.lines);
	});

	it('£50 from each House 2 couple gives the worked example', () => {
		const c = { 'chris-jenn': 5_000, 'adam-lysanne': 5_000 };
		const b = breakdown(c);
		expect(b.pot).toBe(10_000);
		expect(Object.fromEntries(b.lines.map((l) => [l.group, l.total]))).toEqual({
			'kie-elisa': 50_000,
			'alex-katie': 114_900,
			'oliver-phoebe': 50_000,
			mule: 30_000,
			'chris-jenn': 27_950,
			'adam-lysanne': 27_950,
			'chris-hayley': 54_900
		});
		expect(b.total).toBe(355_700);
		expect(b.rounding).toEqual([]);
	});

	it('lets the two couples pick different amounts', () => {
		const b = breakdown({ 'chris-jenn': 2_000, 'adam-lysanne': 7_500 });
		expect(lineFor(b, 'chris-jenn').total).toBe(22_950 + 2_000);
		expect(lineFor(b, 'adam-lysanne').total).toBe(22_950 + 7_500);
		const d = deltas(b);
		expect(d['kie-elisa'] + d['oliver-phoebe']).toBe(-9_500);
		expect(d['alex-katie']).toBe(0);
		expect(d.mule).toBe(0);
	});

	it('never touches House 3, Alex & Katie, Mule, the extras or the gifts', () => {
		for (let cj = 0; cj <= 50_000; cj += 3_337) {
			for (const al of [0, 1, 999, 12_345, 50_000]) {
				const b = breakdown({ 'chris-jenn': cj, 'adam-lysanne': al });
				for (const id of ['chris-hayley', 'alex-katie', 'mule'] as const) expect(lineFor(b, id)).toEqual(lineFor(ORIGINAL, id));
				expect(lineFor(b, 'alex-katie').extras).toBe(7_900);
				expect(lineFor(b, 'alex-katie').giftsGiven).toBe(30_000);
				expect(lineFor(b, 'alex-katie').bigHouseTax).toBe(15_000);
			}
		}
	});

	it('always reconciles to the penny, with the rounding spread deterministically', () => {
		for (let t = 0; t <= 20_000; t += 1) {
			const b = breakdown({ 'chris-jenn': t, 'adam-lysanne': 0 });
			expect(sum(b)).toBe(355_700);
			const relief = b.lines.reduce((s, l) => s + l.relief, 0);
			expect(relief).toBe(t);
			// only Kie & Elisa and Oliver & Phoebe save, evenly, give or take a penny
			expect(Math.abs(lineFor(b, 'kie-elisa').relief - lineFor(b, 'oliver-phoebe').relief)).toBeLessThanOrEqual(1);
			expect(lineFor(b, 'alex-katie').relief + lineFor(b, 'mule').relief).toBe(0);
		}
		expect(breakdown({ 'chris-jenn': 1_234, 'adam-lysanne': 0 })).toEqual(breakdown({ 'chris-jenn': 1_234, 'adam-lysanne': 0 }));
	});

	it('rejects invalid contributions', () => {
		for (const bad of [-1, -500, 1.5, NaN, Infinity, 50_001, '500' as unknown as number])
			expect(() => breakdown({ 'chris-jenn': bad, 'adam-lysanne': 0 })).toThrow(ContributionError);
		expect(() => assertContribution(null)).toThrow(ContributionError);
		expect(assertContribution(50_000)).toBe(50_000);
	});

	it('parses pound amounts typed by hand', () => {
		expect(poundsToPence('50')).toBe(5_000);
		expect(poundsToPence('£12.5')).toBe(1_250);
		expect(poundsToPence(' 7.05 ')).toBe(705);
		for (const bad of ['-5', 'abc', '1.234', '', '£', '1e3']) expect(poundsToPence(bad)).toBeNull();
	});

	it('splits pennies with the largest remainder', () => {
		expect(allocate(10, [1, 1, 1])).toEqual({ shares: [4, 3, 3], extraPenny: [true, false, false] });
		expect(allocate(0, [2, 2, 2, 1]).shares).toEqual([0, 0, 0, 0]);
	});
});

describe('consensus', () => {
	const c = (group: GroupId, pledge: number | null, approved: Contributions | null = null): Consent => ({ group, pledge, approved, updatedAt: null });
	const fifty = { 'chris-jenn': 5_000, 'adam-lysanne': 5_000 };
	const allYes = (amounts: Contributions): Consent[] => [
		c('chris-jenn', amounts['chris-jenn']),
		c('adam-lysanne', amounts['adam-lysanne']),
		...(['kie-elisa', 'oliver-phoebe'] as const).map((g) => c(g, null, amounts))
	];

	it('treats silence as no', () => {
		const s = proposalStatus([], BASELINE_AGREEMENT);
		expect(s.ready).toBe(false);
		expect(s.proposal).toBeNull();
		expect(s.waitingOn).toEqual(['chris-jenn', 'adam-lysanne', 'kie-elisa', 'oliver-phoebe']);
	});

	it('needs both pledges and both receiving couples to approve those exact amounts', () => {
		expect(proposalStatus(allYes(fifty), BASELINE_AGREEMENT).ready).toBe(true);
		const oneMissing = allYes(fifty).filter((x) => x.group !== 'oliver-phoebe');
		expect(proposalStatus(oneMissing, BASELINE_AGREEMENT).waitingOn).toEqual(['oliver-phoebe']);
		// Alex & Katie and Mule aren't affected, so their say isn't needed
		expect(proposalStatus([...allYes(fifty), c('mule', null, null)], BASELINE_AGREEMENT).ready).toBe(true);
		// Chris & Jenn change their pledge: the old approvals no longer count
		const changed = allYes(fifty).map((x) => (x.group === 'chris-jenn' ? c('chris-jenn', 3_000) : x));
		const s = proposalStatus(changed, BASELINE_AGREEMENT);
		expect(s.ready).toBe(false);
		expect(s.approvals['kie-elisa']).toBe('outdated');
	});

	it('proposed amounts cannot silently replace agreed amounts', () => {
		const partial = [c('chris-jenn', 5_000), c('adam-lysanne', 5_000)];
		expect(() => publishAgreement(partial, BASELINE_AGREEMENT, new Date())).toThrow();
		// a pledge on its own doesn't move anything owed
		const l = ledger([], [], NOW);
		expect(l.accounts.find((a) => a.group === 'chris-jenn')!.owed).toBe(22_950);
		const v1 = publishAgreement(allYes(fifty), BASELINE_AGREEMENT, new Date('2026-12-01T00:00:00Z'));
		expect(v1).toMatchObject({ version: 1, contributions: fifty });
		expect(() => publishAgreement(allYes(fifty), v1, new Date())).toThrow(/already/);
		expect(currentAgreement([v1])).toEqual(v1);
	});
});

describe('payments', () => {
	const pay = (id: number, group: GroupId, pence: number): Payment => ({ id, group, pence, receivedOn: '2026-11-20', note: '', createdAt: '2026-11-20T10:00:00Z' });

	it('starts with only Alex & Katie paid (they paid the booking) and nothing invented', () => {
		const l = ledger([], [], NOW);
		expect(l.collected).toBe(114_900);
		expect(l.owed).toBe(355_700);
		expect(l.outstanding).toBe(355_700 - 114_900);
		const ak = l.accounts.find((a) => a.group === 'alex-katie')!;
		expect(ak).toMatchObject({ status: 'paid', upfront: true, outstanding: 0, payments: [] });
		expect(l.accounts.filter((a) => a.group !== 'alex-katie').every((a) => a.status === 'not-paid' && !a.overdue)).toBe(true);
	});

	it('keeps Alex & Katie settled whatever the agreed split', () => {
		const v1: Agreement = { version: 1, contributions: { 'chris-jenn': 5_000, 'adam-lysanne': 5_000 }, publishedAt: '2026-12-01T00:00:00Z' };
		const ak = ledger([v1], [], Date.UTC(2027, 0, 9)).accounts.find((a) => a.group === 'alex-katie')!;
		expect(ak).toMatchObject({ owed: 114_900, status: 'paid', overdue: false, refundDue: 0 });
	});

	it('tracks partial and full payments', () => {
		const l = ledger([], [pay(1, 'mule', 10_000), pay(2, 'kie-elisa', 55_000)], NOW);
		expect(l.accounts.find((a) => a.group === 'mule')).toMatchObject({ status: 'partial', paid: 10_000, outstanding: 20_000 });
		expect(l.accounts.find((a) => a.group === 'kie-elisa')).toMatchObject({ status: 'paid', outstanding: 0 });
		expect(l.collected).toBe(114_900 + 65_000);
		expect(l.outstanding).toBe(355_700 - 114_900 - 65_000);
	});

	it('keeps partial payments intact after an agreed change, and shows the adjustment', () => {
		const payments = [pay(1, 'mule', 10_000), pay(2, 'chris-jenn', 22_950)];
		const v1: Agreement = { version: 1, contributions: { 'chris-jenn': 5_000, 'adam-lysanne': 5_000 }, publishedAt: '2026-12-01T00:00:00Z' };
		const l = ledger([v1], payments, NOW);
		const mule = l.accounts.find((a) => a.group === 'mule')!;
		expect(mule.payments).toEqual([payments[0]]);
		expect(mule).toMatchObject({ paid: 10_000, owed: 30_000, outstanding: 20_000, status: 'partial' });
		expect(mule.history.map((h) => h.owed)).toEqual([30_000]);
		const ke = l.accounts.find((a) => a.group === 'kie-elisa')!;
		expect(ke.history.map((h) => h.owed)).toEqual([55_000, 50_000]);
		const cj = l.accounts.find((a) => a.group === 'chris-jenn')!;
		expect(cj).toMatchObject({ paid: 22_950, owed: 27_950, outstanding: 5_000, status: 'partial' });
		expect(l.owed).toBe(355_700);
		expect(l.collected).toBe(32_950 + 114_900);
	});

	it('flags refunds when a group paid more than its new agreed amount', () => {
		const v1: Agreement = { version: 1, contributions: { 'chris-jenn': 5_000, 'adam-lysanne': 5_000 }, publishedAt: '2026-12-01T00:00:00Z' };
		const l = ledger([v1], [pay(1, 'kie-elisa', 55_000)], NOW);
		expect(l.accounts.find((a) => a.group === 'kie-elisa')).toMatchObject({ status: 'overpaid', refundDue: 5_000, outstanding: 0 });
	});

	it('marks unpaid balances overdue after 8 January 2027, without forgiving them', () => {
		const after = Date.UTC(2027, 0, 9, 9);
		const l = ledger([], [pay(1, 'mule', 30_000)], after);
		expect(l.accounts.find((a) => a.group === 'mule')!.overdue).toBe(false);
		expect(l.accounts.find((a) => a.group === 'kie-elisa')).toMatchObject({ overdue: true, outstanding: 55_000 });
		expect(ledger([], [], Date.UTC(2027, 0, 8, 23, 0)).overdue).toBe(false);
	});

	it('validates payment entries', () => {
		expect(validatePayment({ group: 'mule', pence: 5_000, receivedOn: '2026-11-20', note: ' bank ' })).toEqual({ group: 'mule', pence: 5_000, receivedOn: '2026-11-20', note: 'bank' });
		expect(validatePayment({ group: 'mule', pence: -500, receivedOn: '2026-11-20' }).pence).toBe(-500);
		for (const bad of [{ group: 'nobody', pence: 1, receivedOn: '2026-11-20' }, { group: 'mule', pence: 0, receivedOn: '2026-11-20' }, { group: 'mule', pence: 1.5, receivedOn: '2026-11-20' }, { group: 'mule', pence: 100, receivedOn: 'soon' }])
			expect(() => validatePayment(bad)).toThrow();
	});
});

describe('formatting and countdowns', () => {
	it('formats money with clear signs', () => {
		expect(gbp(108_900)).toBe('£1,089.00');
		expect(signed(5_000)).toBe('+£50.00');
		expect(signed(-2_857)).toBe('−£28.57');
		expect(signed(0)).toBe('£0.00');
	});

	it('counts down to arrival and the deadline', () => {
		expect(countdown(BOOKING.arriveAt, Date.UTC(2027, 2, 18, 0, 0, 0))).toEqual({ past: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
		expect(countdown(BOOKING.arriveAt, BOOKING.arriveAt + 1).past).toBe(true);
		expect(daysUntil(BOOKING.deadline, NOW)).toBe(59);
		expect(daysUntil(BOOKING.arrive, NOW)).toBe(129);
	});
});

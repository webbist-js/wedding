import { describe, it, expect } from 'vitest';
import {
	CURRENT_BUDGET, ACCOMMODATION_TOTAL, ADDITIONAL_BIG_HOUSE_TAX, FOOD_ACTIVITY_POT, EXTRAS_TOTAL, BOOKING, GROUPS, HOUSES, ORIGINAL, breakdown, lineFor, deltas, allocate, assertContribution, poundsToPence,
	proposalStatus, publishAgreement, currentAgreement, ledger, validatePayment, BASELINE_AGREEMENT, ContributionError,
	gbp, signed, countdown, daysUntil, groupsIn, PEOPLE, ADULTS, splitSaving, proposalSummary,
	type Consent, type Agreement, type Payment, type GroupId, type Contributions
} from '../src/lib/cp-trip';

const totalOf = (id: GroupId, c?: Contributions) => lineFor(c ? breakdown(c) : ORIGINAL, id).total;
const sum = (b: ReturnType<typeof breakdown>) => b.lines.reduce((s, l) => s + l.total, 0);
const NOW = Date.UTC(2026, 10, 10, 12);

describe('who sleeps where', () => {
	it('puts the right people in each lodge', () => {
		expect(groupsIn('h1').map((g) => g.label)).toEqual(['Kie & Elisa', 'Alex & Katie', 'Mule']);
		expect(groupsIn('h2').map((g) => g.label)).toEqual(['Chris & Jenn', 'Adam & Lysanne']);
		expect(groupsIn('h3').map((g) => g.label)).toEqual(['Chris & Hayley & Theo', 'Oliver & Phoebe']);
		expect(groupsIn('h1').reduce((n, g) => n + g.adults, 0)).toBe(5);
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
			'alex-katie': 159_900,
			mule: 30_000,
			'chris-jenn': 22_950,
			'adam-lysanne': 22_950,
			'chris-hayley': 32_450,
			'oliver-phoebe': 32_450
		});
	});

	it('moves £80 of House 1 onto Alex & Katie as the Big House Tax', () => {
		expect(Object.fromEntries(ORIGINAL.lines.map((l) => [l.group, l.bigHouseTax]))).toEqual({
			'kie-elisa': -7_000,
			'alex-katie': 8_000,
			mule: -1_000,
			'chris-jenn': 0,
			'adam-lysanne': 0,
			'chris-hayley': 0,
			'oliver-phoebe': 0
		});
		expect(ORIGINAL.lines.reduce((s, l) => s + l.bigHouseTax, 0)).toBe(0);
	});

	it('charges House 1 at £310 a head, with Alex & Katie taking Oli & Phoebe’s empty places', () => {
		for (const id of ['kie-elisa', 'alex-katie'] as const) expect(lineFor(ORIGINAL, id).accommodation).toBe(62_000);
		expect(lineFor(ORIGINAL, 'mule').accommodation).toBe(31_000);
		expect(lineFor(ORIGINAL, 'alex-katie').absorbed).toBe(62_000);
		expect(ORIGINAL.lines.filter((l) => l.group !== 'alex-katie').every((l) => l.absorbed === 0)).toBe(true);
	});

	it('splits House 3 evenly between Chris & Hayley and Oli & Phoebe', () => {
		expect(lineFor(ORIGINAL, 'chris-hayley').accommodation).toBe(32_450);
		expect(lineFor(ORIGINAL, 'oliver-phoebe').accommodation).toBe(32_450);
	});

	it('keeps the £79 gym and bike extras with Alex & Katie alone', () => {
		expect(lineFor(ORIGINAL, 'alex-katie').extras).toBe(7_900);
		for (const g of GROUPS.filter((g) => g.id !== 'alex-katie')) expect(lineFor(ORIGINAL, g.id).extras).toBe(0);
	});

	it('gives £100 gifts to House 2 only', () => {
		expect(lineFor(ORIGINAL, 'alex-katie').giftsGiven).toBe(20_000);
		for (const id of ['chris-jenn', 'adam-lysanne'] as const) expect(lineFor(ORIGINAL, id).giftsReceived).toBe(10_000);
		for (const id of ['chris-hayley', 'oliver-phoebe', 'mule', 'kie-elisa'] as const) expect(lineFor(ORIGINAL, id).giftsReceived).toBe(0);
		expect(ORIGINAL.lines.reduce((s, l) => s + l.giftsReceived, 0)).toBe(20_000);
	});
});

describe('the Fancy House Tax', () => {
	const C = (cj: number, al: number, op = 0): Contributions => ({ 'chris-jenn': cj, 'adam-lysanne': al, 'oliver-phoebe': op });

	it('changes nothing with zero contributions', () => {
		expect(breakdown(C(0, 0, 0)).lines).toEqual(ORIGINAL.lines);
	});

	it('£50 from each of the three couples gives the worked example', () => {
		const b = breakdown(C(5_000, 5_000, 5_000));
		expect(b.pot).toBe(15_000);
		expect(Object.fromEntries(b.lines.map((l) => [l.group, l.total]))).toEqual({
			'kie-elisa': 49_000,
			'alex-katie': 150_900,
			mule: 30_000,
			'chris-jenn': 27_950,
			'adam-lysanne': 27_950,
			'chris-hayley': 32_450,
			'oliver-phoebe': 37_450
		});
		expect(b.total).toBe(355_700);
		expect(b.rounding).toEqual([]);
	});

	it('lets each couple pick a different amount, and splits the saving 60/40', () => {
		const b = breakdown(C(2_000, 7_500, 0));
		expect(lineFor(b, 'chris-jenn').total).toBe(22_950 + 2_000);
		expect(lineFor(b, 'adam-lysanne').total).toBe(22_950 + 7_500);
		expect(lineFor(b, 'oliver-phoebe').total).toBe(32_450);
		const d = deltas(b);
		expect(d['alex-katie']).toBe(-5_700);
		expect(d['kie-elisa']).toBe(-3_800);
		expect(d.mule).toBe(0);
		expect(d['chris-hayley']).toBe(0);
	});

	it('never touches Mule, Chris & Hayley, the extras, the gifts or the Big House Tax', () => {
		for (let cj = 0; cj <= 25_000; cj += 3_337) {
			for (const al of [0, 1, 999, 12_345, 25_000]) {
				for (const op of [0, 777, 25_000]) {
					const b = breakdown(C(cj, al, op));
					for (const id of ['chris-hayley', 'mule'] as const) expect(lineFor(b, id)).toEqual(lineFor(ORIGINAL, id));
					expect(lineFor(b, 'oliver-phoebe').total).toBe(32_450 + op);
					expect(lineFor(b, 'alex-katie').extras).toBe(7_900);
					expect(lineFor(b, 'alex-katie').giftsGiven).toBe(20_000);
					expect(lineFor(b, 'alex-katie').bigHouseTax).toBe(8_000);
					expect(sum(b)).toBe(355_700);
				}
			}
		}
	});

	it('always reconciles to the penny, with the rounding spread deterministically', () => {
		for (let t = 0; t <= 20_000; t += 1) {
			const b = breakdown(C(t, 0, 0));
			expect(sum(b)).toBe(355_700);
			expect(b.lines.reduce((s, l) => s + l.relief, 0)).toBe(t);
			// 60% to Alex & Katie, 40% to Kie & Elisa, to the nearest penny
			expect(Math.abs(lineFor(b, 'alex-katie').relief - t * 0.6)).toBeLessThan(1);
			expect(Math.abs(lineFor(b, 'kie-elisa').relief - t * 0.4)).toBeLessThan(1);
		}
		expect(breakdown(C(1_234, 0, 0))).toEqual(breakdown(C(1_234, 0, 0)));
	});

	it('shows each offer’s saving split 60/40, to the penny', () => {
		expect(splitSaving(5_000)).toEqual([{ group: 'alex-katie', pence: 3_000 }, { group: 'kie-elisa', pence: 2_000 }]);
		expect(splitSaving(0)).toEqual([{ group: 'alex-katie', pence: 0 }, { group: 'kie-elisa', pence: 0 }]);
		for (const p of [1, 3, 7, 999, 12_345]) expect(splitSaving(p).reduce((n, x) => n + x.pence, 0)).toBe(p);
		// matches what the breakdown actually gives each couple
		const b = breakdown(C(1_234, 0, 0));
		for (const x of splitSaving(1_234)) expect(lineFor(b, x.group).relief).toBe(x.pence);
	});

	it('keeps shared "what if" text to the sharer’s own row', () => {
		const mine = proposalSummary(C(5_000, 0, 0), 'chris-jenn');
		expect(mine).toContain('Chris & Jenn: £229.50 → £279.50');
		expect(mine).not.toContain('Kie & Elisa:');
		expect(mine).not.toContain('Mule:');
		expect(mine).toContain('Alex & Katie save £30.00, Kie & Elisa save £20.00');
		const all = proposalSummary(C(5_000, 0, 0));
		for (const g of GROUPS) expect(all).toContain(`${g.label}:`);
	});

	it('rejects invalid contributions', () => {
		for (const bad of [-1, -500, 1.5, NaN, Infinity, 25_001, '500' as unknown as number]) {
			expect(() => breakdown(C(bad, 0, 0))).toThrow(ContributionError);
			expect(() => breakdown(C(0, 0, bad))).toThrow(ContributionError);
		}
		expect(() => assertContribution(null)).toThrow(ContributionError);
		expect(assertContribution(25_000)).toBe(25_000);
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
	const fifty: Contributions = { 'chris-jenn': 5_000, 'adam-lysanne': 5_000, 'oliver-phoebe': 0 };
	const allYes = (amounts: Contributions): Consent[] => [
		c('chris-jenn', amounts['chris-jenn']),
		c('adam-lysanne', amounts['adam-lysanne']),
		c('oliver-phoebe', amounts['oliver-phoebe']),
		...(['alex-katie', 'kie-elisa'] as const).map((g) => c(g, null, amounts))
	];

	it('treats silence as no', () => {
		const s = proposalStatus([], BASELINE_AGREEMENT);
		expect(s.ready).toBe(false);
		expect(s.proposal).toBeNull();
		expect(s.waitingOn).toEqual(['chris-jenn', 'adam-lysanne', 'oliver-phoebe', 'alex-katie', 'kie-elisa']);
	});

	it('needs all three offers, and Alex & Katie and Kie & Elisa to approve those exact amounts', () => {
		expect(proposalStatus(allYes(fifty), BASELINE_AGREEMENT).ready).toBe(true);
		const oneMissing = allYes(fifty).filter((x) => x.group !== 'kie-elisa');
		expect(proposalStatus(oneMissing, BASELINE_AGREEMENT).waitingOn).toEqual(['kie-elisa']);
		// Mule's share doesn't move, so their say isn't needed
		expect(proposalStatus([...allYes(fifty), c('mule', null, null)], BASELINE_AGREEMENT).ready).toBe(true);
		// no proposal until Oli & Phoebe answer too (£0 counts as an answer)
		expect(proposalStatus(allYes(fifty).filter((x) => x.group !== 'oliver-phoebe'), BASELINE_AGREEMENT).proposal).toBeNull();
		// Chris & Jenn change their pledge: the old approvals no longer count
		const changed = allYes(fifty).map((x) => (x.group === 'chris-jenn' ? c('chris-jenn', 3_000) : x));
		const s = proposalStatus(changed, BASELINE_AGREEMENT);
		expect(s.ready).toBe(false);
		expect(s.approvals['kie-elisa']).toBe('outdated');
	});

	it('proposed amounts cannot silently replace agreed amounts', () => {
		const partial = [c('chris-jenn', 5_000), c('adam-lysanne', 5_000), c('oliver-phoebe', 0)];
		expect(() => publishAgreement(partial, BASELINE_AGREEMENT, new Date())).toThrow();
		// a pledge on its own doesn't move anything owed
		const l = ledger([], [], NOW);
		expect(l.accounts.find((a) => a.group === 'chris-jenn')!.owed).toBe(25_600);
		const v1 = publishAgreement(allYes(fifty), BASELINE_AGREEMENT, new Date('2026-12-01T00:00:00Z'));
		expect(v1).toMatchObject({ version: 1, contributions: fifty });
		expect(() => publishAgreement(allYes(fifty), v1, new Date())).toThrow(/already/);
		expect(currentAgreement([v1])).toEqual(v1);
	});
});

describe('current budget and payments', () => {
	const pay = (id: number, group: GroupId, pence: number): Payment => ({ id, group, pence, receivedOn: '2026-11-20', note: '', createdAt: '2026-11-20T10:00:00Z' });

	it('charges £178 per adult, deducts each £100 gift once, and keeps the hosts at £2,000', () => {
		expect(Object.fromEntries(CURRENT_BUDGET.lines.map((l) => [l.group, l.total]))).toEqual({
			'kie-elisa': 35_600, 'alex-katie': 200_000, mule: 17_800,
			'chris-jenn': 25_600, 'adam-lysanne': 25_600,
			'chris-hayley': 35_600, 'oliver-phoebe': 35_600
		});
		for (const line of CURRENT_BUDGET.lines) {
			expect(line.accommodation + line.bigHouseTax + line.extras + line.giftsGiven - line.giftsReceived + line.sharedPot).toBe(line.total);
		}
		expect(CURRENT_BUDGET.lines.reduce((sum, l) => sum + l.total, 0)).toBe(375_800);
		expect(CURRENT_BUDGET.total).toBe(375_800);
		expect(CURRENT_BUDGET.lines.find((l) => l.group === 'alex-katie')!.accommodation).toBe(35_600);
		expect(ADDITIONAL_BIG_HOUSE_TAX).toBe(116_400);
		expect(ACCOMMODATION_TOTAL).toBe(347_800);
		expect(EXTRAS_TOTAL).toBe(7_900);
		expect(FOOD_ACTIVITY_POT).toBe(20_100);
		expect(ACCOMMODATION_TOTAL + EXTRAS_TOTAL + FOOD_ACTIVITY_POT).toBe(CURRENT_BUDGET.total);
	});

	it('credits the hosts’ upfront booking and does not invent payments from guests', () => {
		const l = ledger([], [], NOW);
		expect(l).toMatchObject({ collected: 200_000, owed: 375_800, outstanding: 175_800 });
		expect(l.accounts.find((a) => a.group === 'alex-katie')).toMatchObject({ status: 'paid', upfront: true, outstanding: 0, payments: [] });
		expect(l.accounts.filter((a) => a.group !== 'alex-katie').every((a) => a.status === 'not-paid')).toBe(true);
	});

	it('uses the fixed budget even when an old calculator agreement exists, retaining payments and history', () => {
		const old: Agreement = { version: 1, contributions: { 'chris-jenn': 5_000, 'adam-lysanne': 5_000, 'oliver-phoebe': 0 }, publishedAt: '2026-11-10T12:00:00Z' };
		const payments = [pay(1, 'chris-jenn', 22_950)];
		const account = ledger([old], payments, NOW).accounts.find((a) => a.group === 'chris-jenn')!;
		expect(account).toMatchObject({ owed: 25_600, paid: 22_950, outstanding: 2_650, status: 'partial', payments });
		expect(account.history.map((h) => h.owed)).toEqual([22_950, 27_950, 25_600]);
	});

	it('settles both gifted couples at £256 and preserves overpayments as refunds', () => {
		const l = ledger([], [pay(1, 'chris-jenn', 25_600), pay(2, 'adam-lysanne', 25_600), pay(3, 'kie-elisa', 55_000)], NOW);
		for (const id of ['chris-jenn', 'adam-lysanne']) expect(l.accounts.find((a) => a.group === id)).toMatchObject({ status: 'paid', outstanding: 0, refundDue: 0 });
		expect(l.accounts.find((a) => a.group === 'kie-elisa')).toMatchObject({ status: 'overpaid', refundDue: 19_400, outstanding: 0 });
	});

	it('tracks partial payments, corrections and overdue balances', () => {
		const l = ledger([], [pay(1, 'mule', 10_000), pay(2, 'mule', -500)], Date.UTC(2027, 0, 9));
		expect(l.accounts.find((a) => a.group === 'mule')).toMatchObject({ paid: 9_500, outstanding: 8_300, status: 'partial', overdue: true });
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

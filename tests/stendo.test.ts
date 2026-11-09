import { describe, it, expect } from 'vitest';
import {
	PLANS, LODGES, OFFER, GUEST_COUPLES, cheapestLodges, planFor, FOOD, ACTIVITIES, summarisePlan, accomRange, estimate, sanitizeResponse, tally,
	drive, crowMiles, HOME, VILLAGES, lodge, cleanName, nameKey
} from '../src/lib/stendo';

describe('Center Parcs plans', () => {
	it('gives every village five plans that house all six couples', () => {
		for (const village of ['sherwood', 'longleat'] as const) {
			const plans = PLANS.filter((p) => p.village === village);
			expect(plans).toHaveLength(5);
			for (const p of plans) {
				const guests = (p.hub?.couples ?? 0) + p.others.reduce((s, o) => s + (p.splitEvenly ? lodge(o.lodge).bedrooms : 1) * o.couples, 0);
				expect(guests).toBe(5); // five guest couples + Katie & Alex
				for (const id of [p.hosts, p.hub?.lodge, ...p.others.map((o) => o.lodge)].filter(Boolean))
					expect(lodge(id as string).village).toBe(village);
			}
		}
	});

	it('never squeezes more couples into a hub than it has bedrooms', () => {
		for (const p of PLANS) if (p.hub) expect(p.hub.couples).toBeLessThanOrEqual(lodge(p.hub.lodge).bedrooms);
	});

	it('splits the hub price and counts couples left in twin rooms', () => {
		const s = summarisePlan(PLANS.find((p) => p.id === 'sf-hot-tub-hub')!);
		expect(s.hubShare).toBeCloseTo(1559 / 3);
		expect(s.twinCouples).toBe(1);
		expect(s.guestLow).toBeCloseTo(1559 / 3);
		expect(s.guestHigh).toBe(579);
		expect(s.total).toBe(919 + 1559 + 579 * 2);
		expect(s.hasHotTub && s.hasSauna).toBe(true);
	});

	it('puts everyone in a double when Katie & Alex host the clubhouse', () => {
		const s = summarisePlan(PLANS.find((p) => p.id === 'lf-own-doors')!);
		expect(s.twinCouples).toBe(0);
		expect(s.guestLow).toBe(529);
		expect(s.guestHigh).toBe(529);
	});

	it('keeps every lodge price positive and every double count sane', () => {
		for (const l of LODGES) {
			expect(l.price).toBeGreaterThan(0);
			expect(l.doubles + l.twins).toBe(l.bedrooms);
		}
	});
});

describe('budget and bougy', () => {
	it('builds the Budget plan from the genuinely cheapest lodges, excluding Katie & Alex’s', () => {
		for (const village of ['sherwood', 'longleat'] as const) {
			const b = planFor(village, 'budget');
			const best = cheapestLodges(village, GUEST_COUPLES, [b.plan.hosts]);
			expect(b.total - lodge(b.plan.hosts).price).toBe(best!.total);
			expect(b.guestLow).toBeCloseTo(best!.total / GUEST_COUPLES);
		}
	});

	it('splits the Sherwood budget run evenly and counts the twin rooms', () => {
		const b = planFor('sherwood', 'budget');
		expect(b.guestLow).toBeCloseTo((799 + 699) / 5);
		expect(b.guestHigh).toBeCloseTo(b.guestLow);
		expect(b.twinCouples).toBe(3);
		expect(lodge(b.plan.hosts).name).toMatch(/Honeymoon/);
	});

	it('keeps Budget cheaper than Bougy in both villages', () => {
		for (const village of ['sherwood', 'longleat'] as const)
			expect(planFor(village, 'budget').guestHigh).toBeLessThan(planFor(village, 'bougy').guestLow);
	});
});

describe('estimates', () => {
	it('ranges each accommodation choice from cheapest to dearest', () => {
		expect(accomRange('sherwood', 'pair')).toEqual([349.5, 379.5]);
		expect(accomRange('longleat', 'own-budget')).toEqual([529, 529]);
		const either = accomRange('sherwood', 'either');
		expect(either[0]).toBeCloseTo(1498 / 5);
		expect(accomRange('longleat', 'cheapest')).toEqual([1728 / 5, 1728 / 5]);
	});

	it('takes the offer off accommodation only, and adds fuel for the round trip', () => {
		const e = estimate('longleat', 'own-budget', true, 100);
		expect(e.fuel).toBe(32);
		expect(e.total[0]).toBe(529 - OFFER + FOOD[0] + ACTIVITIES[0] + 32);
		const none = estimate('longleat', 'own-budget', false, null);
		expect(none.total[0]).toBe(529 + FOOD[0] + ACTIVITIES[0]);
	});

	it('puts Sherwood much closer to home than Longleat', () => {
		expect(drive(HOME, 'sherwood').miles).toBeLessThan(drive(HOME, 'longleat').miles);
		expect(Math.round(crowMiles(HOME, VILLAGES.sherwood))).toBeGreaterThan(50);
	});
});

describe('responses', () => {
	it('drops anything that is not a known choice', () => {
		expect(sanitizeResponse({ village: 'paris', accom: 'tent', budget: '9000', offer: 'yes', twinOk: true, notes: '  hi  ' }))
			.toEqual({ village: null, accom: null, budget: null, offer: false, twinOk: true, notes: 'hi' });
	});

	it('tallies only people who actually answered', () => {
		const base = { twinOk: false, budget: null, offer: false };
		const t = tally([
			{ name: 'A', village: 'sherwood', accom: 'hub', ...base, offer: true },
			{ name: 'B', village: 'longleat', accom: null, ...base },
			{ name: 'C', village: null, accom: null, ...base }
		]);
		expect(t.people).toBe(2);
		expect(t.village).toEqual({ sherwood: 1, longleat: 1 });
		expect(t.accom.hub).toBe(1);
		expect(t.offer).toBe(1);
	});

	it('treats names case- and space-insensitively', () => {
		expect(cleanName('  Elisa   Philips ')).toBe('Elisa Philips');
		expect(nameKey('ELISA philips')).toBe(nameKey(' elisa  Philips'));
	});
});

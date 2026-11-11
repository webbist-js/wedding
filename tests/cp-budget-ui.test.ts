// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClassComponent } from 'svelte/legacy';
import PayUp from '../src/lib/components/cp-trip/PayUp.svelte';
import TripBudgetCharts from '../src/lib/components/cp-trip/TripBudgetCharts.svelte';
import { ledger, type GroupId } from '../src/lib/cp-trip';

let component: ReturnType<typeof createClassComponent>;
const target = document.createElement('div');
afterEach(() => { component?.$destroy(); target.replaceChildren(); });

describe('fixed trip budget UI', () => {
	it.each(['chris-jenn', 'adam-lysanne'] as GroupId[])('shows the gift and remaining balance for %s', (myGroup) => {
		const now = Date.UTC(2026, 10, 11);
		component = createClassComponent({ component: PayUp, target, props: {
			ledger: ledger([], [{ id: 1, group: myGroup, pence: 10_000, receivedOn: '2026-11-11', note: '', createdAt: '2026-11-11T00:00:00Z' }], now),
			paymentDetails: '', myGroup, organiser: false, now, act: vi.fn(), onPickName: vi.fn()
		} });
		expect(target.textContent).toContain('£356 share − £100 gift from Alex & Katie = £256');
		expect(target.textContent).toContain('£156.00');
		expect(target.querySelectorAll('.acct')).toHaveLength(1);
		expect(target.textContent).not.toContain('calculator');
	});

	it('shows funding once and separates accommodation, extras and the shared pot', () => {
		component = createClassComponent({ component: TripBudgetCharts, target, props: {} });
		expect(target.textContent).toContain('£3,758.00');
		expect(target.textContent).toContain('£3,478.00');
		expect(target.textContent).toContain('£79.00');
		expect(target.textContent).toContain('£201.00');
		const bars = [...target.querySelectorAll('[role="img"]')].map((bar) => bar.getAttribute('aria-label'));
		expect(bars).toContain('Chris & Jenn: £256.00 paid themselves plus £100.00 covered by Alex & Katie');
		expect(bars).toContain('Adam & Lysanne: £256.00 paid themselves plus £100.00 covered by Alex & Katie');
		expect(bars).toContain('Alex & Katie: £1,800.00 paid themselves');
	});
});

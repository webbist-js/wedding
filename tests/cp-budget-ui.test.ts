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
			paymentDetails: '', organiser: false, now, act: vi.fn()
		} });
		expect(target.textContent).toContain('£329.50 real share − £73.50 gift from Alex & Katie = £256.00 to pay');
		expect(target.textContent).toContain('£156.00');
		expect(target.querySelectorAll('.acct')).toHaveLength(7);
		expect(target.textContent).toContain('Whole trip budget');
		expect(target.textContent).toContain('Alex & Katie');
		expect(target.querySelector('.org')).toBeNull();
		expect(target.textContent).not.toContain('calculator');
	});

	it('shows funding once and separates accommodation, extras and the shared pot', () => {
		component = createClassComponent({ component: TripBudgetCharts, target, props: {} });
		expect(target.textContent).toContain('£3,758.00');
		expect(target.textContent).toContain('£3,478.00');
		expect(target.textContent).toContain('£79.00');
		expect(target.textContent).toContain('£201.00');
		const bars = [...target.querySelectorAll('[role="img"]')].map((bar) => bar.getAttribute('aria-label'));
		expect(bars).toContain('Chris & Jenn: £256.00 paid themselves plus £73.50 covered by Alex & Katie');
		expect(bars).toContain('Chris & Hayley & Theo: £356.00 paid themselves plus £293.00 covered by Alex & Katie');
		expect(bars).toContain('Alex & Katie: £900.00 paid themselves');
	});
});

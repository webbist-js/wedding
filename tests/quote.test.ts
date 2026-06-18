import { describe, it, expect } from 'vitest';
import { computeQuote } from '../src/lib/quote';

const lines = [
  { scope: 'day', price: 50, qty: null, bond: false },
  { scope: 'eve', price: 15, qty: null, bond: false },
  { scope: 'fixed', price: 2900, qty: null, bond: false },
  { scope: 'custom', price: 2.4, qty: 56, bond: false },
  { scope: 'fixed', price: 500, qty: null, bond: true }
] as const;

describe('computeQuote', () => {
  it('sums chargeable spend by scope', () => {
    const r = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(r.spend).toBeCloseTo(61 * 50 + 90 * 15 + 2900 + 56 * 2.4);
  });
  it('separates the refundable bond', () => {
    const r = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(r.bond).toBe(500);
  });
  it('applies a minimum-spend top-up only when below minimum', () => {
    const low = computeQuote(lines as any, { day: 1, eve: 1, min: 20000 });
    expect(low.topup).toBeGreaterThan(0);
    const high = computeQuote(lines as any, { day: 61, eve: 90, min: 0 });
    expect(high.topup).toBe(0);
  });
});

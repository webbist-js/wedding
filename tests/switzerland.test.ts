import { describe, expect, it } from 'vitest';
import { dailySaving, daysToSave, tripCosts, HOTEL_RATES, IBIS_RATES, DAY_TRIP, FLIGHT_GIFT } from '../src/lib/switzerland';

describe('Switzerland couple budget', () => {
 it('keeps the day trip separate and never charges the flight gift', () => {
  const c = tripCosts('budget', 2);
  expect(FLIGHT_GIFT).toBe(180);
  expect(DAY_TRIP).toBe(180);
  expect(c.total[0]).toBeCloseTo(IBIS_RATES[2] + 192);
  expect(c.separateDayTrip).toBe(180);
  expect(c.total[1]).toBeCloseTo(IBIS_RATES[2] + 276 + 40);
 });
 it('uses independently quoted hotel prices and adds Monday meals for three nights', () => {
  const short = tripCosts('bougy', 2), long = tripCosts('bougy', 3);
  expect(short.room).toBe(HOTEL_RATES[2]);
  expect(long.room).toBe(HOTEL_RATES[3]);
  expect(long.food[0] - short.food[0]).toBe(28);
  expect(long.food[1] - short.food[1]).toBe(44);
 });
 it('does not double-charge included taxes or local transport for either hotel', () => {
  for(const style of ['budget','bougy'] as const) {
   const c = tripCosts(style, 3);
   expect(c.taxes).toEqual([0,0]);
   expect(c.transport).toEqual([0,0]);
  }
 });
 it('adds the optional mountain increment without duplicating a full lunch', () => {
  const base = tripCosts('budget', 3), extra = tripCosts('budget', 3, true);
  expect(extra.total[0] - base.total[0]).toBeCloseTo(160);
  expect(extra.total[1] - base.total[1]).toBeCloseTo(220);
 });
});


describe('saving countdown', () => {
 it('counts calendar days to 19 March 2027 in London time', () => {
  expect(daysToSave(new Date('2026-11-07T14:00:00Z'))).toBe(132);
  expect(daysToSave(new Date('2027-03-18T23:59:59Z'))).toBe(1);
  expect(daysToSave(new Date('2027-03-19T00:00:00Z'))).toBe(0);
 });
 it('uses the London calendar across DST and never becomes negative', () => {
  expect(daysToSave(new Date('2026-10-24T23:30:00Z'))).toBe(145);
  expect(daysToSave(new Date('2027-03-22T10:00:00Z'))).toBe(0);
 });
});


describe('daily savings targets', () => {
 it('rounds upwards and distinguishes couple and per-person hotel targets', () => {
  expect(dailySaving(IBIS_RATES[2], 132)).toBe(1.20);
  expect(dailySaving(IBIS_RATES[3], 132)).toBe(1.72);
  expect(dailySaving(IBIS_RATES[3], 132, 2)).toBe(0.86);
  expect(dailySaving(IBIS_RATES[3], 1)).toBe(226.53);
 });
 it('updates as the date approaches and avoids dividing by zero', () => {
  expect(dailySaving(IBIS_RATES[3], 100)).toBe(2.27);
  expect(dailySaving(IBIS_RATES[3], 0)).toBeNull();
  expect(dailySaving(IBIS_RATES[3], -1)).toBeNull();
 });
});

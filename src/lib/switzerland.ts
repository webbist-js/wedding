export type Stay = 2 | 3;
export type HotelStyle = 'budget' | 'bougy';
export type CostRange = [number, number];
export const HOTEL_RATES = { 2: 371.38, 3: 553.65 } as const;
export const FLIGHT_GIFT = 180;
export const DAY_TRIP = 180;
export const IBIS_RATES = { 2: 157.18, 3: 226.53 } as const;
export const ibisLink = (nights: Stay) => `https://all.accor.com/booking/en/accor/hotel/5653?dateIn=2027-03-19&nights=${nights}&compositions=2&currencyCode=GBP`;
export const CHECKED = '7 November 2026';
export const accorLink = (nights: Stay) => `https://all.accor.com/booking/en/accor/hotel/1322?dateIn=2027-03-19&nights=${nights}&compositions=2&currencyCode=GBP`;
export const foodRows = [
 { label: 'Friday dinner', detail: 'One relaxed meal after arrival', low: 40, high: 60 },
 { label: 'Saturday breakfast, lunch & dinner', detail: 'Bakery breakfast, picnic or simple lunch, casual dinner', low: 76, high: 108 },
 { label: 'Sunday breakfast, lunch & dinner', detail: 'Includes an evening meal, even if you fly home', low: 76, high: 108 },
 { label: 'Monday breakfast & lunch', detail: 'For the three-night stay; evening flights may need another meal', low: 28, high: 44 }
];
export function tripCosts(style: HotelStyle, nights: Stay, mountain = false) {
 const meals = foodRows.slice(0, nights === 3 ? 4 : 3);
 const food: CostRange = [meals.reduce((n, r) => n + r.low, 0), meals.reduce((n, r) => n + r.high, 0)];
 const room = style === 'bougy' ? HOTEL_RATES[nights] : IBIS_RATES[nights];
 const transport: CostRange = [0, 0];
 const taxes: CostRange = [0, 0];
 const activities: CostRange = [0, 40];
 // Extra lift + meal allowance replaces the picnic allowance already in food.
 // This is a planning allowance, not a supplier quote or confirmed itinerary.
 const mountainExtra: CostRange = mountain ? [160, 220] : [0, 0];
 const total: CostRange = [0, 1].map(i => room + food[i] + transport[i] + taxes[i] + activities[i] + mountainExtra[i]) as CostRange;
 return { room, food, transport, taxes, activities, mountainExtra, total, separateDayTrip: DAY_TRIP };
}
export const pounds = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
export const range = (r: CostRange) => `${pounds(Math.ceil(r[0]))}–${pounds(Math.ceil(r[1]))}`;

// Calendar days in the organisers' timezone, independent of the viewer's zone
// and daylight-saving changes. The departure day itself is zero.
export function daysToSave(now = new Date()): number {
 const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
 }).formatToParts(now);
 const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
 const today = Date.UTC(part('year'), part('month') - 1, part('day'));
 return Math.max(0, Math.round((Date.UTC(2027, 2, 19) - today) / 86_400_000));
}

// Round up to whole pennies so following the daily target covers the cost.
export function dailySaving(amount: number, days: number, people = 1): number | null {
 if (days <= 0 || people <= 0) return null;
 return Math.ceil(amount * 100 / days / people) / 100;
}

export interface QuoteLineCalc {
  scope: 'day' | 'eve' | 'fixed' | 'custom';
  // Per-head meal dimension — only meaningful on 'day' lines: 'veg' lines
  // multiply by the veg headcount, 'nonveg' by (day − veg).
  meal?: 'any' | 'veg' | 'nonveg';
  price: number;
  qty: number | null;
  bond: boolean;
}
export interface QuoteInputs {
  day: number;
  eve: number;
  min: number;
  veg: number;
}
export interface QuoteResult {
  spend: number;
  bond: number;
  topup: number;
  grand: number;
}

export function lineQty(line: QuoteLineCalc, i: QuoteInputs): number {
  if (line.scope === 'day') {
    if (line.meal === 'veg') return i.veg;
    if (line.meal === 'nonveg') return Math.max(0, i.day - i.veg);
    return i.day;
  }
  if (line.scope === 'eve') return i.eve;
  if (line.scope === 'fixed') return 1;
  return line.qty ?? 0;
}

export function computeQuote(lines: QuoteLineCalc[], i: QuoteInputs): QuoteResult {
  let spend = 0,
    bond = 0;
  for (const line of lines) {
    const total = lineQty(line, i) * line.price;
    if (line.bond) bond += total;
    else spend += total;
  }
  const topup = Math.max(0, i.min - spend);
  return { spend, bond, topup, grand: spend + topup + bond };
}

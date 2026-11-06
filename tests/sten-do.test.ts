import { describe, it, expect } from 'vitest';
import { planClaim, type BallotRow } from '../src/lib/server/sten-do';
import { cleanName, nameKey } from '../src/lib/sten-do';

const row = (id: number, voterId: string, name: string | null, picks = '{}', t = id): BallotRow => ({
	id,
	voterId,
	name,
	picks,
	updatedAt: new Date(t * 1000)
});

describe('name helpers', () => {
	it('cleans and keys names so spacing and case do not split a contestant', () => {
		expect(cleanName('  Greg   Smith ')).toBe('Greg Smith');
		expect(cleanName(42)).toBe('');
		expect(nameKey(' GREG ')).toBe(nameKey('greg'));
	});
});

describe('planClaim', () => {
	it('inserts a new ballot for a new name on a new browser', () => {
		expect(planClaim([row(1, 'a', 'Greg')], 'z', 'Sam')).toEqual({ kind: 'insert' });
	});

	it('keeps the ballot this browser already holds under that name', () => {
		const rows = [row(1, 'a', 'Greg')];
		expect(planClaim(rows, 'a', ' greg ')).toEqual({ kind: 'keep', target: rows[0] });
	});

	it('claims an existing name from another browser instead of duplicating it', () => {
		const rows = [row(1, 'a', 'Greg', '{"richmond":3}')];
		expect(planClaim(rows, 'z', 'GREG')).toEqual({ kind: 'claim', target: rows[0], release: null });
	});

	it("releases this browser's own ballot when claiming someone else's, flagging if it is empty", () => {
		const rows = [row(1, 'a', 'Greg', '{"richmond":3}'), row(2, 'b', 'Sam', '{}'), row(3, 'c', 'Jo', '{"waterloo":1}')];
		expect(planClaim(rows, 'b', 'greg')).toEqual({
			kind: 'claim',
			target: rows[0],
			release: { row: rows[1], empty: true }
		});
		expect(planClaim(rows, 'c', 'greg')).toMatchObject({ release: { row: rows[2], empty: false } });
	});

	it('treats a brand-new name on a browser that already voted as a rename', () => {
		const rows = [row(1, 'a', 'Gregg', '{"richmond":3}')];
		expect(planClaim(rows, 'a', 'Greg')).toEqual({ kind: 'rename', target: rows[0] });
	});

	it('picks the most recently updated ballot when old duplicates exist', () => {
		const rows = [row(1, 'a', 'Greg', '{}', 10), row(2, 'b', 'greg', '{}', 20)];
		expect(planClaim(rows, 'z', 'Greg')).toMatchObject({ kind: 'claim', target: rows[1] });
	});
});

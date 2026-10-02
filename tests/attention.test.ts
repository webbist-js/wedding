import { describe, it, expect } from 'vitest';
import { budgetAttention, type AttentionLine } from '../src/lib/attention';

const sup = (over: Partial<AttentionLine['suppliers'][number]>) => ({
	id: 1,
	name: 'Someone',
	category: 'Thing',
	stage: 'Lead',
	quotedAmount: null,
	depositPaid: false,
	...over
});
const line = (over: Partial<AttentionLine>): AttentionLine => ({
	id: 10,
	category: 'Photography',
	budgeted: 1000,
	confirmed: 0,
	suppliers: [],
	...over
});

describe('budgetAttention', () => {
	it('flags a committed supplier with no quote', () => {
		const items = budgetAttention([line({ suppliers: [sup({ stage: 'Booked' })] })], []);
		expect(items).toEqual([
			{
				kind: 'no-quote',
				label: 'Photography — Someone is booked but has no quote',
				href: '/dashboard/budget#line-10'
			}
		]);
	});
	it('does not flag an uncommitted supplier with no quote', () => {
		expect(budgetAttention([line({ suppliers: [sup({})] })], [])).toEqual([]);
	});
	it('flags a line whose confirmed cost beats its earmark', () => {
		const items = budgetAttention([line({ budgeted: 134, confirmed: 650, category: 'Ceremony' })], []);
		expect(items[0]).toMatchObject({ kind: 'over-budget', href: '/dashboard/budget#line-10' });
		expect(items[0].label).toContain('£516');
	});
	it('ignores over-budget when nothing is earmarked', () => {
		expect(budgetAttention([line({ budgeted: 0, confirmed: 650 })], [])).toEqual([]);
	});
	it('flags deposit paid but stage not Booked', () => {
		const items = budgetAttention([line({ suppliers: [sup({ depositPaid: true, stage: 'Shortlisted', quotedAmount: 100 })] })], []);
		expect(items).toEqual([
			{
				kind: 'stage-mismatch',
				label: 'Someone has a deposit paid but is still Shortlisted',
				href: '/dashboard/budget#line-10'
			}
		]);
	});
	it('lists unassigned suppliers last', () => {
		const items = budgetAttention(
			[line({ budgeted: 10, confirmed: 20 })],
			[sup({ id: 7, name: null, category: 'Stationery' })]
		);
		expect(items.map((i) => i.kind)).toEqual(['over-budget', 'unassigned']);
		expect(items[1]).toEqual({
			kind: 'unassigned',
			label: 'Stationery is not filed under any budget line',
			href: '/dashboard/suppliers#supplier-7'
		});
	});
	it('orders no-quote, over-budget, stage-mismatch, unassigned', () => {
		const items = budgetAttention(
			[
				line({ id: 1, suppliers: [sup({ id: 1, depositPaid: true, stage: 'Lead', quotedAmount: 5 })] }),
				line({ id: 2, budgeted: 1, confirmed: 2 }),
				line({ id: 3, suppliers: [sup({ id: 3, stage: 'Booked' })] })
			],
			[sup({ id: 9 })]
		);
		expect(items.map((i) => i.kind)).toEqual(['no-quote', 'over-budget', 'stage-mismatch', 'unassigned']);
	});
});

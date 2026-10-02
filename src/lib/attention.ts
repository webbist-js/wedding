// Pure "needs attention" rules for the Budget page. Each rule inspects the
// rolled-up lines (plus suppliers filed under no line) and returns a short,
// linkable finding. No DB access — tested in tests/attention.test.ts.
import { gbp, isCommitted } from './money';

export interface AttentionSupplier {
	id: number;
	name: string | null;
	category: string;
	stage: string;
	quotedAmount: number | null;
	depositPaid: boolean;
}

export interface AttentionLine {
	id: number;
	category: string;
	budgeted: number;
	confirmed: number;
	suppliers: AttentionSupplier[];
}

export type AttentionKind = 'no-quote' | 'over-budget' | 'stage-mismatch' | 'unassigned';

export interface AttentionItem {
	kind: AttentionKind;
	label: string;
	href: string;
}

const who = (s: AttentionSupplier) => s.name || s.category;

export function budgetAttention(
	lines: AttentionLine[],
	unassigned: AttentionSupplier[]
): AttentionItem[] {
	const noQuote: AttentionItem[] = [];
	const over: AttentionItem[] = [];
	const mismatch: AttentionItem[] = [];

	for (const l of lines) {
		const href = `/dashboard/budget#line-${l.id}`;
		for (const s of l.suppliers) {
			if (isCommitted(s) && s.quotedAmount == null) {
				noQuote.push({
					kind: 'no-quote',
					label: `${l.category} — ${who(s)} is booked but has no quote`,
					href
				});
			}
			if (s.depositPaid && s.stage !== 'Booked') {
				mismatch.push({
					kind: 'stage-mismatch',
					label: `${who(s)} has a deposit paid but is still ${s.stage}`,
					href
				});
			}
		}
		if (l.budgeted > 0 && l.confirmed > l.budgeted) {
			over.push({
				kind: 'over-budget',
				label: `${l.category} is ${gbp(l.confirmed - l.budgeted)} over its ${gbp(l.budgeted)} earmark`,
				href
			});
		}
	}

	const orphans: AttentionItem[] = unassigned.map((s) => ({
		kind: 'unassigned',
		label: `${who(s)} is not filed under any budget line`,
		href: `/dashboard/suppliers#supplier-${s.id}`
	}));

	return [...noQuote, ...over, ...mismatch, ...orphans];
}

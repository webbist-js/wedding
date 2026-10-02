<script lang="ts">
	// "Every penny": the list of individual payments attached to a supplier or
	// directly to a budget line, with add/remove. Figures elsewhere are sums
	// over these rows.
	import { invalidateAll } from '$app/navigation';
	import { gbp } from '$lib/money';

	export interface PaymentRow {
		id: number;
		amount: number;
		paidOn: string | null;
		note: string | null;
	}

	let {
		payments,
		attach,
		disabled = false,
		title = 'Payments'
	}: {
		payments: PaymentRow[];
		attach: { vendorId: number } | { budgetLineId: number };
		disabled?: boolean;
		title?: string;
	} = $props();

	const total = $derived(payments.reduce((a, p) => a + p.amount, 0));
	const fmt = (d: string) =>
		new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

	async function post(body: Record<string, unknown>) {
		await fetch('/dashboard/budget/payments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		await invalidateAll();
	}
	async function add(form: HTMLFormElement) {
		const f = new FormData(form);
		const amount = Number(f.get('amount'));
		if (!amount) return;
		await post({
			op: 'add',
			amount,
			paidOn: String(f.get('paidOn') ?? '') || null,
			note: String(f.get('note') ?? '') || null,
			...attach
		});
		form.reset();
	}
</script>

<div class="ledger">
	<span class="title">
		{title}{#if payments.length}&nbsp;· <b>{gbp(total)}</b> paid{/if}
	</span>
	{#each payments as p (p.id)}
		<span class="item">
			{gbp(p.amount)}{p.paidOn ? ` · ${fmt(p.paidOn)}` : ''}{p.note ? ` · ${p.note}` : ''}
			{#if !disabled}
				<button class="rm" type="button" title="Remove payment" onclick={() => post({ op: 'remove', id: p.id })}>×</button>
			{/if}
		</span>
	{:else}
		<span class="empty">No payments yet</span>
	{/each}
	{#if !disabled}
		<form class="add" onsubmit={(e) => { e.preventDefault(); add(e.currentTarget); }}>
			<input name="amount" type="number" step="0.01" min="0.01" placeholder="£" required aria-label="Amount" />
			<input name="paidOn" type="date" aria-label="Paid on" />
			<input name="note" placeholder="What for?" aria-label="Note" />
			<button>+ Payment</button>
		</form>
	{/if}
</div>

<style>
	.ledger {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.title b {
		color: var(--sage-deep);
	}
	.item {
		font-size: 12.5px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 4px 8px;
		color: var(--body);
		font-variant-numeric: tabular-nums;
	}
	.empty {
		font-size: 12px;
		color: var(--faint);
		font-style: italic;
	}
	.rm {
		border: 0;
		background: none;
		color: var(--terra);
		cursor: pointer;
		font-size: 13px;
		padding: 0 0 0 4px;
	}
	.add {
		display: flex;
		gap: 6px;
		margin-left: auto;
		flex-wrap: wrap;
	}
	.add input {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 5px 7px;
		font: inherit;
		font-size: 12.5px;
		background: #fff;
	}
	.add input[name='amount'] {
		width: 80px;
	}
	.add input[name='note'] {
		width: 130px;
	}
	.add button {
		border: 0;
		border-radius: 6px;
		background: var(--sage);
		color: #fff;
		font-size: 12.5px;
		font-weight: 600;
		padding: 5px 10px;
		cursor: pointer;
	}
	.add button:hover {
		background: var(--sage-deep);
	}
</style>

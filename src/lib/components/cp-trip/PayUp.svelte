<script lang="ts">
	// Pay Up, You Lovely Lot. Uses the current fixed budget. Payments are added by the organiser and never edited.
	import Money from './Money.svelte';
	import {
		BOOKING, BANK, GROUPS, group, gbp, poundsToPence, daysUntil, pastDeadline,
		CURRENT_BUDGET, type Ledger, type GroupId
	} from '$lib/cp-trip';

	type Props = {
		ledger: Ledger;
		paymentDetails: string;
		organiser: boolean;
		now: number;
		act: (body: Record<string, unknown>) => Promise<string | null>;
	};
	let { ledger, paymentDetails, organiser, now, act }: Props = $props();

	const daysLeft = $derived(daysUntil(BOOKING.deadline, now));
	const late = $derived(pastDeadline(now));
	const pct = $derived(ledger.owed ? Math.min(100, Math.round((ledger.collected / ledger.owed) * 100)) : 0);
	const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

	const statusLabel = (s: string, overdue: boolean) =>
		overdue ? (s === 'partial' ? 'Partly paid · overdue' : 'Overdue') : s === 'not-paid' ? 'Not paid yet' : s === 'partial' ? 'Partly paid' : s === 'paid' ? 'Paid ✓' : 'Paid ✓ · refund due';

	// ---- organiser tools ----
	let pg = $state<GroupId>('kie-elisa');
	let pAmount = $state('');
	let pDate = $state(new Date().toISOString().slice(0, 10));
	let pNote = $state('');
	let pRefund = $state(false);
	let pErr = $state('');
	let details = $state('');
	let editingDetails = $state(false);
	let busy = $state(false);

	async function addPayment(e: SubmitEvent) {
		e.preventDefault();
		const p = poundsToPence(pAmount);
		if (!p) { pErr = 'Enter an amount like 256 or 178.50.'; return; }
		busy = true;
		pErr = (await act({ action: 'payment', group: pg, pence: pRefund ? -p : p, receivedOn: pDate, note: pNote })) ?? '';
		busy = false;
		if (!pErr) { pAmount = ''; pNote = ''; pRefund = false; }
	}
	let copied = $state('');
	async function copy(label: string, text: string) {
		try { await navigator.clipboard.writeText(text); copied = label; setTimeout(() => (copied = ''), 1600); } catch { /* select it by hand */ }
	}
	// e.g. "CHRIS HAYLEY WINFEL".
	const paymentRef = '[YOUR NAMES] WINFEL';

	async function saveDetails() {
		busy = true;
		const e = await act({ action: 'note', key: 'payment', body: details });
		busy = false;
		if (!e) editingDetails = false;
	}
</script>

<section class="pay wrap" id="pay" aria-labelledby="pay-title">
	<p class="eyebrow">THE MONEY BIT</p>
	<h2 id="pay-title">Pay up, you <span>lovely lot.</span></h2>
	<p class="section-intro">You’ve got until 8 January 2027 to send me your share, so absolutely no rush. The booking’s sorted — just get it over to me before then!</p>

	<div class="top">
		<div class="deadline" class:late>
			<p class="eyebrow">PAY BY</p>
			<b>Fri 8 Jan 2027</b>
			<span>{late ? 'The deadline has passed. Anything still owed is still owed.' : daysLeft === 0 ? 'Today’s the day!' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go`}</span>
		</div>
		<div class="pot">
			<div class="pot-nums">
				<div><span>Collected</span><b><Money pence={ledger.collected} /></b></div>
				<div><span>Still to come in</span><b><Money pence={ledger.outstanding} /></b></div>
				<div><span>Whole trip budget</span><b>{gbp(ledger.owed)}</b></div>
			</div>
			<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-label="Share of the trip budget funded"><i style:transform={`scaleX(${pct / 100})`}></i></div>
			<p class="fine">{pct}% in, counting Alex & Katie’s share (they paid Center Parcs up front). Only Alex can mark money as received.{#if ledger.refunds} {gbp(ledger.refunds)} to hand back after an agreed change.{/if}</p>
		</div>
	</div>

	<p class="basis">£178 per adult; Theo is free. Gifts are already deducted from each group’s share. Payments received are deducted from the balances below.</p>

	<ul class="accounts">
		<li class="how" aria-labelledby="how-title">
			<p class="h">Bank transfer to Alex</p>
			<h3 id="how-title">How to pay</h3>
			<dl class="bank">
				<div><dt>Sort code</dt><dd>{BANK.sortCode}</dd><button type="button" class="copy" onclick={() => copy('sort', BANK.sortCode.replace(/-/g, ''))}>{copied === 'sort' ? 'Copied ✓' : 'Copy'}</button></div>
				<div><dt>Account</dt><dd>{BANK.account}</dd><button type="button" class="copy" onclick={() => copy('acc', BANK.account)}>{copied === 'acc' ? 'Copied ✓' : 'Copy'}</button></div>
				<div><dt>Reference</dt><dd>{paymentRef}</dd></div>
			</dl>
			{#if paymentDetails}<p class="details">{paymentDetails}</p>{/if}
			{#if organiser}
				{#if editingDetails}
					<label class="lbl" for="pay-details">Extra payment notes (shown to everyone with the link)</label>
					<textarea id="pay-details" rows="3" maxlength="2000" bind:value={details}></textarea>
					<div class="row"><button class="btn primary" type="button" disabled={busy} onclick={saveDetails}>Save</button><button class="btn" type="button" onclick={() => (editingDetails = false)}>Cancel</button></div>
				{:else}
					<button class="text-btn" type="button" onclick={() => { details = paymentDetails; editingDetails = true; }}>{paymentDetails ? 'Edit extra notes' : 'Add extra notes'}</button>
				{/if}
			{/if}
		</li>
		{#each ledger.accounts as a (a.group)}
			{@const g = group(a.group)}
			{@const budgetLine = CURRENT_BUDGET.lines.find((l) => l.group === a.group)!}
			<li class="acct {a.status}" class:overdue={a.overdue}>
				<div class="acct-top">
					<div><p class="h">House {g.house.slice(1)}</p><h3>{g.label}</h3></div>
					<span class="chip">{statusLabel(a.status, a.overdue)}</span>
				</div>
				<p class="owed"><Money pence={a.owed} /><small>group share</small></p>
				{#if budgetLine.giftReceived}<p class="fine">{gbp(budgetLine.accommodation)} real share − {gbp(budgetLine.giftReceived)} gift from Alex & Katie = {gbp(budgetLine.total)} to pay, before any payments already received.</p>{/if}
				{#if a.upfront}
					<p class="upfront">Paid the whole booking to Center Parcs up front. Everyone else pays them back.</p>
				{:else}
					<dl>
						<div><dt>Paid</dt><dd>{gbp(a.paid)}</dd></div>
						<div><dt>{a.refundDue ? 'Refund due' : 'Left to pay'}</dt><dd>{gbp(a.refundDue || a.outstanding)}</dd></div>
					</dl>
				{/if}
				{#if a.history.length > 1}
					<ul class="hist">
						{#each a.history.slice(1) as h, i}<li>Changed {gbp(a.history[i].owed)} → {gbp(h.owed)} on {fmtDate(h.at)} ({h.version === -1 ? '£178-per-adult budget' : `agreed split no. ${h.version}`})</li>{/each}
					</ul>
				{/if}
				{#if a.payments.length}
					<ul class="txns" aria-label={`Payments from ${g.label}`}>
						{#each a.payments as p (p.id)}<li><span>{fmtDate(p.receivedOn)}{p.note ? ` · ${p.note}` : ''}</span><b>{p.pence < 0 ? `refund ${gbp(-p.pence)}` : gbp(p.pence)}</b></li>{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>

	{#if organiser}
		<form class="org" onsubmit={addPayment}>
			<p class="eyebrow">ORGANISER · RECORD MONEY RECEIVED</p>
			<div class="fields">
				<label>Who<select bind:value={pg}>{#each GROUPS as g}<option value={g.id}>{g.label}</option>{/each}</select></label>
				<label>Amount (£)<input inputmode="decimal" placeholder="550.00" bind:value={pAmount} required /></label>
				<label>Received<input type="date" bind:value={pDate} required /></label>
				<label>Note<input maxlength="200" placeholder="Bank transfer" bind:value={pNote} /></label>
			</div>
			<label class="tick"><input type="checkbox" bind:checked={pRefund} /> This is a refund or correction (money going back)</label>
			<button class="btn primary" type="submit" disabled={busy}>Record</button>
			{#if pErr}<p class="bad" role="alert">{pErr}</p>{/if}
			<p class="fine">Entries can’t be edited or deleted, so the history stays honest. To fix a mistake, record a correction.</p>
		</form>
	{/if}
</section>

<style>
	.pay { padding-block: 72px; scroll-margin-top: 10px; }
	.top { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 16px; margin-top: 26px; }
	.deadline { background: radial-gradient(ellipse 60% 120% at 100% 0%, #d8a84933, transparent 70%), var(--ember); color: #fff; padding: 24px; border-radius: 8px; display: grid; gap: 6px; align-content: start; box-shadow: 0 18px 40px #8e1b3026; }
	.deadline .eyebrow { color: #f3d58f; }
	.deadline b { font: 800 44px/1.05 var(--f-display); }
	.deadline span { font-weight: 700; }
	.deadline.late { background: #6e1322; }
	.pot { border: 1px solid var(--line); border-radius: 8px; background: var(--paper-2); padding: 22px; }
	.pot-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
	.pot-nums div { display: grid; }
	.pot-nums span { font: 600 10px var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: var(--gold-ink); }
	.pot-nums b { font: 800 30px/1.15 var(--f-display); font-variant-numeric: lining-nums; }
	.bar { height: 8px; border-radius: 999px; background: var(--line); margin-top: 16px; overflow: hidden; }
	.bar i { display: block; height: 100%; background: var(--moss); transform-origin: left; transition: transform 400ms var(--ease); }
	.basis { margin-top: 16px; font-size: 13px; font-weight: 700; color: var(--moss); }
	.accounts { list-style: none; padding: 0; margin: 18px 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; } /* 7 groups + how to pay = 8 */
	.acct { background: var(--paper-2); border: 1px solid var(--line); border-top: 3px solid var(--line); border-radius: 6px; padding: 18px; display: grid; gap: 10px; align-content: start; }
	.acct.partial { border-top-color: var(--sun); }
	.acct.paid, .acct.overpaid { border-top-color: var(--moss); }
	.acct.overdue { border-top-color: var(--ember); }
	.acct-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
	.h { font: 600 10px var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: var(--gold-ink); }
	.acct h3 { font: 800 20px/1.2 var(--f-display); }
	.chip { font-size: 11px; font-weight: 800; padding: 4px 10px; border: 1px solid currentColor; border-radius: 999px; white-space: nowrap; color: var(--muted); }
	.paid .chip, .overpaid .chip { color: var(--moss); }
	.partial .chip { color: var(--gold-ink); }
	.overdue .chip { color: var(--ember); }
	.owed { display: flex; align-items: baseline; gap: 8px; }
	.owed :global(.money) { font: 800 40px/1 var(--f-display); font-variant-numeric: lining-nums; }
	.owed small { font-size: 12px; color: var(--muted); }
	dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; border-top: 1px dotted var(--line); padding-top: 8px; }
	dt { font-size: 11px; color: var(--muted); }
	dd { margin: 0; font-weight: 800; }
	.hist, .txns { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; font-size: 12px; }
	.hist li { border-left: 2px solid var(--sun); padding-left: 8px; }
	.txns li { display: flex; justify-content: space-between; gap: 8px; border-top: 1px dotted var(--line); padding-top: 4px; }
	.how { padding: 20px; background: radial-gradient(ellipse 70% 60% at 100% 0%, #d8a84926, transparent 70%), var(--pine); color: var(--paper); border-radius: 6px; display: grid; gap: 10px; align-content: start; box-shadow: 0 18px 40px #4a0e1f33; }
	.how .h { color: var(--sun); }
	.how h3 { font: italic 800 28px/1.05 var(--f-display); }
	.bank { grid-template-columns: 1fr; gap: 6px; border-top-color: #ffffff40; }
	.bank div { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 8px; }
	.bank dt { color: #d9c9b0; grid-column: 1; font: 600 10px var(--f-label); letter-spacing: .18em; text-transform: uppercase; }
	.bank dd { grid-column: 1; font: 800 26px/1.15 var(--f-display); letter-spacing: .03em; font-variant-numeric: lining-nums tabular-nums; }
	.bank div:last-child dd { font-size: 18px; color: var(--sun); }
	.copy { grid-column: 2; grid-row: 1 / span 2; min-height: 40px; padding: 6px 14px; border: 1px solid #d8a84999; border-radius: 999px; background: transparent; color: var(--paper); font-weight: 800; font-size: 12px; }
	.copy:hover { background: #d8a8491f; }
	.how .text-btn { color: var(--paper); }
	.how .lbl { color: var(--paper); }
	.details { white-space: pre-line; font-size: 13px; font-weight: 600; color: #d9c9b0; }
	.upfront { font-size: 13px; font-weight: 700; color: var(--moss); border-top: 1px dotted var(--line); padding-top: 8px; }
	.lbl { font-size: 13px; font-weight: 800; }
	textarea, select, .fields input { width: 100%; border: 1px solid var(--line); background: var(--paper); padding: 10px 12px; border-radius: 6px; min-height: 44px; font: inherit; }
	.row { display: flex; gap: 10px; flex-wrap: wrap; }
	.org { margin-top: 18px; padding: 22px; border-radius: 8px; background: var(--ink); color: var(--paper); display: grid; gap: 12px; }
	.org .eyebrow { color: var(--sun); }
	.fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
	.fields label { display: grid; gap: 4px; font-size: 12px; font-weight: 800; }
	.fields input, .fields select { color: var(--ink); }
	.tick { display: flex; gap: 8px; align-items: center; font-size: 13px; }
	.org .fine { color: #d9c9b0; }
	.bad { color: #ffb4a0; font-weight: 700; font-size: 13px; }
	@media (max-width: 1000px) { .accounts { grid-template-columns: 1fr 1fr; } }
	@media (max-width: 560px) { .accounts { grid-template-columns: 1fr; } }
	@media (max-width: 760px) {
		.pay { padding-block: 52px; }
		.top { grid-template-columns: 1fr; }
		.pot-nums { grid-template-columns: 1fr 1fr; }
		.pot-nums div:last-child { grid-column: 1 / -1; }
		.fields { grid-template-columns: 1fr 1fr; }
	}
</style>

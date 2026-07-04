<script lang="ts">
	import Pill from '$lib/components/Pill.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { gbp } from '$lib/money';
	let { data } = $props();

	let earmark = $derived(data.totals.budgeted);
	let confirmed = $derived(data.totals.confirmed);
	let paid = $derived(data.totals.paid);
	let remaining = $derived(data.target - confirmed);
	let overBudget = $derived(remaining < 0);

	async function saveField(id: number, field: string, value: string | number | null) {
		await fetch('/dashboard/budget/line', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, field, value })
		});
	}

	// ---- Payments ledger (expander under a row's Paid cell) ----
	let openPayments = $state<number | null>(null);
	async function addPayment(line: (typeof data.lines)[number], form: HTMLFormElement) {
		const f = new FormData(form);
		const amount = Number(f.get('amount'));
		if (!amount) return;
		await fetch('/dashboard/budget/payments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				op: 'add',
				amount,
				paidOn: String(f.get('paidOn') ?? '') || null,
				note: String(f.get('note') ?? '') || null,
				...(line.link?.type === 'vendor' ? { vendorId: line.link.vendorId } : { budgetLineId: line.id })
			})
		});
		form.reset();
		await invalidateAll();
	}
	async function removePayment(id: number) {
		await fetch('/dashboard/budget/payments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ op: 'remove', id })
		});
		await invalidateAll();
	}
	async function linkVendor(id: number, vendorId: string) {
		await saveField(id, 'vendorId', vendorId || null);
		await invalidateAll();
	}
	const fmtDate = (d: string) =>
		new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	const statusOptions = ['Estimate', 'To book', 'Booked', 'Deposit', 'Paid', 'Optional'];

	// ---- Drag & drop reordering (within a section) ----
	let dragId = $state<number | null>(null);
	let dragOverId = $state<number | null>(null);
	function onDragStart(e: DragEvent, id: number) {
		if (!e.dataTransfer) return;
		dragId = id;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(id));
	}
	function onDragOver(e: DragEvent, id: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverId = id;
	}
	function onDragLeave() {
		dragOverId = null;
	}
	async function onDrop(e: DragEvent, targetId: number) {
		e.preventDefault();
		dragOverId = null;
		const source = dragId;
		dragId = null;
		if (!source || source === targetId || source < 0 || targetId < 0) return;
		const ids = data.lines.map((l) => l.id).filter((id) => id > 0);
		const fromIdx = ids.indexOf(source);
		const toIdx = ids.indexOf(targetId);
		if (fromIdx < 0 || toIdx < 0) return;
		const [moved] = ids.splice(fromIdx, 1);
		ids.splice(toIdx, 0, moved);
		await fetch('/dashboard/budget/reorder', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		await invalidateAll();
	}
</script>


<div class="stats">
	<form method="POST" action="?/setTarget" use:enhance class="stat stat-edit">
		<div class="v">
			<span class="prefix">£</span>
			<input
				name="target"
				type="text"
				inputmode="numeric"
				value={data.target.toLocaleString('en-GB')}
				onchange={(e) => {
					const raw = e.currentTarget.value.replace(/[^\d]/g, '');
					const n = Number(raw) || 0;
					e.currentTarget.value = n.toLocaleString('en-GB');
					(e.currentTarget.form as HTMLFormElement).requestSubmit();
				}}
			/>
		</div>
		<div class="l">Target</div>
	</form>
	<div class="stat"><div class="v">{gbp(earmark)}</div><div class="l">Total earmarked</div></div>
	<div class="stat"><div class="v">{gbp(confirmed)}</div><div class="l">Confirmed costs</div></div>
	<div class="stat"><div class="v accent">{gbp(paid)}</div><div class="l">Paid to date</div></div>
	<div class="stat">
		<div class="v" class:warning={overBudget}>
			{overBudget ? '−' : ''}{gbp(Math.abs(remaining))}
		</div>
		<div class="l">{overBudget ? 'Over budget' : 'Remaining'}</div>
	</div>
</div>


{#each data.sections as section}
	{@const sectionLines = data.lines.filter((l) => l.section === section)}
	{@const secBudgeted = sectionLines.reduce((a, l) => a + l.budgeted, 0)}
	{@const secConfirmed = sectionLines.reduce((a, l) => a + l.confirmed, 0)}
	{@const secPaid = sectionLines.reduce((a, l) => a + l.paid, 0)}
	<section class="bsection">
		<h3 class="ktitle">
			<span>{section}</span>
			<span class="kcount">{sectionLines.length} {sectionLines.length === 1 ? 'line' : 'lines'}</span>
			<span class="ktotals">
				<span>{gbp(secBudgeted)}</span>
				<span class="sep">·</span>
				<span class="confirmed">{gbp(secConfirmed)} confirmed</span>
				{#if secPaid > 0}
					<span class="sep">·</span>
					<span class="paid">{gbp(secPaid)} paid</span>
				{/if}
			</span>
		</h3>
		<div class="card">
			<div class="row head">
				<span></span>
				<span>Category</span>
				<span class="r">Budgeted £</span>
				<span class="r">Confirmed £</span>
				<span class="r">Paid £</span>
				<span>Status</span>
				<span>Section</span>
				<span></span>
			</div>

			{#each sectionLines as line (line.id)}
				<div
					class="row"
					class:venue={line.id < 0}
					class:drop-over={dragOverId === line.id}
					draggable={line.id > 0}
					ondragstart={(e) => onDragStart(e, line.id)}
					ondragover={(e) => onDragOver(e, line.id)}
					ondragleave={onDragLeave}
					ondrop={(e) => onDrop(e, line.id)}
				>
					<span class="grip" aria-hidden="true">{line.id < 0 ? '' : '≡'}</span>
					{#if line.link?.type === 'shopping'}
						<span class="cat venue-cat">{line.category} <Pill tone="green">Synced</Pill></span>
						<span class="readonly num">{gbp(line.budgeted)}</span>
						<span class="readonly num">{gbp(line.confirmed)}</span>
						<span class="readonly num">{gbp(line.paid)}</span>
						<span class="locked">Shopping</span>
						<span class="locked">Everything else</span>
						<a class="shop-link" href="/dashboard/shopping" title="Edit shopping list">Edit →</a>
					{:else}
						<span class="catwrap">
							<input
								class="cat"
								value={line.category}
								onchange={(e) => saveField(line.id, 'category', e.currentTarget.value)}
							/>
							{#if line.link?.type === 'venue'}
								<a class="src-chip" href="/dashboard/venue" title="Figures come from the venue quote">from Venue ↗</a>
							{:else if line.link?.type === 'vendor'}
								<a class="src-chip" href="/dashboard/vendors" title="Figures come from this vendor">⭲ {line.link.vendorName}</a>
							{/if}
							{#if line.link?.type !== 'venue'}
								<select
									class="linksel"
									title="Link this line to a vendor"
									value={line.link?.type === 'vendor' ? String(line.link.vendorId) : ''}
									onchange={(e) => linkVendor(line.id, e.currentTarget.value)}
								>
									<option value="">— manual —</option>
									{#each data.vendorOptions as v}
										<option value={String(v.id)}>{v.label}</option>
									{/each}
								</select>
							{/if}
						</span>
						<input
							class="num"
							type="number"
							value={line.budgeted}
							onchange={(e) => saveField(line.id, 'budgeted', e.currentTarget.value)}
						/>
						{#if line.editable}
							<input
								class="num"
								type="number"
								value={line.confirmed}
								onchange={(e) => saveField(line.id, 'confirmed', e.currentTarget.value)}
							/>
						{:else}
							<span class="readonly num" title="Derived from the linked source">{gbp(line.confirmed)}</span>
						{/if}
						<button
							class="paybtn num"
							title="Payments"
							onclick={() => (openPayments = openPayments === line.id ? null : line.id)}
						>
							{gbp(line.paid)} <span class="caret">{openPayments === line.id ? '▴' : '▾'}</span>
						</button>
						{#if line.editable}
							<select
								onchange={(e) => saveField(line.id, 'status', e.currentTarget.value)}
								value={line.status}
							>
								{#each statusOptions as opt}
									<option value={opt} selected={opt === line.status}>{opt}</option>
								{/each}
							</select>
						{:else}
							<span class="locked">{line.status}</span>
						{/if}
						<select
							onchange={(e) => saveField(line.id, 'section', e.currentTarget.value)}
							value={line.section}
						>
							{#each data.sections as s}
								<option value={s} selected={s === line.section}>{s}</option>
							{/each}
						</select>
						{#if line.link?.type === 'venue'}
							<span></span>
						{:else}
							<form method="POST" action="?/remove" use:enhance class="rmf">
								<input type="hidden" name="id" value={line.id} />
								<button type="submit" title="Remove" aria-label="Remove">×</button>
							</form>
						{/if}
					{/if}
				</div>
				{#if openPayments === line.id && line.id > 0}
					<div class="payrow">
						{#if line.payments.length === 0}
							<span class="pay-empty">No payments recorded yet.</span>
						{/if}
						{#each line.payments as p (p.id)}
							<span class="pay-item">
								{gbp(p.amount)}{p.paidOn ? ` · ${fmtDate(p.paidOn)}` : ''}{p.note ? ` · ${p.note}` : ''}
								<button class="pay-rm" title="Remove payment" onclick={() => removePayment(p.id)}>×</button>
							</span>
						{/each}
						<form class="pay-add" onsubmit={(e) => { e.preventDefault(); addPayment(line, e.currentTarget); }}>
							<input name="amount" type="number" step="0.01" min="0.01" placeholder="£" required />
							<input name="paidOn" type="date" />
							<input name="note" placeholder="What for?" />
							<button>+ Payment</button>
						</form>
					</div>
				{/if}
			{/each}

			<form method="POST" action="?/add" use:enhance class="addrow">
				<input type="hidden" name="section" value={section} />
				<input name="category" placeholder={`Add a line in ${section}…`} />
				<button>+ Add</button>
			</form>
		</div>
	</section>
{/each}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 14px;
		margin-bottom: 32px;
	}
	.stat {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 22px;
	}
	.stat .v {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		line-height: 1;
		display: flex;
		align-items: baseline;
	}
	.stat .v.accent {
		color: var(--sage);
	}
	.stat .v.warning {
		color: var(--terra);
	}
	.stat .l {
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 10.5px;
		color: var(--muted);
		margin-top: 8px;
	}
	/* Editable Target stat — keeps the same card chrome as the other stats,
	   but the input itself is borderless and uses the serif display font so
	   it reads as the stat value. */
	.stat-edit .v {
		gap: 0;
	}
	.stat-edit .prefix {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		line-height: 1;
	}
	.stat-edit input {
		border: 0;
		background: transparent;
		padding: 0;
		font: inherit;
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		line-height: 1;
		width: 100%;
		min-width: 0;
	}
	.stat-edit input:focus {
		outline: none;
		box-shadow: 0 1px 0 var(--sage);
	}

	.bsection {
		margin-bottom: 32px;
		margin-top: 32px;
	}
	.ktitle {
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 11.5px;
		color: var(--sage);
		margin: 0 0 12px 4px;
	}
	.ktitle .kcount {
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--faint);
		font-weight: 500;
	}
	.ktitle .ktotals {
		margin-left: auto;
		font-family: var(--serif);
		font-style: normal;
		font-size: 13px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--ink);
		font-weight: 500;
		display: inline-flex;
		gap: 6px;
		align-items: baseline;
	}
	.ktitle .ktotals .confirmed { color: var(--sage-deep); }
	.ktitle .ktotals .paid { color: var(--sage); }
	.ktitle .ktotals .sep { color: var(--faint); }
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 12px 16px;
	}

	.row {
		display: grid;
		grid-template-columns: 20px minmax(180px, 1.8fr) 100px 100px 100px 120px 140px 28px;
		gap: 10px;
		align-items: center;
		padding: 8px 4px;
		border-bottom: 1px solid var(--line2);
		border-top: 2px solid transparent;
		transition: border-color 0.12s ease, background-color 0.12s ease;
	}
	.row[draggable='true'] {
		cursor: grab;
	}
	.row[draggable='true']:active {
		cursor: grabbing;
	}
	.row.drop-over {
		border-top-color: var(--sage);
		background: var(--sage-soft);
	}
	.row .grip {
		color: var(--faint);
		font-size: 14px;
		line-height: 1;
		user-select: none;
		text-align: center;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.row:hover .grip {
		opacity: 1;
	}
	.row:last-of-type {
		border-bottom: 0;
	}
	.row.head {
		color: var(--muted);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--line);
	}
	.row.head .r {
		text-align: right;
	}
	.row input,
	.row select {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 13px;
		background: #fff;
		min-width: 0;
	}
	.row input.cat {
		font-weight: 500;
		color: var(--ink);
	}
	.row input.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.row .readonly {
		color: var(--body);
		font-variant-numeric: tabular-nums;
		padding-right: 8px;
		text-align: right;
	}
	.row .locked {
		color: var(--faint);
		font-size: 12px;
		font-style: italic;
	}
	.catwrap {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}
	.catwrap .cat {
		flex: 1;
		min-width: 60px;
	}
	.src-chip {
		flex: none;
		font-size: 11px;
		font-weight: 600;
		color: var(--sage-deep);
		background: var(--sage-soft);
		border-radius: 6px;
		padding: 3px 7px;
		text-decoration: none;
		white-space: nowrap;
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.linksel {
		flex: none;
		width: 26px;
		color: transparent;
		background: transparent !important;
		border-color: var(--line2) !important;
		cursor: pointer;
	}
	.paybtn {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 13px;
		background: #fff;
		text-align: right;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		color: var(--sage-deep);
		white-space: nowrap;
	}
	.paybtn .caret {
		color: var(--muted);
		font-size: 10px;
	}
	.payrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 10px 12px 12px 32px;
		border-bottom: 1px solid var(--line2);
		background: var(--sage-soft);
	}
	.pay-empty {
		color: var(--muted);
		font-size: 12.5px;
		font-style: italic;
	}
	.pay-item {
		font-size: 12.5px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 4px 8px;
		color: var(--body);
		font-variant-numeric: tabular-nums;
	}
	.pay-rm {
		border: 0;
		background: none;
		color: var(--terra);
		cursor: pointer;
		font-size: 13px;
		padding: 0 0 0 4px;
	}
	.pay-add {
		display: flex;
		gap: 6px;
		margin-left: auto;
	}
	.pay-add input {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 5px 7px;
		font: inherit;
		font-size: 12.5px;
	}
	.pay-add input[name='amount'] {
		width: 80px;
	}
	.pay-add input[name='note'] {
		width: 130px;
	}
	.pay-add button {
		border: 0;
		border-radius: 6px;
		background: var(--sage);
		color: #fff;
		font-size: 12.5px;
		font-weight: 600;
		padding: 5px 10px;
		cursor: pointer;
	}
	.row.venue .venue-cat {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--ink);
	}
	.shop-link {
		font-size: 11px;
		color: var(--sage-deep);
		text-decoration: none;
		white-space: nowrap;
	}
	.shop-link:hover {
		text-decoration: underline;
	}
	.rmf {
		margin: 0;
	}
	.rmf button {
		background: none;
		border: 0;
		color: var(--faint);
		font-size: 18px;
		cursor: pointer;
		padding: 0;
	}
	.rmf button:hover {
		color: var(--terra);
	}

	.addrow {
		display: flex;
		gap: 10px;
		margin: 12px 4px 4px;
	}
	.addrow input {
		flex: 1;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
		font: inherit;
		font-size: 13px;
	}
	.addrow button {
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 8px;
		padding: 8px 14px;
		cursor: pointer;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 500;
	}

	@media (max-width: 800px) {
		.row {
			grid-template-columns: 1fr 1fr 1fr;
			gap: 6px;
		}
		.row.head {
			display: none;
		}
	}
</style>

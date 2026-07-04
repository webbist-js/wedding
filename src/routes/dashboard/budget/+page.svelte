<script lang="ts">
	import Pill from '$lib/components/Pill.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { gbp } from '$lib/money';
	let { data } = $props();

	type Line = (typeof data.lines)[number];

	// ---- Split the rollup: synced sources become cards, the rest fill the grid.
	const venueLine = $derived(data.lines.find((l) => l.link?.type === 'venue'));
	const shoppingLine = $derived(data.lines.find((l) => l.link?.type === 'shopping'));
	const gridLines = $derived(
		data.lines.filter((l) => l.link?.type !== 'venue' && l.link?.type !== 'shopping')
	);

	// ---- Headline figures
	const earmark = $derived(data.totals.budgeted);
	const confirmed = $derived(data.totals.confirmed);
	const paid = $derived(data.totals.paid);
	const overTarget = $derived(earmark - data.target);

	// ---- "Where the money is" stacked bar (out of target or earmark, whichever is bigger)
	const bar = $derived.by(() => {
		const total = Math.max(data.target, earmark, confirmed, 1);
		const confirmedUnpaid = Math.max(0, confirmed - paid);
		const stillEstimated = Math.max(0, earmark - confirmed);
		const pct = (n: number) => (100 * n) / total;
		return {
			paid: pct(paid),
			confirmedUnpaid: pct(confirmedUnpaid),
			stillEstimated: pct(stillEstimated),
			amounts: { paid, confirmedUnpaid, stillEstimated }
		};
	});

	// ---- Spend by area (Venue · each section · Shopping), earmark-weighted
	const AREA_COLOURS = ['#6f7d59', '#c2a18a', '#b05c3f', '#7e74a8', '#c08a86', '#cbbd9e'];
	const areas = $derived.by(() => {
		const out: { label: string; budgeted: number; confirmed: number }[] = [];
		if (venueLine)
			out.push({
				label: 'Venue',
				budgeted: venueLine.budgeted || venueLine.confirmed,
				confirmed: venueLine.confirmed
			});
		for (const s of data.sections) {
			const ls = gridLines.filter((l) => l.section === s);
			if (!ls.length) continue;
			out.push({
				label: s,
				budgeted: ls.reduce((a, l) => a + l.budgeted, 0),
				confirmed: ls.reduce((a, l) => a + l.confirmed, 0)
			});
		}
		if (shoppingLine)
			out.push({
				label: 'Shopping',
				budgeted: shoppingLine.budgeted,
				confirmed: shoppingLine.confirmed
			});
		return out.sort((a, b) => b.budgeted - a.budgeted);
	});
	const areaTotal = $derived(Math.max(1, areas.reduce((a, x) => a + x.budgeted, 0)));

	// Donut geometry: r=54, stroke=16 in a 140 viewBox.
	const R = 54;
	const CIRC = 2 * Math.PI * R;
	const donutSegs = $derived.by(() => {
		let cum = 0;
		return areas.map((a, i) => {
			const frac = a.budgeted / areaTotal;
			const seg = { frac, offset: cum, colour: AREA_COLOURS[i % AREA_COLOURS.length] };
			cum += frac;
			return seg;
		});
	});
	const short = (n: number) => (n >= 1000 ? `£${Math.round(n / 1000)}k` : gbp(n));

	// ---- Grid plumbing (unchanged behaviours)
	async function saveField(id: number, field: string, value: string | number | null) {
		await fetch('/dashboard/budget/line', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, field, value })
		});
	}

	let openPayments = $state<number | null>(null);
	async function addPayment(line: Line, form: HTMLFormElement) {
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

	const ADD_HINTS: Record<string, string> = {
		Essentials: 'Add an essential — attire, rings, ceremony…',
		'Décor & flowers': 'Add décor — florist, styling, confetti…',
		Stationery: 'Add stationery — invites, signage, menus…',
		'Everything else': 'Add a line — cake, transport, extras…'
	};

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

<!-- ─── Stat cards ─────────────────────────────────────────────────────── -->
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
		<div class="l">Target budget</div>
	</form>
	<div class="stat"><div class="v">{gbp(earmark)}</div><div class="l">Total earmarked</div></div>
	<div class="stat"><div class="v">{gbp(confirmed)}</div><div class="l">Confirmed costs</div></div>
	<div class="stat filled"><div class="v">{gbp(paid)}</div><div class="l">Paid to date</div></div>
	<div class="stat">
		<div class="v" class:warning={overTarget > 0} class:good={overTarget <= 0}>
			{gbp(Math.abs(overTarget))}
		</div>
		<div class="l">{overTarget > 0 ? 'Over target' : 'Under target'}</div>
	</div>
</div>

<!-- ─── Where the money is ─────────────────────────────────────────────── -->
<section class="card moneybar">
	<div class="mb-head">
		<span class="kicker">Where the money is</span>
		<span class="mb-caption">
			{gbp(earmark)} earmarked against a {gbp(data.target)} target —
			<strong class:warning={overTarget > 0}>
				{gbp(Math.abs(overTarget))} {overTarget > 0 ? 'over' : 'under'} target
			</strong>
		</span>
	</div>
	<div class="mb-track" role="img" aria-label="Budget progress bar">
		<div class="seg paid" style={`width:${bar.paid}%`}></div>
		<div class="seg confirmed" style={`width:${bar.confirmedUnpaid}%`}></div>
		<div class="seg estimated" style={`width:${bar.stillEstimated}%`}></div>
	</div>
	<div class="mb-legend">
		<span><i class="dot paid"></i> Paid <strong>{gbp(bar.amounts.paid)}</strong></span>
		<span><i class="dot confirmed"></i> Confirmed, unpaid <strong>{gbp(bar.amounts.confirmedUnpaid)}</strong></span>
		<span><i class="dot estimated"></i> Still estimated <strong>{gbp(bar.amounts.stillEstimated)}</strong></span>
	</div>
</section>

<!-- ─── Charts row ─────────────────────────────────────────────────────── -->
<div class="charts">
	<section class="card chart">
		<span class="kicker">Spend by area</span>
		<div class="donut-wrap">
			<svg viewBox="0 0 140 140" class="donut" aria-hidden="true">
				{#each donutSegs as seg}
					<circle
						cx="70" cy="70" r={R}
						fill="none"
						stroke={seg.colour}
						stroke-width="17"
						stroke-dasharray={`${Math.max(0, seg.frac * CIRC - 1.5)} ${CIRC}`}
						stroke-dashoffset={-seg.offset * CIRC}
						transform="rotate(-90 70 70)"
					/>
				{/each}
				<text x="70" y="67" text-anchor="middle" class="donut-total">{short(earmark)}</text>
				<text x="70" y="82" text-anchor="middle" class="donut-sub">earmarked</text>
			</svg>
			<ul class="area-legend">
				{#each areas as a, i}
					<li>
						<i class="dot" style={`background:${AREA_COLOURS[i % AREA_COLOURS.length]}`}></i>
						<span class="al-label">{a.label}</span>
						<strong>{gbp(a.budgeted)}</strong>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card chart">
		<span class="kicker">Budgeted vs confirmed</span>
		<div class="vs-bars">
			{#each areas as a, i}
				<div class="vs-row">
					<div class="vs-meta">
						<span>{a.label}</span>
						<span class="vs-nums">{gbp(a.confirmed)} / {gbp(a.budgeted)}</span>
					</div>
					<div class="vs-track">
						<div
							class="vs-fill"
							style={`width:${Math.min(100, a.budgeted > 0 ? (100 * a.confirmed) / a.budgeted : a.confirmed > 0 ? 100 : 0)}%;background:${AREA_COLOURS[i % AREA_COLOURS.length]}`}
						></div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<!-- ─── Pulled in from elsewhere ───────────────────────────────────────── -->
<span class="kicker standalone">Pulled in from elsewhere</span>
<div class="synced-cards">
	{#if venueLine}
		<section class="card synced">
			<div class="sy-head">
				<span class="sy-ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>
				</span>
				<span class="sy-title">
					<strong>Venue &amp; catering</strong>
					<em>The Tithe Barn — live from Venue &amp; costs</em>
				</span>
				<Pill tone="green">Synced</Pill>
			</div>
			<div class="sy-stats">
				<span><strong>{gbp(venueLine.confirmed)}</strong><em>confirmed</em></span>
				<span><strong>{gbp(venueLine.paid)}</strong><em>paid</em></span>
				<span class="sy-earmark">
					<span class="money"><i>£</i><input
						type="number"
						value={venueLine.budgeted}
						onchange={(e) => { saveField(venueLine.id, 'budgeted', e.currentTarget.value); invalidateAll(); }}
						title="Venue earmark (budgeted)"
					/></span>
					<em>budgeted</em>
				</span>
				<a class="sy-open" href="/dashboard/venue">Open Venue →</a>
			</div>
		</section>
	{/if}
	{#if shoppingLine}
		<section class="card synced">
			<div class="sy-head">
				<span class="sy-ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.2 11h10l2-8H6"/></svg>
				</span>
				<span class="sy-title">
					<strong>Shopping list</strong>
					<em>{data.shoppingCount} items incl. favours — live from Shopping</em>
				</span>
				<Pill tone="green">Synced</Pill>
			</div>
			<div class="sy-stats">
				<span><strong>{gbp(shoppingLine.confirmed)}</strong><em>confirmed</em></span>
				<span><strong>{gbp(shoppingLine.paid)}</strong><em>paid</em></span>
				<span><strong>{gbp(shoppingLine.budgeted)}</strong><em>budgeted</em></span>
				<a class="sy-open" href="/dashboard/shopping">Open Shopping →</a>
			</div>
		</section>
	{/if}
</div>

<!-- ─── Section cards ──────────────────────────────────────────────────── -->
{#each data.sections as section}
	{@const sectionLines = gridLines.filter((l) => l.section === section)}
	{@const secBudgeted = sectionLines.reduce((a, l) => a + l.budgeted, 0)}
	{@const secConfirmed = sectionLines.reduce((a, l) => a + l.confirmed, 0)}
	{@const secPaid = sectionLines.reduce((a, l) => a + l.paid, 0)}
	<section class="bsection">
		<h3 class="ktitle">
			<span>{section}</span>
			<span class="kcount">{sectionLines.length} {sectionLines.length === 1 ? 'line' : 'lines'}</span>
			<span class="ktotals">
				<span>{gbp(secBudgeted)} planned</span>
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
				<span class="r">Budgeted</span>
				<span class="r">Confirmed</span>
				<span class="r">Paid</span>
				<span>Status</span>
				<span></span>
			</div>

			{#each sectionLines as line (line.id)}
				<div
					class="row"
					class:drop-over={dragOverId === line.id}
					draggable={true}
					ondragstart={(e) => onDragStart(e, line.id)}
					ondragover={(e) => onDragOver(e, line.id)}
					ondragleave={onDragLeave}
					ondrop={(e) => onDrop(e, line.id)}
				>
					<span class="grip" aria-hidden="true">≡</span>
					<span class="catwrap">
						<input
							class="cat"
							value={line.category}
							onchange={(e) => saveField(line.id, 'category', e.currentTarget.value)}
						/>
						{#if line.link?.type === 'vendor'}
							<a class="src-chip" href="/dashboard/vendors" title="Figures come from this vendor">⭲ {line.link.vendorName}</a>
						{/if}
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
					</span>
					<span class="money">
						<i>£</i>
						<input
							type="number"
							value={line.budgeted}
							onchange={(e) => saveField(line.id, 'budgeted', e.currentTarget.value)}
						/>
					</span>
					{#if line.editable}
						<span class="money">
							<i>£</i>
							<input
								type="number"
								value={line.confirmed}
								onchange={(e) => saveField(line.id, 'confirmed', e.currentTarget.value)}
							/>
						</span>
					{:else}
						<span class="readonly num" title="Derived from the linked vendor">{gbp(line.confirmed)}</span>
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
					<span class="rowend">
						<select
							class="secsel"
							title="Move to another section"
							value={line.section}
							onchange={(e) => saveField(line.id, 'section', e.currentTarget.value).then(invalidateAll)}
						>
							{#each data.sections as s}
								<option value={s} selected={s === line.section}>{s}</option>
							{/each}
						</select>
						<form method="POST" action="?/remove" use:enhance class="rmf">
							<input type="hidden" name="id" value={line.id} />
							<button type="submit" title="Remove" aria-label="Remove">×</button>
						</form>
					</span>
				</div>
				{#if openPayments === line.id}
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
				<input name="category" placeholder={ADD_HINTS[section] ?? `Add a line in ${section}…`} />
				<button>+ Add</button>
			</form>
		</div>
	</section>
{/each}

<style>
	.kicker {
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 10.5px;
		color: var(--muted);
	}
	.kicker.standalone {
		display: block;
		margin: 4px 2px 10px;
	}

	/* ── Stat cards ── */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 14px;
		margin-bottom: 18px;
	}
	.stat {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 22px;
	}
	.stat.filled {
		background: var(--sage);
		border-color: var(--sage);
	}
	.stat.filled .v,
	.stat.filled .l {
		color: #fff;
	}
	.stat .v {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 28px;
		color: var(--ink);
		line-height: 1;
		display: flex;
		align-items: baseline;
	}
	.stat .v.warning {
		color: var(--terra);
	}
	.stat .v.good {
		color: var(--sage-deep);
	}
	.stat .l {
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--muted);
		margin-top: 8px;
	}
	.stat-edit input {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 28px;
		color: var(--ink);
		border: 0;
		border-bottom: 1.5px dashed var(--rule);
		background: transparent;
		width: 100%;
		min-width: 0;
		padding: 0;
	}
	.stat-edit input:focus {
		outline: none;
		border-bottom-color: var(--sage);
	}
	.stat-edit .prefix {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 28px;
		color: var(--ink);
	}

	/* ── Money bar ── */
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
	}
	.moneybar {
		padding: 16px 20px 18px;
		margin-bottom: 18px;
	}
	.mb-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.mb-caption {
		font-size: 12.5px;
		color: var(--muted);
	}
	.mb-caption strong.warning {
		color: var(--terra);
	}
	.mb-track {
		display: flex;
		height: 12px;
		border-radius: 999px;
		overflow: hidden;
		background: var(--line2);
	}
	.seg.paid {
		background: var(--sage-deep);
	}
	.seg.confirmed {
		background: var(--sage);
		opacity: 0.55;
	}
	.seg.estimated {
		background: var(--rule);
		opacity: 0.5;
	}
	.mb-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		margin-top: 10px;
		font-size: 12px;
		color: var(--body);
	}
	.dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2.5px;
		margin-right: 5px;
		vertical-align: baseline;
	}
	.dot.paid {
		background: var(--sage-deep);
	}
	.dot.confirmed {
		background: var(--sage);
		opacity: 0.55;
	}
	.dot.estimated {
		background: var(--rule);
		opacity: 0.6;
	}

	/* ── Charts ── */
	.charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 18px;
		margin-bottom: 18px;
	}
	.chart {
		padding: 16px 20px 18px;
	}
	.donut-wrap {
		display: flex;
		align-items: center;
		gap: 22px;
		margin-top: 14px;
		flex-wrap: wrap;
	}
	.donut {
		width: 150px;
		height: 150px;
		flex: none;
	}
	.donut-total {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 22px;
		fill: var(--ink);
	}
	.donut-sub {
		font-size: 8.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		fill: var(--muted);
	}
	.area-legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
		flex: 1;
		min-width: 180px;
	}
	.area-legend li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--body);
	}
	.al-label {
		flex: 1;
	}
	.area-legend strong {
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.vs-bars {
		display: grid;
		gap: 13px;
		margin-top: 16px;
	}
	.vs-meta {
		display: flex;
		justify-content: space-between;
		font-size: 12.5px;
		color: var(--body);
		margin-bottom: 5px;
	}
	.vs-nums {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.vs-track {
		height: 7px;
		border-radius: 999px;
		background: var(--line2);
		overflow: hidden;
	}
	.vs-fill {
		height: 100%;
		border-radius: 999px;
	}

	/* ── Synced source cards ── */
	.synced-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 18px;
		margin-bottom: 26px;
	}
	.synced {
		background: var(--sage-soft);
		border-color: var(--line2);
		padding: 16px 20px;
	}
	.sy-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
	}
	.sy-ico {
		flex: none;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: #fff;
		border: 1px solid var(--line2);
		display: grid;
		place-items: center;
		color: var(--sage-deep);
	}
	.sy-title {
		flex: 1;
		display: grid;
	}
	.sy-title strong {
		font-size: 14.5px;
		color: var(--ink);
	}
	.sy-title em {
		font-style: normal;
		font-size: 12px;
		color: var(--muted);
	}
	.sy-stats {
		display: flex;
		align-items: flex-end;
		gap: 22px;
		flex-wrap: wrap;
	}
	.sy-stats > span {
		display: grid;
	}
	.sy-stats strong {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 21px;
		color: var(--ink);
		line-height: 1.1;
	}
	.sy-stats em {
		font-style: normal;
		font-size: 9.5px;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.sy-earmark .money input {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 21px;
		width: 90px;
	}
	.sy-open {
		margin-left: auto;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 8px 14px;
		font-size: 12px;
		font-weight: 600;
		color: var(--sage-deep);
		text-decoration: none;
		white-space: nowrap;
	}

	/* ── Section cards / grid ── */
	.bsection {
		margin-bottom: 26px;
	}
	.ktitle {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 0 2px 10px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 11.5px;
		color: var(--ink);
	}
	.kcount {
		color: var(--faint);
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: none;
		font-size: 11.5px;
	}
	.ktotals {
		margin-left: auto;
		font-weight: 500;
		letter-spacing: 0.02em;
		text-transform: none;
		font-size: 12px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.ktotals .confirmed {
		color: var(--sage-deep);
	}
	.ktotals .paid {
		color: var(--sage);
	}
	.sep {
		margin: 0 4px;
		color: var(--faint);
	}
	.bsection .card {
		padding: 4px 16px 12px;
	}

	.row {
		display: grid;
		grid-template-columns: 18px minmax(180px, 2fr) 110px 110px 110px 118px 106px;
		gap: 10px;
		align-items: center;
		padding: 7px 0;
		border-bottom: 1px solid var(--line2);
	}
	.row.head {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
		padding: 12px 0 8px;
		border-bottom: 1px solid var(--line);
	}
	.row.head .r {
		text-align: right;
	}
	.row[draggable='true'] .grip {
		cursor: grab;
	}
	.row.drop-over {
		box-shadow: inset 0 2px 0 var(--sage);
	}
	.grip {
		color: var(--faint);
		font-size: 12px;
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
	.money {
		display: flex;
		align-items: center;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: #fff;
		min-width: 0;
	}
	.money i {
		font-style: normal;
		font-size: 12px;
		color: var(--faint);
		padding: 0 2px 0 8px;
	}
	.money input {
		border: 0 !important;
		background: transparent !important;
		flex: 1;
		width: 100%;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.money input:focus {
		outline: none;
	}
	.money:focus-within {
		border-color: var(--sage);
	}
	.readonly {
		color: var(--body);
		font-variant-numeric: tabular-nums;
		padding-right: 8px;
		text-align: right;
	}
	.locked {
		color: var(--faint);
		font-size: 12px;
		font-style: italic;
	}
	.rowend {
		display: flex;
		align-items: center;
		gap: 4px;
		justify-content: flex-end;
	}
	.secsel {
		width: 26px;
		color: transparent;
		background: transparent !important;
		border-color: var(--line2) !important;
		cursor: pointer;
	}
	.rmf button {
		background: none;
		border: 0;
		color: var(--faint);
		font-size: 16px;
		cursor: pointer;
		line-height: 1;
		padding: 2px 4px;
	}
	.rmf button:hover {
		color: var(--terra);
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
		padding: 10px 12px 12px 28px;
		border-bottom: 1px solid var(--line2);
		background: var(--sage-soft);
		border-radius: 0 0 8px 8px;
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
	.addrow {
		display: flex;
		gap: 8px;
		padding: 12px 0 4px;
	}
	.addrow input {
		flex: 1;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 12px;
		font: inherit;
		font-size: 13px;
		background: var(--bg);
	}
	.addrow button {
		border: 0;
		border-radius: 8px;
		background: var(--sage);
		color: #fff;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		padding: 0 18px;
		cursor: pointer;
	}

	@media (max-width: 800px) {
		.row {
			grid-template-columns: 1fr 1fr 1fr;
			gap: 6px;
		}
		.row.head {
			display: none;
		}
		.row .grip {
			display: none;
		}
		.catwrap {
			grid-column: 1 / -1;
		}
		.rowend {
			justify-content: flex-start;
		}
		.sy-stats {
			gap: 14px;
		}
		.sy-open {
			margin-left: 0;
		}
	}
</style>

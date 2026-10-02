<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Pill from '$lib/components/Pill.svelte';
	import BudgetCharts from '$lib/components/budget/BudgetCharts.svelte';
	import AttentionStrip from '$lib/components/budget/AttentionStrip.svelte';
	import BudgetLineRow from '$lib/components/budget/BudgetLineRow.svelte';
	import SupplierCard from '$lib/components/SupplierCard.svelte';
	import type { NoteRow } from '$lib/components/Notes.svelte';
	import { gbp } from '$lib/money';
	let { data } = $props();

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

	// ---- Spend by area (Venue · each section · Shopping), earmark-weighted
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
			out.push({ label: 'Shopping', budgeted: shoppingLine.budgeted, confirmed: shoppingLine.confirmed });
		return out;
	});

	const suppliersFor = (lineId: number) => data.suppliers.filter((s) => s.budgetLineId === lineId);
	const notes = $derived(data.notes as NoteRow[]);

	// ---- Expansion: one line open at a time; #line-N in the URL opens it.
	let openId = $state<number | null>(null);
	let venueOpen = $state(false);
	function toggle(id: number) {
		openId = openId === id ? null : id;
	}
	onMount(() => {
		const m = location.hash.match(/^#line-(\d+)$/);
		if (!m) return;
		const id = Number(m[1]);
		if (venueLine && id === venueLine.id) venueOpen = true;
		else openId = id;
		requestAnimationFrame(() => document.getElementById(`line-${id}`)?.scrollIntoView({ block: 'center' }));
	});

	async function saveVenueEarmark(id: number, value: string) {
		await fetch('/dashboard/budget/line', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, field: 'budgeted', value })
		});
		await invalidateAll();
	}

	const ADD_HINTS: Record<string, string> = {
		Essentials: 'Add an essential — attire, rings, ceremony…',
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

<BudgetCharts target={data.target} {earmark} {confirmed} {paid} {areas} />

<AttentionStrip items={data.attention} />

<!-- ─── Pulled in from elsewhere ───────────────────────────────────────── -->
<span class="kicker standalone">Pulled in from elsewhere</span>
<div class="synced-cards">
	{#if venueLine}
		{@const venueSuppliers = suppliersFor(venueLine.id)}
		<section class="card synced" id={`line-${venueLine.id}`}>
			<div class="sy-head">
				<span class="sy-ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>
				</span>
				<span class="sy-title">
					<strong>Venue &amp; catering</strong>
					<em>The Tithe Barn — live from the Venue quote ({data.basis === 'manual' ? 'manual counts' : data.basis === 'confirmed' ? 'RSVP confirmed' : 'all invited'})</em>
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
						onchange={(e) => saveVenueEarmark(venueLine.id, e.currentTarget.value)}
						title="Venue earmark (budgeted)"
					/></span>
					<em>budgeted</em>
				</span>
				<span class="sy-links">
					<button type="button" class="sy-open ghost" aria-expanded={venueOpen} onclick={() => (venueOpen = !venueOpen)}>
						{venueSuppliers.length ? `${venueSuppliers.length} supplier${venueSuppliers.length === 1 ? '' : 's'}` : 'Supplier'} {venueOpen ? '▴' : '▾'}
					</button>
					<a class="sy-open" href="/dashboard/venue">Open Venue →</a>
				</span>
			</div>
			{#if venueOpen}
				<div class="sy-suppliers">
					{#each venueSuppliers as s (s.id)}
						<SupplierCard compact supplier={s} payments={data.payments.filter((p) => p.vendorId === s.id)} appointments={data.appointments} notes={notes.filter((n) => n.entityId === s.id)} lineOptions={data.lineOptions} />
					{/each}
					{#if !venueSuppliers.length}
						<p class="sy-empty">No supplier filed under the venue line yet.</p>
					{/if}
				</div>
			{/if}
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
				<span>Category · suppliers</span>
				<span class="r">Budgeted</span>
				<span class="r">Confirmed</span>
				<span class="r">Paid</span>
				<span>Status</span>
				<span></span>
			</div>

			{#each sectionLines as line (line.id)}
				<BudgetLineRow
					{line}
					sections={data.sections}
					lineOptions={data.lineOptions}
					suppliers={suppliersFor(line.id)}
					payments={data.payments}
					appointments={data.appointments}
					{notes}
					expanded={openId === line.id}
					onToggle={() => toggle(line.id)}
					dropOver={dragOverId === line.id}
					onDragStart={(e) => onDragStart(e, line.id)}
					onDragOver={(e) => onDragOver(e, line.id)}
					onDragLeave={() => (dragOverId = null)}
					onDrop={(e) => onDrop(e, line.id)}
				/>
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
	.kicker { font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 10.5px; color: var(--muted); }
	.kicker.standalone { display: block; margin: 4px 2px 10px; }

	/* ── Stat cards ── */
	.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 18px; }
	.stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 22px; }
	.stat.filled { background: var(--sage); border-color: var(--sage); }
	.stat.filled .v, .stat.filled .l { color: #fff; }
	.stat .v { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); line-height: 1; display: flex; align-items: baseline; }
	.stat .v.warning { color: var(--terra); }
	.stat .v.good { color: var(--sage-deep); }
	.stat .l { font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; font-size: 10px; color: var(--muted); margin-top: 8px; }
	.stat-edit input { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); border: 0; border-bottom: 1.5px dashed var(--rule); background: transparent; width: 100%; min-width: 0; padding: 0; }
	.stat-edit input:focus { outline: none; border-bottom-color: var(--sage); }
	.stat-edit .prefix { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); }

	.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; }

	/* ── Synced source cards ── */
	.synced-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; margin-bottom: 26px; }
	.synced { background: var(--sage-soft); border-color: var(--line2); padding: 16px 20px; scroll-margin-top: 90px; }
	.sy-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
	.sy-ico { flex: none; width: 34px; height: 34px; border-radius: 10px; background: #fff; border: 1px solid var(--line2); display: grid; place-items: center; color: var(--sage-deep); }
	.sy-title { flex: 1; display: grid; }
	.sy-title strong { font-size: 14.5px; color: var(--ink); }
	.sy-title em { font-style: normal; font-size: 12px; color: var(--muted); }
	.sy-stats { display: flex; align-items: flex-end; gap: 22px; flex-wrap: wrap; }
	.sy-stats > span { display: grid; }
	.sy-stats strong { font-family: var(--serif); font-weight: 600; font-size: 21px; color: var(--ink); line-height: 1.1; }
	.sy-stats em { font-style: normal; font-size: 9.5px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--muted); }
	.sy-earmark .money { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
	.sy-earmark .money i { font-style: normal; font-size: 12px; color: var(--faint); padding: 0 2px 0 8px; }
	.sy-earmark .money input { font-family: var(--serif); font-weight: 600; font-size: 21px; width: 90px; border: 0; background: transparent; text-align: right; font-variant-numeric: tabular-nums; }
	.sy-earmark .money input:focus { outline: none; }
	.sy-links { margin-left: auto; display: flex !important; gap: 8px; align-items: center; }
	.sy-open { background: #fff; border: 1px solid var(--line); border-radius: 9px; padding: 8px 14px; font: inherit; font-size: 12px; font-weight: 600; color: var(--sage-deep); text-decoration: none; white-space: nowrap; cursor: pointer; }
	.sy-open.ghost { background: transparent; }
	.sy-open:hover { border-color: var(--sage); }
	.sy-suppliers { margin-top: 14px; display: grid; gap: 10px; }
	.sy-empty { margin: 0; font-size: 12.5px; color: var(--muted); font-style: italic; }

	/* ── Section cards / grid ── */
	.bsection { margin-bottom: 26px; }
	.ktitle { display: flex; align-items: baseline; gap: 10px; margin: 0 2px 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 11.5px; color: var(--ink); }
	.kcount { color: var(--faint); font-weight: 500; letter-spacing: 0.04em; text-transform: none; font-size: 11.5px; }
	.ktotals { margin-left: auto; font-weight: 500; letter-spacing: 0.02em; text-transform: none; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
	.ktotals .confirmed { color: var(--sage-deep); }
	.ktotals .paid { color: var(--sage); }
	.sep { margin: 0 4px; color: var(--faint); }
	.bsection .card { padding: 4px 16px 12px; }

	.row.head {
		display: grid; grid-template-columns: 18px minmax(200px, 2fr) 110px 110px 110px 118px 64px; gap: 10px;
		font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 0 8px; border-bottom: 1px solid var(--line);
	}
	.row.head .r { text-align: right; }

	.addrow { display: flex; gap: 8px; padding: 12px 0 4px; }
	.addrow input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 13px; background: var(--bg); }
	.addrow button { border: 0; border-radius: 8px; background: var(--sage); color: #fff; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; padding: 0 18px; cursor: pointer; }

	@media (max-width: 800px) {
		.row.head { display: none; }
		.sy-stats { gap: 14px; }
		.sy-links { margin-left: 0; }
	}
</style>

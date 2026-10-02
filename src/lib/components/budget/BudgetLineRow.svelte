<script lang="ts">
	// One budget line: the grid row, its visible row menu, and an expander that
	// makes the line the hub for its suppliers, payments and lock.
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Pill from '$lib/components/Pill.svelte';
	import LockToggle from '$lib/components/LockToggle.svelte';
	import PaymentsLedger from '$lib/components/PaymentsLedger.svelte';
	import SupplierCard, {
		stageTone,
		type SupplierRow,
		type LineOption,
		type ApptRow
	} from '$lib/components/SupplierCard.svelte';
	import type { NoteRow } from '$lib/components/Notes.svelte';
	import type { EffectiveLine } from '$lib/server/budget';
	import { gbp } from '$lib/money';

	interface RawPayment {
		id: number;
		amount: number;
		paidOn: string | null;
		note: string | null;
		vendorId: number | null;
		budgetLineId: number | null;
	}

	let {
		line,
		sections,
		lineOptions,
		suppliers,
		payments,
		appointments,
		notes,
		expanded,
		onToggle,
		dropOver = false,
		onDragStart,
		onDragOver,
		onDragLeave,
		onDrop
	}: {
		line: EffectiveLine;
		sections: string[];
		lineOptions: LineOption[];
		suppliers: SupplierRow[]; // filed under this line
		payments: RawPayment[]; // all payments; filtered here
		appointments: ApptRow[];
		notes: NoteRow[];
		expanded: boolean;
		onToggle: () => void;
		dropOver?: boolean;
		onDragStart: (e: DragEvent) => void;
		onDragOver: (e: DragEvent) => void;
		onDragLeave: () => void;
		onDrop: (e: DragEvent) => void;
	} = $props();

	const direct = $derived(payments.filter((p) => p.budgetLineId === line.id));
	const noQuote = $derived(line.suppliers.some((s) => s.committed && s.quotedAmount == null));
	const statusOptions = ['Estimate', 'To book', 'Booked', 'Deposit', 'Paid', 'Optional'];

	async function save(field: string, value: string | number | boolean | null) {
		const res = await fetch('/dashboard/budget/line', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: line.id, field, value })
		});
		if (res.status === 423) alert('This line is locked — unlock it to edit.');
		if (field === 'locked' || field === 'section' || field === 'budgeted' || field === 'confirmed' || !res.ok) {
			await invalidateAll();
		}
	}
	async function addSupplier() {
		menuOpen = false;
		await fetch('/dashboard/suppliers/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ op: 'add', budgetLineId: line.id })
		});
		await invalidateAll();
		if (!expanded) onToggle();
	}

	// Row menu: explicit, visible actions replacing the old transparent selects.
	let menuOpen = $state(false);
	let menuEl = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!menuOpen) return;
		const close = (e: MouseEvent) => {
			if (menuEl && !menuEl.contains(e.target as Node)) menuOpen = false;
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') menuOpen = false;
		};
		document.addEventListener('click', close, true);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('click', close, true);
			document.removeEventListener('keydown', esc);
		};
	});
	let removeForm = $state<HTMLFormElement | null>(null);
</script>

<div
	class="row"
	id={`line-${line.id}`}
	class:drop-over={dropOver}
	class:locked={line.locked}
	class:open={expanded}
	draggable={!line.locked}
	ondragstart={onDragStart}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
	role="row"
>
	<span class="grip" aria-hidden="true" title={line.locked ? 'Locked lines stay put' : 'Drag to reorder'}>≡</span>
	<span class="catwrap">
		{#if line.locked}
			<span class="lockmark" title="Locked — set & confirmed">
				<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
			</span>
		{/if}
		<input class="cat" value={line.category} disabled={line.locked}
			onchange={(e) => save('category', e.currentTarget.value)} />
		{#each line.suppliers as s (s.id)}
			<button type="button" class="supchip" onclick={onToggle} title={`${s.name ?? s.category} · ${s.stage}${s.quotedAmount != null ? ` · ${gbp(s.quotedAmount)}` : ''}`}>
				<span class="supname">{s.name ?? s.category}</span>
				<Pill tone={stageTone(s.stage)}>{s.stage}</Pill>
			</button>
		{/each}
		{#if noQuote}<span class="warn" title="A booked supplier has no quote, so nothing is confirmed yet">no quote</span>{/if}
	</span>
	<span class="money">
		<i>£</i>
		<input type="number" value={line.budgeted} disabled={line.locked}
			onchange={(e) => save('budgeted', e.currentTarget.value)} />
	</span>
	{#if line.editable}
		<span class="money">
			<i>£</i>
			<input type="number" value={line.confirmed} disabled={line.locked}
				onchange={(e) => save('confirmed', e.currentTarget.value)} />
		</span>
	{:else}
		<span class="readonly num" title="Derived from this line's committed suppliers">{gbp(line.confirmed)}</span>
	{/if}
	<button type="button" class="paybtn num" title="Payments" onclick={onToggle}>
		{gbp(line.paid)}
	</button>
	{#if line.editable}
		<select value={line.status} disabled={line.locked} onchange={(e) => save('status', e.currentTarget.value)}>
			{#each statusOptions as opt}
				<option value={opt} selected={opt === line.status}>{opt}</option>
			{/each}
		</select>
	{:else}
		<span class="derived">{line.status}</span>
	{/if}
	<span class="rowend">
		<span class="menu-wrap" bind:this={menuEl}>
			<button type="button" class="iconbtn" aria-label="Row actions" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>⋯</button>
			{#if menuOpen}
				<div class="menu" role="menu">
					<button type="button" role="menuitem" onclick={() => { menuOpen = false; save('locked', !line.locked); }}>
						{line.locked ? 'Unlock this line' : 'Lock as set & confirmed'}
					</button>
					{#if !line.locked}
						<button type="button" role="menuitem" onclick={addSupplier}>Add a supplier</button>
						<div class="menu-sep"></div>
						<span class="menu-label">Move to</span>
						{#each sections.filter((s) => s !== line.section) as s}
							<button type="button" role="menuitem" onclick={() => { menuOpen = false; save('section', s); }}>{s}</button>
						{/each}
						<div class="menu-sep"></div>
						<button type="button" role="menuitem" class="danger" onclick={() => {
							menuOpen = false;
							if (confirm(`Remove “${line.category}”? Its suppliers are kept and become unfiled.`)) removeForm?.requestSubmit();
						}}>Remove line</button>
					{/if}
				</div>
			{/if}
		</span>
		<button type="button" class="iconbtn chev" class:open={expanded} aria-label={expanded ? 'Hide details' : 'Show details'} aria-expanded={expanded} onclick={onToggle}>▾</button>
	</span>
	<form method="POST" action="?/remove" use:enhance bind:this={removeForm} hidden>
		<input type="hidden" name="id" value={line.id} />
	</form>
</div>

{#if expanded}
	<div class="expander">
		<div class="exp-col">
			<p class="exp-head">Suppliers{suppliers.length ? ` · ${suppliers.length}` : ''}</p>
			{#each suppliers as s (s.id)}
				<SupplierCard
					compact
					supplier={s}
					payments={payments.filter((p) => p.vendorId === s.id)}
					{appointments}
					notes={notes.filter((n) => n.entityId === s.id)}
					{lineOptions}
				/>
			{/each}
			{#if !suppliers.length}
				<p class="exp-empty">No supplier yet, so the confirmed figure is typed by hand. Add one and the confirmed cost comes from its quote once it's booked or a deposit is paid.</p>
			{/if}
			{#if !line.locked}
				<button type="button" class="addsup" onclick={addSupplier}>+ Add supplier</button>
			{/if}
		</div>
		<div class="exp-col side">
			<div class="exp-block">
				<PaymentsLedger title="Payments on this line" payments={direct} attach={{ budgetLineId: line.id }} disabled={line.locked} />
				{#if suppliers.length}
					<p class="exp-note">Supplier payments live on each supplier card and count towards this line's paid total.</p>
				{/if}
			</div>
			<div class="exp-block lockrow">
				<LockToggle locked={line.locked} onToggle={(next) => save('locked', next)} />
				<span>{line.locked ? 'Locked — this line is set & confirmed.' : 'Lock this line once the figures are set & confirmed.'}</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.row {
		display: grid;
		grid-template-columns: 18px minmax(200px, 2fr) 110px 110px 110px 118px 64px;
		gap: 10px;
		align-items: center;
		padding: 7px 0;
		border-bottom: 1px solid var(--line2);
		scroll-margin-top: 90px;
	}
	.row.open { border-bottom-color: transparent; }
	.row.locked { background: linear-gradient(90deg, var(--sage-soft), transparent 40%); border-radius: 8px; }
	.row[draggable='true'] .grip { cursor: grab; }
	.row.locked .grip { opacity: 0.35; }
	.row.drop-over { box-shadow: inset 0 2px 0 var(--sage); }
	.grip { color: var(--faint); font-size: 12px; }
	.row input, .row select {
		border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 0;
	}
	.row input:disabled, .row select:disabled { background: transparent; border-color: transparent; color: var(--body); }
	.row input.cat { font-weight: 500; color: var(--ink); }
	.catwrap { display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap; }
	.catwrap .cat { flex: 1; min-width: 120px; }
	.lockmark { color: var(--sage-deep); display: inline-grid; place-items: center; }
	.supchip {
		display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line2); background: var(--bg);
		border-radius: 999px; padding: 2px 4px 2px 9px; font: inherit; font-size: 11.5px; color: var(--ink); cursor: pointer; max-width: 240px;
	}
	.supchip:hover { border-color: var(--sage); }
	.supname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.warn { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; background: var(--terra-bg); color: var(--terra); border-radius: 999px; padding: 3px 8px; }
	.money { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 6px; background: #fff; min-width: 0; }
	.row.locked .money { border-color: var(--line2); background: transparent; }
	.money i { font-style: normal; font-size: 12px; color: var(--faint); padding: 0 2px 0 8px; }
	.money input { border: 0 !important; background: transparent !important; flex: 1; width: 100%; text-align: right; font-variant-numeric: tabular-nums; }
	.money input:focus { outline: none; }
	.money:focus-within { border-color: var(--sage); }
	.readonly { color: var(--body); font-variant-numeric: tabular-nums; padding-right: 8px; text-align: right; }
	.derived { color: var(--muted); font-size: 12px; font-style: italic; }
	.paybtn {
		border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff;
		text-align: right; font-variant-numeric: tabular-nums; cursor: pointer; color: var(--sage-deep); white-space: nowrap;
	}
	.paybtn:hover { border-color: var(--sage); }
	.rowend { display: flex; align-items: center; gap: 2px; justify-content: flex-end; }
	.iconbtn {
		width: 28px; height: 28px; border-radius: 7px; border: 1px solid transparent; background: transparent; color: var(--muted);
		font: inherit; font-size: 15px; cursor: pointer; display: inline-grid; place-items: center; line-height: 1; padding: 0;
	}
	.iconbtn:hover { background: var(--bg); border-color: var(--line); color: var(--ink); }
	.chev { transition: transform 0.15s; font-size: 12px; }
	.chev.open { transform: rotate(180deg); }
	.menu-wrap { position: relative; }
	.menu {
		position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; min-width: 200px;
		background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 6px;
		box-shadow: 0 12px 30px rgba(33, 31, 26, 0.12); display: grid; gap: 1px;
	}
	.menu button {
		text-align: left; background: none; border: 0; border-radius: 6px; padding: 7px 10px; font: inherit; font-size: 12.5px; color: var(--ink); cursor: pointer;
	}
	.menu button:hover { background: var(--sage-soft); color: var(--sage-deep); }
	.menu button.danger:hover { background: var(--terra-bg); color: var(--terra); }
	.menu-sep { height: 1px; background: var(--line2); margin: 4px 2px; }
	.menu-label { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); padding: 4px 10px 2px; font-weight: 600; }

	.expander {
		display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: 16px;
		padding: 10px 12px 16px 28px; margin-bottom: 4px; border-bottom: 1px solid var(--line2);
		background: var(--sage-soft); border-radius: 0 0 10px 10px;
	}
	.exp-col { display: grid; gap: 10px; align-content: start; min-width: 0; }
	.exp-head { margin: 0; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sage-deep); font-weight: 700; }
	.exp-empty { margin: 0; font-size: 12.5px; color: var(--muted); line-height: 1.5; }
	.addsup {
		justify-self: start; background: transparent; border: 1px dashed var(--sage); color: var(--sage-deep); border-radius: 8px;
		padding: 7px 14px; font: inherit; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; cursor: pointer;
	}
	.addsup:hover { background: #fff; }
	.exp-block { background: var(--card); border: 1px solid var(--line2); border-radius: 10px; padding: 12px 14px; }
	.exp-note { margin: 8px 0 0; font-size: 11.5px; color: var(--muted); line-height: 1.5; }
	.lockrow { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--body); }

	@media (max-width: 800px) {
		.row { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
		.row .grip { display: none; }
		.catwrap { grid-column: 1 / -1; }
		.rowend { justify-content: flex-start; }
		.expander { grid-template-columns: 1fr; padding-left: 12px; }
	}
</style>

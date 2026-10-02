<script lang="ts" module>
	// Shapes shared by the Budget expander and the Suppliers page.
	export interface SupplierRow {
		id: number;
		category: string;
		name: string | null;
		contact: string | null;
		phone: string | null;
		email: string | null;
		website: string | null;
		address: string | null;
		stage: string;
		quotedAmount: number | null;
		depositAmount: number | null;
		depositPaid: boolean;
		followUpDate: string | null;
		priority: number;
		budgetLineId: number | null;
		locked: boolean;
	}
	export interface LineOption {
		id: number;
		category: string;
		section: string;
	}
	export interface ApptRow {
		id: number;
		title: string;
		date: string;
		time: string | null;
		vendorId: number | null;
	}
	export const STAGES = ['Lead', 'Enquired', 'Quoted', 'Shortlisted', 'Booked'];
	export const stageTone = (s: string) =>
		s === 'Booked' ? 'green' : s === 'Shortlisted' || s === 'Quoted' ? 'tan' : 'neut';
</script>

<script lang="ts">
	import Notes from '$lib/components/Notes.svelte';
	import type { NoteRow } from '$lib/components/Notes.svelte';
	import LockToggle from '$lib/components/LockToggle.svelte';
	import PaymentsLedger, { type PaymentRow } from '$lib/components/PaymentsLedger.svelte';
	import { invalidateAll } from '$app/navigation';

	let {
		supplier,
		payments,
		appointments,
		notes,
		lineOptions,
		showLine = false,
		compact = false
	}: {
		supplier: SupplierRow;
		payments: PaymentRow[];
		appointments: ApptRow[];
		notes: NoteRow[];
		lineOptions: LineOption[];
		showLine?: boolean; // show the "filed under" picker + budget deep link
		compact?: boolean;
	} = $props();

	const v = $derived(supplier);
	const todayISO = new Date().toISOString().slice(0, 10);
	const upcoming = $derived(appointments.filter((a) => a.vendorId === v.id && a.date >= todayISO));
	const fmt = (d: string) =>
		new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

	// Line options grouped by budget section for the "filed under" picker.
	const lineGroups = $derived.by(() => {
		const m = new Map<string, LineOption[]>();
		for (const l of lineOptions) (m.get(l.section) ?? m.set(l.section, []).get(l.section)!).push(l);
		return [...m.entries()];
	});
	const filedUnder = $derived(lineOptions.find((l) => l.id === v.budgetLineId) ?? null);

	// Fields whose change alters derived money or layout elsewhere → refetch.
	const REFRESH = new Set(['depositPaid', 'budgetLineId', 'locked', 'stage', 'quotedAmount', 'category', 'name']);
	async function save(field: string, value: unknown) {
		const res = await fetch('/dashboard/suppliers/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: v.id, field, value })
		});
		if (res.status === 423) alert('This supplier is locked — unlock it to edit.');
		if (REFRESH.has(field) || !res.ok) await invalidateAll();
	}
	async function remove() {
		if (!confirm(`Remove ${v.name || v.category}? Payments stay on its budget line.`)) return;
		await fetch('/dashboard/suppliers/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ op: 'remove', id: v.id })
		});
		await invalidateAll();
	}
</script>

{#snippet calIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>{/snippet}
{#snippet noteIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>{/snippet}

<article class="supplier" class:chosen={v.depositPaid} class:locked={v.locked} class:compact id={`supplier-${v.id}`}>
	<div class="top">
		<input class="cat" value={v.category} placeholder="Category" disabled={v.locked}
			onchange={(e) => save('category', e.currentTarget.value)} />
		<input class="name" value={v.name ?? ''} placeholder="Supplier — who?" disabled={v.locked}
			onchange={(e) => save('name', e.currentTarget.value)} />
		<span class={`status ${stageTone(v.stage)}`}>
			<select value={v.stage} disabled={v.locked} onchange={(e) => save('stage', e.currentTarget.value)} aria-label="Stage">
				{#each STAGES as st}<option value={st}>{st}</option>{/each}
			</select>
		</span>
		{#if v.depositPaid}<span class="chosen-badge">Chosen supplier</span>{/if}
		<span class="top-acts">
			<LockToggle locked={v.locked} label="booking details final" onToggle={(next) => save('locked', next)} />
			{#if !v.locked}
				<button class="rm" type="button" title="Remove supplier" aria-label="Remove supplier" onclick={remove}>×</button>
			{/if}
		</span>
	</div>

	{#if showLine}
		<div class="filed">
			<span class="filed-l">Filed under</span>
			<select value={v.budgetLineId == null ? '' : String(v.budgetLineId)} disabled={v.locked}
				onchange={(e) => save('budgetLineId', e.currentTarget.value || null)} aria-label="Budget line">
				<option value="">— unassigned —</option>
				{#each lineGroups as [section, ls]}
					<optgroup label={section}>
						{#each ls as l}<option value={String(l.id)}>{l.category}</option>{/each}
					</optgroup>
				{/each}
			</select>
			{#if filedUnder}
				<a class="filed-link" href={`/dashboard/budget#line-${filedUnder.id}`}>Open in budget →</a>
			{:else}
				<span class="filed-warn">Not counted in the budget until it's filed</span>
			{/if}
		</div>
	{/if}

	<div class="grid">
		<label>Phone<input value={v.phone ?? ''} disabled={v.locked} onchange={(e) => save('phone', e.currentTarget.value)} /></label>
		<label>Email<input value={v.email ?? ''} disabled={v.locked} onchange={(e) => save('email', e.currentTarget.value)} /></label>
		<label>Website<input value={v.website ?? ''} disabled={v.locked} onchange={(e) => save('website', e.currentTarget.value)} /></label>
		<label>Contact<input value={v.contact ?? ''} disabled={v.locked} onchange={(e) => save('contact', e.currentTarget.value)} /></label>
		<label>Quote £<input type="number" step="0.01" value={v.quotedAmount ?? ''} disabled={v.locked} onchange={(e) => save('quotedAmount', e.currentTarget.value)} /></label>
		<label>Deposit £<input type="number" step="0.01" value={v.depositAmount ?? ''} disabled={v.locked} onchange={(e) => save('depositAmount', e.currentTarget.value)} /></label>
		<label>Follow-up<input type="date" value={v.followUpDate ?? ''} disabled={v.locked} onchange={(e) => save('followUpDate', e.currentTarget.value)} /></label>
		<label>Priority
			<select value={String(v.priority)} disabled={v.locked} onchange={(e) => save('priority', e.currentTarget.value)}>
				<option value="1">High</option><option value="2">Medium</option><option value="3">Low</option>
			</select>
		</label>
	</div>

	<label class="deposit-toggle">
		<input type="checkbox" checked={v.depositPaid} disabled={v.locked}
			onchange={(e) => save('depositPaid', e.currentTarget.checked)} />
		Deposit paid — booked &amp; chosen supplier
	</label>

	<div class="ledger-wrap">
		<PaymentsLedger payments={payments} attach={{ vendorId: v.id }} disabled={v.locked} />
	</div>

	<div class="actions">
		{#each upcoming as a (a.id)}
			<a class="chip booked-chip" href="/dashboard/calendar" title={a.title}>
				{@render calIcon()} {fmt(a.date)}{a.time ? ` · ${a.time}` : ''} — {a.title}
			</a>
		{/each}
		<a class="chip dashed" href={`/dashboard/calendar?supplier=${v.id}`}>{@render calIcon()} Book appointment</a>
	</div>

	<div class="notes-area">
		<p class="notes-head">{@render noteIcon()} Notes{notes.length ? ` · ${notes.length}` : ''}</p>
		<Notes {notes} category="Suppliers" entityType="vendor" entityId={v.id} compact addLabel="Add note" />
	</div>
</article>

<style>
	.supplier {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 18px 22px;
		transition: box-shadow 0.15s, border-color 0.15s;
		scroll-margin-top: 90px;
	}
	.supplier:hover { box-shadow: 0 4px 18px rgba(33, 31, 26, 0.05); }
	.supplier.chosen { border-color: var(--sage); }
	.supplier.locked { background: #fcfbf8; }
	.supplier.compact { padding: 14px 16px; border-radius: 12px; }

	.top { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(160px, 1.4fr) 130px auto 1fr; gap: 12px; align-items: center; }
	.top input { border: 1px solid transparent; border-radius: 8px; padding: 6px 8px; font: inherit; background: transparent; min-width: 0; transition: background-color 0.12s, border-color 0.12s; }
	.top input:hover:not(:disabled) { background: var(--bg); }
	.top input:focus { background: #fff; border-color: var(--line); outline: none; }
	.top .cat { font-weight: 700; font-size: 15px; color: var(--ink); }
	.top .name { color: var(--body); font-size: 14px; }
	.top-acts { justify-self: end; display: inline-flex; align-items: center; gap: 6px; }

	.status { justify-self: start; border-radius: 999px; display: inline-flex; }
	.status select { appearance: none; -webkit-appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 700; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; color: inherit; }
	.status select:disabled { cursor: default; opacity: 1; }
	.status.green { background: var(--sage-soft); color: var(--sage-deep); }
	.status.tan { background: #f0e8da; color: #9a7b53; }
	.status.neut { background: #f0ede5; color: #8a8678; }
	.chosen-badge { justify-self: start; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--sage-deep); background: var(--sage-soft); padding: 4px 10px; border-radius: 999px; white-space: nowrap; }

	.rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
	.rm:hover { color: var(--terra); }

	.filed { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding: 8px 12px; background: var(--sage-soft); border-radius: 10px; font-size: 12.5px; }
	.filed-l { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sage-deep); font-weight: 700; }
	.filed select { border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 200px; }
	.filed-link { color: var(--sage-deep); font-weight: 600; text-decoration: none; margin-left: auto; }
	.filed-link:hover { text-decoration: underline; }
	.filed-warn { color: var(--terra); font-weight: 600; margin-left: auto; }

	.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 14px; margin-top: 14px; }
	.grid label { display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--faint); }
	.grid input, .grid select { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 0; }
	.grid input:disabled, .grid select:disabled, .top input:disabled { color: var(--body); background: transparent; border-color: transparent; }
	.grid input:disabled, .grid select:disabled { border-color: var(--line2); }

	.deposit-toggle { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: var(--body); cursor: pointer; }
	.ledger-wrap { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line2); }

	.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }
	.chip { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px; font: inherit; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--sage-deep); text-decoration: none; cursor: pointer; }
	.chip:hover { border-color: var(--sage); background: var(--sage-soft); }
	.chip :global(.ico) { flex: none; }
	.chip.dashed { border-style: dashed; }
	.booked-chip { background: var(--terra-bg); border-color: var(--terra-bg); color: var(--terra); text-transform: none; letter-spacing: 0; }
	.booked-chip:hover { border-color: var(--terra); background: var(--terra-bg); }

	.notes-area { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }
	.notes-head { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--sage-deep); font-weight: 600; }
	.notes-head :global(.ico) { flex: none; }

	@media (max-width: 820px) {
		.top { grid-template-columns: 1fr 1fr; }
		.top-acts { grid-column: 2; }
		.grid { grid-template-columns: 1fr 1fr; }
	}
</style>

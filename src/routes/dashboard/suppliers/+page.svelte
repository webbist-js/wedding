<script lang="ts">
	// Pipeline view of every supplier, grouped by stage. Editing happens in the
	// same SupplierCard the Budget expander uses; each card links back to the
	// budget line it's filed under.
	import { onMount, tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import SupplierCard, { STAGES, type SupplierRow } from '$lib/components/SupplierCard.svelte';
	import type { NoteRow } from '$lib/components/Notes.svelte';
	import { gbp, linkedConfirmed } from '$lib/money';
	let { data } = $props();

	const notes = $derived(data.notes as NoteRow[]);
	const lineById = $derived(new Map(data.lineOptions.map((l) => [l.id, l])));

	// Pipeline order: most settled first, then the ones still being chased.
	const ORDER = [...STAGES].reverse(); // Booked → Shortlisted → Quoted → Enquired → Lead
	const groups = $derived.by(() => {
		const filed = data.suppliers.filter((s) => s.budgetLineId != null);
		const out = ORDER.map((stage) => ({ key: stage, title: stage, items: filed.filter((s) => s.stage === stage) }))
			.filter((g) => g.items.length);
		const unassigned = data.suppliers.filter((s) => s.budgetLineId == null);
		if (unassigned.length) out.push({ key: 'unassigned', title: 'Unfiled', items: unassigned });
		return out;
	});

	const counts = $derived({
		booked: data.suppliers.filter((s) => s.stage === 'Booked').length,
		shortlisted: data.suppliers.filter((s) => s.stage === 'Shortlisted' || s.stage === 'Quoted').length,
		leads: data.suppliers.filter((s) => s.stage === 'Lead' || s.stage === 'Enquired').length,
		committed: data.suppliers.reduce((a, s) => a + linkedConfirmed(s), 0)
	});

	let filter = $state<string>('all');
	const visible = $derived(filter === 'all' ? groups : groups.filter((g) => g.key === filter));
	let adding = $state(false);
	let addError = $state('');

	async function add() {
		if (adding) return;
		adding = true;
		addError = '';
		let created = false;
		try {
			const res = await fetch('/dashboard/suppliers/edit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'add' })
			});
			if (!res.ok || res.redirected) throw new Error('Could not add supplier');
			const { id } = await res.json();
			created = true;
			filter = 'all';
			await invalidateAll();
			await tick();
			const card = document.getElementById(`supplier-${id}`);
			card?.scrollIntoView({ block: 'center' });
			card?.querySelector<HTMLInputElement>('input.name')?.focus({ preventScroll: true });
		} catch {
			addError = created
				? 'Supplier added, but the page could not refresh. Reload the page to see it.'
				: 'Could not add supplier. Please try again.';
		} finally {
			adding = false;
		}
	}

	onMount(() => {
		const m = location.hash.match(/^#supplier-(\d+)$/);
		if (m) requestAnimationFrame(() => document.getElementById(`supplier-${m[1]}`)?.scrollIntoView({ block: 'center' }));
	});

	const forLine = (s: SupplierRow) => (s.budgetLineId != null ? lineById.get(s.budgetLineId) : undefined);
</script>

<div class="stats">
	<div class="stat filled"><div class="v">{counts.booked}</div><div class="l">Booked</div></div>
	<div class="stat"><div class="v">{counts.shortlisted}</div><div class="l">Shortlisted / quoted</div></div>
	<div class="stat"><div class="v">{counts.leads}</div><div class="l">Leads &amp; enquiries</div></div>
	<div class="stat"><div class="v">{gbp(counts.committed)}</div><div class="l">Committed in quotes</div></div>
</div>

<div class="ctrls">
	<div class="pills" role="tablist" aria-label="Filter by stage">
		<button type="button" class:on={filter === 'all'} onclick={() => (filter = 'all')}>All</button>
		{#each groups as g}
			<button type="button" class:on={filter === g.key} class:warn={g.key === 'unassigned'} onclick={() => (filter = g.key)}>
				{g.title} <span class="n">{g.items.length}</span>
			</button>
		{/each}
	</div>
	<button type="button" class="btn primary" onclick={add} disabled={adding}>
		{adding ? 'Adding…' : '+ Add supplier'}
	</button>
</div>

{#if addError}<p class="add-error" role="alert">{addError}</p>{/if}

<p class="hint">
	Every supplier is filed under a budget line, which is where its quote and payments count. Edit here or from the
	<a href="/dashboard/budget">Budget</a> — it's the same card.
</p>

{#each visible as g (g.key)}
	<section class="group">
		<h3 class="ktitle" class:warn={g.key === 'unassigned'}>
			<span>{g.title}</span>
			<span class="kcount">{g.items.length} {g.items.length === 1 ? 'supplier' : 'suppliers'}</span>
			{#if g.key === 'unassigned'}
				<span class="knote">Not counted anywhere yet — pick a budget line on each card</span>
			{/if}
		</h3>
		<div class="list">
			{#each g.items as s (s.id)}
				{@const line = forLine(s)}
				<div class="entry">
					<p class="for">
						{#if line}
							for <a href={`/dashboard/budget#line-${line.id}`}><b>{line.category}</b> · {line.section} →</a>
						{:else}
							<span class="unfiled">Unfiled</span>
						{/if}
					</p>
					<SupplierCard
						supplier={s}
						showLine
						payments={data.payments.filter((p) => p.vendorId === s.id)}
						appointments={data.appointments}
						notes={notes.filter((n) => n.entityId === s.id)}
						lineOptions={data.lineOptions}
					/>
				</div>
			{/each}
		</div>
	</section>
{/each}

<style>
	.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 18px; }
	.stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 22px; }
	.stat.filled { background: var(--sage); border-color: var(--sage); }
	.stat.filled .v, .stat.filled .l { color: #fff; }
	.stat .v { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); line-height: 1; }
	.stat .l { font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; font-size: 10px; color: var(--muted); margin-top: 8px; }

	.ctrls { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px; }
	.pills { display: flex; gap: 6px; flex-wrap: wrap; }
	.pills button { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; color: var(--muted); cursor: pointer; }
	.pills button.on { background: var(--sage); border-color: var(--sage); color: #fff; }
	.pills button.warn:not(.on) { color: var(--terra); border-color: #ecd9cf; }
	.pills .n { opacity: 0.75; font-weight: 500; margin-left: 3px; }
	.btn { border: 0; border-radius: 8px; padding: 10px 18px; font: inherit; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
	.btn.primary { background: var(--sage); color: #fff; }
	.btn.primary:hover { background: var(--sage-deep); }
	.btn:disabled { opacity: 0.65; cursor: wait; }
	.add-error { color: var(--terra); font-size: 13px; margin: 0 0 12px; }
	.hint { font-size: 13px; color: var(--muted); margin: 0 0 22px; line-height: 1.6; }

	.group { margin-bottom: 26px; }
	.ktitle { display: flex; align-items: baseline; gap: 10px; margin: 0 2px 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 11.5px; color: var(--ink); flex-wrap: wrap; }
	.ktitle.warn span:first-child { color: var(--terra); }
	.kcount { color: var(--faint); font-weight: 500; letter-spacing: 0.04em; text-transform: none; font-size: 11.5px; }
	.knote { margin-left: auto; color: var(--terra); font-weight: 500; letter-spacing: 0.02em; text-transform: none; font-size: 12px; }
	.list { display: flex; flex-direction: column; gap: 14px; }
	.entry { display: grid; gap: 4px; }
	.for { margin: 0 4px; font-size: 11.5px; color: var(--muted); }
	.for a { color: var(--sage-deep); text-decoration: none; }
	.for a:hover { text-decoration: underline; }
	.for b { color: var(--ink); }
	.unfiled { color: var(--terra); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; font-size: 10px; }
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import GuestReport, { type AttentionKey } from '$lib/components/guests/GuestReport.svelte';
	import HouseholdTable from '$lib/components/guests/HouseholdTable.svelte';
	import HouseholdPanel from '$lib/components/guests/HouseholdPanel.svelte';
	import { guestReport, householdSummary, type HouseholdStatus } from '$lib/guest-report';
	let { data } = $props();

	// ---- Reporting (pure, see lib/guest-report.ts)
	const rows = $derived(data.households.map((h) => ({ h, s: householdSummary(h) })));
	const report = $derived(guestReport(data.households));

	// ---- Filters
	let q = $state('');
	let status = $state<'all' | HouseholdStatus>('all');
	let side = $state<'all' | 'B' | 'G'>('all');
	let attention = $state<AttentionKey | null>(null);

	const passesAttention = (h: (typeof data.households)[number]) => {
		if (attention === 'noAddress') return !h.address?.trim();
		if (attention === 'noContact') return !h.email?.trim() && !h.phone?.trim();
		if (attention === 'inviteNotSent') return !h.inviteSentAt;
		return true;
	};
	const filtered = $derived(
		rows.filter(({ h, s }) => {
			if (status !== 'all' && s.rsvp.status !== status) return false;
			if (side !== 'all' && s.side !== side && s.side !== 'X') return false;
			if (!passesAttention(h)) return false;
			if (!q) return true;
			const needle = q.toLowerCase();
			return h.name.toLowerCase().includes(needle) || h.members.some((m) => m.name.toLowerCase().includes(needle));
		})
	);
	const counts = $derived({
		awaiting: rows.filter((r) => r.s.rsvp.status === 'awaiting').length,
		replied: rows.filter((r) => r.s.rsvp.status === 'replied').length,
		declined: rows.filter((r) => r.s.rsvp.status === 'declined').length
	});

	// ---- Selection (master–detail). #h-<id> deep-links to a household.
	let selectedId = $state<number | null>(null);
	const selected = $derived(rows.find((r) => r.h.id === selectedId) ?? null);
	let panelEl = $state<HTMLElement | null>(null);
	function select(id: number) {
		selectedId = id;
		history.replaceState(null, '', `#h-${id}`);
		// On narrow screens the panel sits below the table — bring it into view.
		if (window.matchMedia('(max-width: 1000px)').matches) {
			requestAnimationFrame(() => panelEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
		}
	}
	onMount(() => {
		const m = location.hash.match(/^#h-(\d+)$/);
		if (m && rows.some((r) => r.h.id === Number(m[1]))) {
			selectedId = Number(m[1]);
			requestAnimationFrame(() => document.getElementById(`h-${m[1]}`)?.scrollIntoView({ block: 'center' }));
		}
	});

	// ---- Add-household modal
	let showAdd = $state(false);
	let addName = $state('');

	// <main> carries a persistent load-animation transform, which makes it the
	// containing block for position:fixed children — so the modal would centre
	// on the list, not the viewport. Reparent it to the SvelteKit app root.
	function portal(node: HTMLElement) {
		let root: HTMLElement = node;
		while (root.parentElement && root.parentElement !== document.body) root = root.parentElement;
		root.appendChild(node);
		return { destroy() { node.remove(); } };
	}
</script>

<GuestReport {report} {attention} onAttention={(k) => (attention = attention === k ? null : k)} />

<div class="ctrls">
	<label class="srch">
		<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
		<input bind:value={q} placeholder="Search households or names…" aria-label="Search" />
	</label>
	<div class="pills" role="group" aria-label="Filter by RSVP status">
		<button type="button" class:on={status === 'all'} onclick={() => (status = 'all')}>All <span class="n">{rows.length}</span></button>
		<button type="button" class:on={status === 'awaiting'} onclick={() => (status = 'awaiting')}>Awaiting <span class="n">{counts.awaiting}</span></button>
		<button type="button" class:on={status === 'replied'} onclick={() => (status = 'replied')}>Replied <span class="n">{counts.replied}</span></button>
		<button type="button" class:on={status === 'declined'} onclick={() => (status = 'declined')}>Declined <span class="n">{counts.declined}</span></button>
	</div>
	<div class="pills" role="group" aria-label="Filter by side">
		<button type="button" class:on={side === 'all'} onclick={() => (side = 'all')}>Both sides</button>
		<button type="button" class:on={side === 'B'} onclick={() => (side = 'B')}>Bride</button>
		<button type="button" class:on={side === 'G'} onclick={() => (side = 'G')}>Groom</button>
	</div>
	<button type="button" class="btn primary" onclick={() => (showAdd = true)}>+ Add household</button>
</div>

{#if attention}
	<p class="attn-note">
		Showing households with <b>{attention === 'noAddress' ? 'no postal address' : attention === 'noContact' ? 'no email or phone' : 'no invite sent'}</b>
		· <button type="button" class="clear" onclick={() => (attention = null)}>clear</button>
	</p>
{/if}

<div class="split">
	<HouseholdTable
		rows={filtered.map(({ h, s }) => ({ id: h.id, name: h.name, summary: s }))}
		total={rows.length}
		{selectedId}
		onSelect={select}
	/>
	<aside class="side" bind:this={panelEl}>
		{#if selected}
			<HouseholdPanel
				household={selected.h}
				summary={selected.s}
				relationshipGroups={data.relationshipGroups}
				others={data.households.filter((g) => g.id !== selected.h.id).map((g) => ({ id: g.id, name: g.name }))}
				base={data.base}
			/>
		{:else}
			<div class="hint">
				<p class="hint-title">Pick a household</p>
				<p>Select a row to edit its guests, contact details and invite, or mark the invite as sent.</p>
			</div>
		{/if}
	</aside>
</div>

{#if showAdd}
	<div class="overlay" role="presentation" use:portal onclick={(e) => { if (e.target === e.currentTarget) showAdd = false; }}>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Add household">
			<h2>Add household</h2>
			<form
				method="POST"
				action="?/addGroup"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							showAdd = false;
							addName = '';
							q = '';
							status = 'all';
							side = 'all';
							attention = null;
							const id = (result.data as { added?: number } | undefined)?.added;
							if (id) select(id);
						}
					};
				}}
			>
				<label class="f">
					<span>Household name *</span>
					<input name="name" bind:value={addName} placeholder="e.g. The Smiths" required />
				</label>
				<div class="grid2">
					<label class="f">
						<span>First guest (optional)</span>
						<input name="firstGuest" placeholder="Add one guest now…" />
					</label>
					<label class="f">
						<span>Side</span>
						<select name="side">
							<option value="X">Both</option>
							<option value="B">Bride</option>
							<option value="G">Groom</option>
						</select>
					</label>
				</div>
				<label class="f">
					<span>Address</span>
					<textarea name="address" rows="2" placeholder="Postal address for invitations…"></textarea>
				</label>
				<div class="grid2">
					<label class="f"><span>Email</span><input name="email" type="email" placeholder="—" /></label>
					<label class="f"><span>Phone</span><input name="phone" placeholder="—" /></label>
				</div>
				<div class="modal-actions">
					<button type="button" class="btn ghost" onclick={() => (showAdd = false)}>Cancel</button>
					<button type="submit" class="btn primary" disabled={!addName.trim()}>Add household</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.ctrls { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
	.srch { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; padding: 0 12px; background: var(--card); color: var(--faint); }
	.srch input { flex: 1; border: 0; background: transparent; padding: 10px 0; font: inherit; font-size: 14px; color: var(--ink); min-width: 0; }
	.srch input:focus { outline: none; }
	.srch:focus-within { border-color: var(--sage); }
	.pills { display: inline-flex; gap: 2px; background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 3px; }
	.pills button { border: 0; background: transparent; border-radius: 999px; padding: 6px 11px; font: inherit; font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; color: var(--muted); cursor: pointer; white-space: nowrap; }
	.pills button.on { background: var(--sage-soft); color: var(--sage-deep); }
	.pills .n { opacity: 0.7; font-weight: 500; margin-left: 2px; }
	.btn { border: 0; border-radius: 8px; padding: 10px 18px; font: inherit; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
	.btn.primary { background: var(--sage); color: #fff; }
	.btn.primary:hover { background: var(--sage-deep); }
	.btn.ghost { background: transparent; color: var(--sage-deep); border: 1px solid var(--line); }
	.btn:disabled { opacity: 0.5; cursor: default; }
	.attn-note { margin: -4px 2px 12px; font-size: 12.5px; color: var(--body); }
	.attn-note b { color: var(--terra); }
	.clear { background: none; border: 0; padding: 0; font: inherit; font-size: 12.5px; color: var(--sage-deep); cursor: pointer; text-decoration: underline; }

	.split { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(340px, 1fr); gap: 16px; align-items: start; }
	.side { position: sticky; top: 16px; }
	.hint { background: var(--card); border: 1px dashed var(--line); border-radius: 14px; padding: 28px 22px; color: var(--muted); font-size: 13px; line-height: 1.6; }
	.hint-title { margin: 0 0 6px; font-family: var(--serif); font-size: 20px; color: var(--ink); }
	.hint p { margin: 0; }

	@media (max-width: 1000px) {
		.split { grid-template-columns: 1fr; }
		.side { position: static; scroll-margin-top: 70px; }
	}

	/* ---------------- Add-household modal ---------------- */
	.overlay { position: fixed; inset: 0; background: rgba(33, 31, 26, 0.4); display: grid; place-items: center; padding: 20px; z-index: 100; }
	.modal { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 24px 24px 20px; width: 100%; max-width: 520px; box-shadow: 0 24px 60px rgba(33, 31, 26, 0.22); max-height: 90vh; overflow: auto; }
	.modal h2 { font-family: var(--serif); font-weight: 600; font-size: 24px; margin: 0 0 16px; color: var(--ink); }
	.modal .f { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
	.modal .f > span { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
	.modal input, .modal select, .modal textarea { border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; font: inherit; font-size: 14px; background: #fff; color: var(--ink); width: 100%; box-sizing: border-box; resize: vertical; }
	.modal .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
	@media (max-width: 520px) { .modal .grid2 { grid-template-columns: 1fr; } }
</style>

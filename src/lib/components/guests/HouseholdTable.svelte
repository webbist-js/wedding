<script lang="ts">
	// Compact household table — one row per household, click to select.
	import type { HouseholdSummary } from '$lib/guest-report';

	export interface TableRow {
		id: number;
		name: string;
		summary: HouseholdSummary;
	}

	let {
		rows,
		total,
		selectedId,
		onSelect
	}: { rows: TableRow[]; total: number; selectedId: number | null; onSelect: (id: number) => void } = $props();

	const SIDE: Record<string, string> = { B: 'Bride', G: 'Groom', X: 'Both' };
</script>

<div class="table" role="table" aria-label="Households">
	<div class="tr head" role="row">
		<span>Household</span><span>Side</span><span>Invited to</span><span>Contact</span><span>RSVP</span>
	</div>
	{#each rows as r (r.id)}
		<button type="button" class="tr" class:sel={selectedId === r.id} id={`h-${r.id}`} onclick={() => onSelect(r.id)} aria-pressed={selectedId === r.id}>
			<span class="who">
				<span class="name">{r.name}</span>
				{#if r.summary.subline}<span class="sub">{r.summary.subline}</span>{/if}
			</span>
			<span class="side">{SIDE[r.summary.side]}</span>
			<span class="inv">
				{#if r.summary.invited.day}<i class="pill">{r.summary.invited.day} Day</i>{/if}
				{#if r.summary.invited.eve}<i class="pill">{r.summary.invited.eve} Eve</i>{/if}
			</span>
			<span class="contact">
				<i class:on={r.summary.contact.post} title={r.summary.contact.post ? 'Postal address on file' : 'No postal address'}>Post</i>
				<i class:on={r.summary.contact.email} title={r.summary.contact.email ? 'Email on file' : 'No email'}>Email</i>
				<i class:on={r.summary.contact.tel} title={r.summary.contact.tel ? 'Phone on file' : 'No phone'}>Tel</i>
			</span>
			<span class={`rsvp ${r.summary.rsvp.status}`}>
				<span class="dots" aria-hidden="true">
					{#each r.summary.rsvp.dots as d, i (i)}<i class={`d ${d}`}></i>{/each}
				</span>
				{r.summary.rsvp.label}
			</span>
		</button>
	{:else}
		<p class="empty">No households match these filters.</p>
	{/each}
	<div class="foot">{rows.length} of {total} households</div>
</div>

<style>
	.table { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
	.tr { display: grid; grid-template-columns: minmax(200px, 2.2fr) 70px 110px 150px minmax(140px, 1fr); gap: 10px; align-items: center; padding: 10px 18px; border-bottom: 1px solid var(--line2); width: 100%; text-align: left; background: transparent; border-left: 0; border-right: 0; border-top: 0; font: inherit; color: inherit; }
	button.tr { cursor: pointer; transition: background-color 0.12s; scroll-margin-top: 90px; }
	button.tr:hover { background: var(--bg); }
	button.tr.sel { background: var(--sage-soft); box-shadow: inset 3px 0 0 var(--sage); }
	.tr.head { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 18px 9px; border-bottom: 1px solid var(--line); }
	.who { display: grid; gap: 1px; min-width: 0; }
	.name { font-family: var(--serif); font-weight: 500; font-size: 17px; color: var(--ink); line-height: 1.2; }
	.sub { font-size: 11.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.side { font-size: 12.5px; color: var(--body); }
	.inv { display: flex; gap: 4px; flex-wrap: wrap; }
	.pill { font-style: normal; font-size: 10.5px; font-weight: 600; background: var(--sage-soft); color: var(--sage-deep); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
	.contact { display: flex; gap: 4px; }
	.contact i { font-style: normal; font-size: 9.5px; letter-spacing: 0.04em; border: 1px solid var(--line2); color: var(--faint); border-radius: 6px; padding: 2px 6px; }
	.contact i.on { background: var(--sage-soft); border-color: var(--sage-soft); color: var(--sage-deep); font-weight: 600; }
	.rsvp { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); white-space: nowrap; }
	.rsvp.replied { color: var(--sage-deep); font-weight: 600; }
	.rsvp.declined { color: var(--terra); font-weight: 600; }
	.dots { display: inline-flex; gap: 3px; }
	.d { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--rule); box-sizing: border-box; display: inline-block; }
	.d.yes { background: var(--sage-deep); border-color: var(--sage-deep); }
	.d.no { background: var(--terra); border-color: var(--terra); }
	.empty { margin: 0; padding: 22px 18px; color: var(--muted); font-style: italic; font-size: 13px; }
	.foot { padding: 10px 18px; font-size: 11.5px; color: var(--muted); }
	@media (max-width: 760px) {
		.tr { grid-template-columns: 1fr auto; row-gap: 4px; padding: 10px 14px; }
		.tr.head { display: none; }
		.side, .inv, .contact { display: none; }
	}
</style>

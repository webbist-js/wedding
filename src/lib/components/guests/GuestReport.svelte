<script lang="ts">
	// The three report cards above the guest list: RSVP progress, headline
	// stats, and what needs chasing. Attention rows double as table filters.
	import type { GuestReport } from '$lib/guest-report';
	export type AttentionKey = keyof GuestReport['attention'];

	let {
		report,
		attention,
		onAttention
	}: { report: GuestReport; attention: AttentionKey | null; onAttention: (k: AttentionKey) => void } = $props();

	const r = $derived(report);
	const pct = (n: number) => (r.rsvp.total ? (100 * n) / r.rsvp.total : 0);
	const ATTN: { key: AttentionKey; label: string }[] = [
		{ key: 'noAddress', label: 'No postal address' },
		{ key: 'noContact', label: 'No email or phone' },
		{ key: 'inviteNotSent', label: 'Invite not sent' }
	];
</script>

<div class="report">
	<section class="card rsvps">
		<div class="head">
			<span class="kicker">RSVPs</span>
			<span class="meta">{r.rsvp.replied} of {r.rsvp.total} replied</span>
		</div>
		<p class="big"><b>{r.rsvp.yes}</b> attending so far</p>
		<div class="track" role="img" aria-label={`${r.rsvp.yes} yes, ${r.rsvp.no} declined, ${r.rsvp.pending} awaiting`}>
			<span class="seg yes" style={`width:${pct(r.rsvp.yes)}%`}></span>
			<span class="seg no" style={`width:${pct(r.rsvp.no)}%`}></span>
		</div>
		<div class="legend">
			<span><i class="dot yes"></i> {r.rsvp.yes} yes</span>
			<span><i class="dot no"></i> {r.rsvp.no} declined</span>
			<span><i class="dot pending"></i> {r.rsvp.pending} awaiting</span>
		</div>
	</section>

	<section class="card stats">
		<div class="st"><b>{r.stats.guests}</b><span>Guests</span></div>
		<div class="st"><b>{r.stats.day} <i>/</i> {r.stats.evening}</b><span>Day / evening</span></div>
		<div class="st"><b>{r.stats.households}</b><span>Households</span></div>
		<div class="st"><b>{r.stats.children}</b><span>Children</span></div>
		<div class="st"><b>{r.stats.plusOnes}</b><span>Plus-ones</span></div>
		<div class="st"><b>{r.stats.bride} <i>/</i> {r.stats.groom}</b><span>Bride / groom</span></div>
	</section>

	<section class="card attn">
		<span class="kicker">Needs attention</span>
		<ul>
			{#each ATTN as a (a.key)}
				{@const n = r.attention[a.key]}
				<li>
					<button type="button" class:on={attention === a.key} class:zero={n === 0} aria-pressed={attention === a.key} onclick={() => onAttention(a.key)} title={n ? `Show only these households` : 'Nothing to chase'}>
						<span>{a.label}</span><b>{n}</b>
					</button>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.report { display: grid; grid-template-columns: minmax(280px, 1.1fr) minmax(380px, 1.7fr) minmax(260px, 1fr); gap: 0; margin-bottom: 18px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
	.card { padding: 18px 22px; }
	.card + .card { border-left: 1px solid var(--line2); }
	.kicker { font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 10px; color: var(--muted); }
	.head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
	.meta { font-size: 11.5px; color: var(--muted); }
	.big { margin: 12px 0 10px; font-size: 14px; color: var(--body); display: flex; align-items: baseline; gap: 8px; }
	.big b { font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1; color: var(--sage-deep); }
	.track { display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: var(--line2); }
	.seg { display: block; height: 100%; }
	.seg.yes { background: var(--sage-deep); }
	.seg.no { background: var(--terra); opacity: 0.8; }
	.legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 11.5px; color: var(--body); }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
	.dot.yes { background: var(--sage-deep); }
	.dot.no { background: var(--terra); }
	.dot.pending { background: transparent; border: 1.5px solid var(--rule); box-sizing: border-box; }

	.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 18px; align-content: center; }
	.st { display: grid; gap: 4px; }
	.st b { font-family: var(--serif); font-weight: 600; font-size: 26px; line-height: 1; color: var(--ink); }
	.st b i { font-style: normal; color: var(--rule); font-weight: 400; margin: 0 2px; }
	.st span { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 500; }

	.attn ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
	.attn button { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid var(--line); background: var(--bg); border-radius: 9px; padding: 8px 12px; font: inherit; font-size: 12.5px; color: var(--ink); cursor: pointer; text-align: left; }
	.attn button b { color: var(--terra); font-variant-numeric: tabular-nums; }
	.attn button:hover { border-color: var(--sage); }
	.attn button.on { background: var(--sage-soft); border-color: var(--sage); }
	.attn button.zero { color: var(--muted); }
	.attn button.zero b { color: var(--sage-deep); }

	@media (max-width: 1100px) {
		.report { grid-template-columns: 1fr 1fr; }
		.attn { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line2); }
	}
	@media (max-width: 700px) {
		.report { grid-template-columns: 1fr; }
		.card + .card { border-left: 0; border-top: 1px solid var(--line2); }
		.stats { grid-template-columns: repeat(2, 1fr); }
	}
</style>

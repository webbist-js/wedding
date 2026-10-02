<script lang="ts">
	// Presentational: the "where the money is" bar, spend-by-area donut and
	// budgeted-vs-confirmed bars. All inputs come from the shared rollup.
	import { gbp } from '$lib/money';

	export interface Area {
		label: string;
		budgeted: number;
		confirmed: number;
	}

	let {
		target,
		earmark,
		confirmed,
		paid,
		areas
	}: { target: number; earmark: number; confirmed: number; paid: number; areas: Area[] } = $props();

	const overTarget = $derived(earmark - target);

	const bar = $derived.by(() => {
		const total = Math.max(target, earmark, confirmed, 1);
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

	const AREA_COLOURS = ['#6f7d59', '#c2a18a', '#b05c3f', '#7e74a8', '#c08a86', '#cbbd9e'];
	const sorted = $derived([...areas].sort((a, b) => b.budgeted - a.budgeted));
	const areaTotal = $derived(Math.max(1, sorted.reduce((a, x) => a + x.budgeted, 0)));

	// Donut geometry: r=54, stroke=17 in a 140 viewBox.
	const R = 54;
	const CIRC = 2 * Math.PI * R;
	const donutSegs = $derived.by(() => {
		let cum = 0;
		return sorted.map((a, i) => {
			const frac = a.budgeted / areaTotal;
			const seg = { frac, offset: cum, colour: AREA_COLOURS[i % AREA_COLOURS.length] };
			cum += frac;
			return seg;
		});
	});
	const short = (n: number) => (n >= 1000 ? `£${Math.round(n / 1000)}k` : gbp(n));
</script>

<section class="card moneybar">
	<div class="mb-head">
		<span class="kicker">Where the money is</span>
		<span class="mb-caption">
			{gbp(earmark)} earmarked against a {gbp(target)} target —
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
				{#each sorted as a, i}
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
			{#each sorted as a, i}
				{@const over = a.budgeted > 0 && a.confirmed > a.budgeted}
				<div class="vs-row">
					<div class="vs-meta">
						<span>{a.label}</span>
						<span class="vs-nums" class:over>{gbp(a.confirmed)} / {gbp(a.budgeted)}</span>
					</div>
					<div class="vs-track" class:over>
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

<style>
	.kicker { font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 10.5px; color: var(--muted); }
	.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; }
	.moneybar { padding: 16px 20px 18px; margin-bottom: 18px; }
	.mb-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
	.mb-caption { font-size: 12.5px; color: var(--muted); }
	.mb-caption strong.warning { color: var(--terra); }
	.mb-track { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--line2); }
	.seg.paid { background: var(--sage-deep); }
	.seg.confirmed { background: var(--sage); opacity: 0.55; }
	.seg.estimated { background: var(--rule); opacity: 0.5; }
	.mb-legend { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 10px; font-size: 12px; color: var(--body); }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 2.5px; margin-right: 5px; vertical-align: baseline; }
	.dot.paid { background: var(--sage-deep); }
	.dot.confirmed { background: var(--sage); opacity: 0.55; }
	.dot.estimated { background: var(--rule); opacity: 0.6; }

	.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; margin-bottom: 18px; }
	.chart { padding: 16px 20px 18px; }
	.donut-wrap { display: flex; align-items: center; gap: 22px; margin-top: 14px; flex-wrap: wrap; }
	.donut { width: 150px; height: 150px; flex: none; }
	.donut-total { font-family: var(--serif); font-weight: 600; font-size: 22px; fill: var(--ink); }
	.donut-sub { font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted); }
	.area-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; flex: 1; min-width: 180px; }
	.area-legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--body); }
	.al-label { flex: 1; }
	.area-legend strong { color: var(--ink); font-variant-numeric: tabular-nums; }
	.vs-bars { display: grid; gap: 13px; margin-top: 16px; }
	.vs-meta { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--body); margin-bottom: 5px; }
	.vs-nums { color: var(--muted); font-variant-numeric: tabular-nums; }
	.vs-nums.over { color: var(--terra); font-weight: 600; }
	.vs-track { height: 7px; border-radius: 999px; background: var(--line2); overflow: hidden; }
	.vs-track.over { box-shadow: 0 0 0 1.5px var(--terra-bg); }
	.vs-fill { height: 100%; border-radius: 999px; }
</style>

<script lang="ts">
	import { CURRENT_BUDGET, GIFTS_TOTAL, HOST_CONTRIBUTION, ACCOMMODATION_TOTAL, EXTRAS_TOTAL, FOOD_ACTIVITY_POT, group, gbp, gbpShort } from '$lib/cp-trip';
	const rows = CURRENT_BUDGET.lines.map((line) => ({
		label: group(line.group).label,
		own: line.total - line.giftsGiven,
		gift: line.giftReceived
	}));
	const max = Math.max(...rows.map((r) => r.own + r.gift));
	const spending = [
		{ label: 'Accommodation', value: ACCOMMODATION_TOTAL, color: 'var(--moss)' },
		{ label: 'Alex & Katie’s gym + bikes', value: EXTRAS_TOTAL, color: 'var(--ember)' },
		{ label: 'Food + activities pot', value: FOOD_ACTIVITY_POT, color: 'var(--pot-blue)' }
	];
</script>

<div class="budget-charts">
	<section aria-labelledby="contributions-chart-title">
		<h3 id="contributions-chart-title">Who covers each share</h3>
		<p class="fine">Each bar is that group’s real share. Alex & Katie’s {gbpShort(HOST_CONTRIBUTION)} is {gbp(HOST_CONTRIBUTION - GIFTS_TOTAL)} on their row plus the {gbp(GIFTS_TOTAL)} of gifts below. Gifts are counted once.</p>
		<div class="legend"><span><i class="own"></i>Paid by the group</span><span><i class="gift"></i>Gift from Alex & Katie</span></div>
		{#each rows as row}
			<div class="chart-row">
				<div class="row-label"><span>{row.label}</span><b>{gbpShort(row.own)}</b></div>
				<div class="track" role="img" aria-label={`${row.label}: ${gbp(row.own)} paid themselves${row.gift ? ` plus ${gbp(row.gift)} covered by Alex & Katie` : ''}`}>
					<span class="own" style:width={`${row.own / max * 100}%`}></span>
					<span class="gift" style:width={`${row.gift / max * 100}%`}></span>
				</div>
			</div>
		{/each}
	</section>
	<section aria-labelledby="spending-chart-title">
		<h3 id="spending-chart-title">Where the {gbp(CURRENT_BUDGET.total)} goes</h3>
		<div class="track spending" role="img" aria-label={spending.map((s) => `${s.label}: ${gbp(s.value)}`).join('; ')}>
			{#each spending as item}<span style:width={`${item.value / CURRENT_BUDGET.total * 100}%`} style:background={item.color}></span>{/each}
		</div>
		<div class="spending-labels">
			{#each spending as item}<div><span><i style:background={item.color}></i>{item.label}</span><b>{gbp(item.value)}</b></div>{/each}
		</div>
		<p class="fine">The shared pot is the planned remainder after everyone pays, not cash already collected.</p>
	</section>
</div>

<style>
	.budget-charts { --pot-blue: #4f6f9b; display: grid; gap: 32px; margin-top: 28px; }
	h3 { font: 700 25px/1.2 var(--f-display); margin-bottom: 10px; }
	.fine { font-size: 13px; color: var(--muted); line-height: 1.6; }
	.legend { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; font-size: 13px; }
	.legend span, .spending-labels span { display: flex; align-items: center; gap: 8px; }
	i { display: inline-block; width: 12px; height: 12px; flex-shrink: 0; }
	.own { background: var(--moss); }
	.gift { background: var(--sun); }
	.chart-row { margin-top: 16px; }
	.row-label { display: flex; justify-content: space-between; gap: 6px 16px; flex-wrap: wrap; margin-bottom: 6px; font-size: 14px; }
	b { font-variant-numeric: tabular-nums; }
	.track { display: flex; height: 18px; background: var(--paper-2); overflow: hidden; border-radius: 3px; }
	.spending { height: 30px; margin-block: 16px; }
	.spending-labels { display: grid; gap: 10px; margin-bottom: 12px; }
	.spending-labels > div { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
</style>

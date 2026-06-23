<script lang="ts">
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import Rule from '$lib/components/Rule.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	let { data } = $props();

	const pad = (n: number) => String(n).padStart(2, '0');
	const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const todayISO = iso(new Date());

	// Month being viewed (defaults to the month of the first upcoming appointment,
	// otherwise the current month).
	const start = data.appointments.find((a) => a.date >= todayISO)?.date ?? todayISO;
	const startD = new Date(start + 'T00:00:00');
	let viewY = $state(startD.getFullYear());
	let viewM = $state(startD.getMonth()); // 0-11

	const monthLabel = $derived(
		new Date(viewY, viewM, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
	);

	const byDate = $derived.by(() => {
		const map: Record<string, typeof data.appointments> = {};
		for (const a of data.appointments) (map[a.date] ??= []).push(a);
		return map;
	});

	const cells = $derived.by(() => {
		const first = new Date(viewY, viewM, 1);
		const startDow = (first.getDay() + 6) % 7; // Monday = 0
		return Array.from({ length: 42 }, (_, i) => {
			const d = new Date(viewY, viewM, 1 - startDow + i);
			return { isoDate: iso(d), day: d.getDate(), inMonth: d.getMonth() === viewM };
		});
	});

	function shift(delta: number) {
		const d = new Date(viewY, viewM + delta, 1);
		viewY = d.getFullYear();
		viewM = d.getMonth();
	}

	// New-appointment form state (date prefilled when a day is clicked, or from ?date=).
	let newDate = $state(page.url.searchParams.get('date') ?? todayISO);
	const prefillSupplier = page.url.searchParams.get('supplier') ?? '';

	function fmt(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const upcoming = $derived(data.appointments.filter((a) => a.date >= todayISO));
	const past = $derived(data.appointments.filter((a) => a.date < todayISO));
</script>

<SectionHeading>Calendar</SectionHeading>
<Rule />

<!-- ===== Month grid ===== -->
<div class="cal-head">
	<button class="nav" onclick={() => shift(-1)} aria-label="Previous month">‹</button>
	<h3>{monthLabel}</h3>
	<button class="nav" onclick={() => shift(1)} aria-label="Next month">›</button>
	<button class="today-btn" onclick={() => { const d = new Date(); viewY = d.getFullYear(); viewM = d.getMonth(); }}>
		Today
	</button>
</div>

<div class="grid">
	{#each dows as d}<div class="dow">{d}</div>{/each}
	{#each cells as c (c.isoDate)}
		<button
			type="button"
			class="cell"
			class:dim={!c.inMonth}
			class:today={c.isoDate === todayISO}
			class:selected={c.isoDate === newDate}
			onclick={() => (newDate = c.isoDate)}
			title="Add an appointment on this day"
		>
			<span class="num">{c.day}</span>
			{#each byDate[c.isoDate] ?? [] as a (a.id)}
				<span class="chip" title={a.title}>
					{#if a.time}<b>{a.time}</b> {/if}{a.title}
				</span>
			{/each}
		</button>
	{/each}
</div>

<!-- ===== Add appointment ===== -->
<div class="card add-card">
	<h3 class="card-title">Book an appointment</h3>
	<form method="POST" action="?/add" use:enhance class="apptform">
		<label class="f f-title"><span>What</span>
			<input name="title" placeholder="e.g. Florist consultation" required />
		</label>
		<label class="f"><span>Date</span>
			<input name="date" type="date" bind:value={newDate} required />
		</label>
		<label class="f"><span>Time</span>
			<input name="time" placeholder="e.g. 2.30pm" />
		</label>
		<label class="f"><span>Supplier</span>
			<select name="supplierId">
				<option value="">— None —</option>
				{#each data.suppliers as s (s.id)}
					<option value={s.id} selected={String(s.id) === prefillSupplier}>
						{s.category}{s.name ? ` · ${s.name}` : ''}
					</option>
				{/each}
			</select>
		</label>
		<label class="f f-loc"><span>Location</span>
			<input name="location" placeholder="Where" />
		</label>
		<label class="f f-notes"><span>Notes</span>
			<input name="notes" placeholder="Anything to remember" />
		</label>
		<button class="btn primary" type="submit">+ Add</button>
	</form>
</div>

<!-- ===== Appointment list ===== -->
{#if upcoming.length}
	<h3 class="list-title">Upcoming</h3>
	<div class="card list">
		{#each upcoming as a (a.id)}
			{@render apptRow(a)}
		{/each}
	</div>
{/if}

{#if past.length}
	<h3 class="list-title muted">Past</h3>
	<div class="card list past-list">
		{#each past as a (a.id)}
			{@render apptRow(a)}
		{/each}
	</div>
{/if}

{#if !data.appointments.length}
	<p class="empty">No appointments yet. Add your first above — pick a day on the calendar to set the date.</p>
{/if}

{#snippet apptRow(a: (typeof data.appointments)[number])}
	<div class="arow">
		<div class="adate">
			<span class="ad-day">{fmt(a.date)}</span>
			{#if a.time}<span class="ad-time">{a.time}</span>{/if}
		</div>
		<form method="POST" action="?/update" use:enhance class="aedit">
			<input type="hidden" name="id" value={a.id} />
			<input name="title" value={a.title} placeholder="Title" />
			<input name="date" type="date" value={a.date} />
			<input name="time" value={a.time ?? ''} placeholder="Time" class="t" />
			<select name="supplierId">
				<option value="">— No supplier —</option>
				{#each data.suppliers as s (s.id)}
					<option value={s.id} selected={s.id === a.supplierId}>
						{s.category}{s.name ? ` · ${s.name}` : ''}
					</option>
				{/each}
			</select>
			<input name="location" value={a.location ?? ''} placeholder="Location" />
			<input name="notes" value={a.notes ?? ''} placeholder="Notes" class="n" />
			<button class="btn ghost sm" type="submit">Save</button>
		</form>
		<form method="POST" action="?/remove" use:enhance>
			<input type="hidden" name="id" value={a.id} />
			<button class="rm" type="submit" title="Delete">×</button>
		</form>
	</div>
{/snippet}

<style>
	.cal-head {
		display: flex;
		align-items: center;
		gap: 14px;
		margin: 8px 0 14px;
	}
	.cal-head h3 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 22px;
		color: var(--ink);
		margin: 0;
		min-width: 200px;
	}
	.nav {
		width: 32px;
		height: 32px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
		font-size: 18px;
		color: var(--muted);
		line-height: 1;
	}
	.nav:hover {
		border-color: var(--sage);
		color: var(--sage-deep);
	}
	.today-btn {
		margin-left: auto;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 8px;
		padding: 7px 14px;
		font: inherit;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--sage-deep);
		cursor: pointer;
	}
	.today-btn:hover {
		border-color: var(--sage);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
		margin-bottom: 28px;
	}
	.dow {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
		text-align: center;
		padding-bottom: 4px;
	}
	.cell {
		min-height: 84px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--card);
		padding: 6px;
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 3px;
		font: inherit;
		transition: border-color 0.15s ease;
	}
	.cell:hover {
		border-color: var(--sage);
	}
	.cell.dim {
		background: transparent;
		opacity: 0.45;
	}
	.cell.today {
		border-color: var(--sage);
		box-shadow: inset 0 0 0 1px var(--sage);
	}
	.cell.selected {
		background: var(--sage-soft);
		border-color: var(--sage);
	}
	.cell .num {
		font-size: 12px;
		font-weight: 600;
		color: var(--ink);
	}
	.chip {
		font-size: 10px;
		line-height: 1.25;
		background: var(--terra-bg);
		color: var(--terra);
		border-radius: 5px;
		padding: 2px 5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chip b {
		font-variant-numeric: tabular-nums;
		margin-right: 4px;
	}

	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 16px 18px;
	}
	.card-title,
	.list-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 18px;
		color: var(--ink);
		margin: 0 0 12px;
	}
	.list-title {
		margin: 26px 0 10px;
	}
	.list-title.muted {
		color: var(--muted);
	}

	.apptform {
		display: grid;
		grid-template-columns: repeat(4, 1fr) auto;
		gap: 10px;
		align-items: end;
	}
	.f {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.f > span {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
	}
	.f-title {
		grid-column: span 2;
	}
	.f-loc,
	.f-notes {
		grid-column: span 2;
	}
	.apptform input,
	.apptform select {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 7px 8px;
		font: inherit;
		font-size: 13px;
		background: #fff;
		color: var(--ink);
		width: 100%;
	}

	.btn {
		border: 0;
		border-radius: 8px;
		padding: 9px 16px;
		font: inherit;
		font-size: 12px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn.primary {
		background: var(--sage);
		color: #fff;
	}
	.btn.primary:hover {
		background: var(--sage-deep);
	}
	.btn.ghost {
		background: transparent;
		color: var(--sage-deep);
		border: 1px solid var(--line);
	}
	.btn.ghost:hover {
		border-color: var(--sage);
	}
	.btn.sm {
		padding: 6px 12px;
		font-size: 11px;
	}

	.list {
		display: flex;
		flex-direction: column;
	}
	.past-list {
		opacity: 0.7;
	}
	.arow {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--line2);
	}
	.arow:last-child {
		border-bottom: 0;
	}
	.adate {
		flex: 0 0 130px;
		display: flex;
		flex-direction: column;
	}
	.ad-day {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.ad-time {
		font-size: 11px;
		color: var(--terra);
	}
	.aedit {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		flex: 1;
	}
	.aedit input,
	.aedit select {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 12.5px;
		background: #fff;
		color: var(--ink);
		flex: 1 1 120px;
		min-width: 0;
	}
	.aedit .t {
		flex: 0 0 80px;
	}
	.aedit .n {
		flex: 2 1 160px;
	}
	.rm {
		background: none;
		border: 0;
		color: var(--faint);
		font-size: 20px;
		cursor: pointer;
		line-height: 1;
	}
	.rm:hover {
		color: var(--terra);
	}
	.empty {
		color: var(--muted);
		font-style: italic;
		padding: 20px 0;
	}

	@media (max-width: 760px) {
		.cell {
			min-height: 60px;
		}
		.apptform {
			grid-template-columns: 1fr 1fr;
		}
		.f-title,
		.f-loc,
		.f-notes {
			grid-column: span 2;
		}
	}
</style>

<script lang="ts">
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import Rule from '$lib/components/Rule.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	let { data } = $props();
	const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });

	let earmark = $derived(data.lines.reduce((a, l) => a + l.budgeted, 0));
	let confirmed = $derived(data.lines.reduce((a, l) => a + l.confirmed, 0));
	let paid = $derived(data.lines.reduce((a, l) => a + l.paid, 0));

	async function saveField(id: number, field: string, value: string | number) {
		await fetch('/dashboard/budget/line', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, field, value })
		});
	}
	async function toggleStatio(id: number, done: boolean) {
		await fetch('/dashboard/stationery', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, done })
		});
	}

	const statusOptions = ['Estimate', 'To book', 'Booked', 'Deposit', 'Paid', 'Optional'];

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
	function onDragLeave() {
		dragOverId = null;
	}
	async function onDrop(e: DragEvent, targetId: number) {
		e.preventDefault();
		dragOverId = null;
		const source = dragId;
		dragId = null;
		if (!source || source === targetId) return;
		const ids = data.lines.map((l) => l.id);
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

<SectionHeading>Budget</SectionHeading><Rule />

{@const remaining = data.target - confirmed}
{@const overBudget = remaining < 0}
{@const pctOfTarget = data.target > 0 ? Math.min(100, (confirmed / data.target) * 100) : 0}

<div class="stats">
	<form method="POST" action="?/setTarget" use:enhance class="stat stat-edit">
		<div class="v">
			<span class="prefix">£</span>
			<input
				name="target"
				type="number"
				value={data.target}
				onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
			/>
		</div>
		<div class="l">Target</div>
	</form>
	<div class="stat"><div class="v">{gbp(earmark)}</div><div class="l">Total earmarked</div></div>
	<div class="stat"><div class="v">{gbp(confirmed)}</div><div class="l">Confirmed costs</div></div>
	<div class="stat"><div class="v accent">{gbp(paid)}</div><div class="l">Paid to date</div></div>
	<div class="stat">
		<div class="v" class:warning={overBudget}>
			{overBudget ? '−' : ''}{gbp(Math.abs(remaining))}
		</div>
		<div class="l">{overBudget ? 'Over budget' : 'Remaining'}</div>
	</div>
</div>

<div class="progress" title="{gbp(confirmed)} confirmed of {gbp(data.target)}">
	<div class="progress-bar" class:warning={overBudget} style="width: {pctOfTarget}%"></div>
	<span class="progress-label">{Math.round(pctOfTarget)}% of target committed</span>
</div>

{#each data.sections as section}
	{@const sectionLines = data.lines.filter((l) => l.section === section)}
	{@const secBudgeted = sectionLines.reduce((a, l) => a + l.budgeted, 0)}
	{@const secConfirmed = sectionLines.reduce((a, l) => a + l.confirmed, 0)}
	{@const secPaid = sectionLines.reduce((a, l) => a + l.paid, 0)}
	<section class="bsection">
		<h3 class="ktitle">
			<span>{section}</span>
			<span class="kcount">{sectionLines.length} {sectionLines.length === 1 ? 'line' : 'lines'}</span>
			<span class="ktotals">
				<span>{gbp(secBudgeted)}</span>
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
				<span>Category</span>
				<span class="r">Budgeted £</span>
				<span class="r">Confirmed £</span>
				<span class="r">Paid £</span>
				<span>Status</span>
				<span>Section</span>
				<span></span>
			</div>

			{#each sectionLines as line (line.id)}
				<div
					class="row"
					class:venue={line.isVenue}
					class:drop-over={dragOverId === line.id}
					draggable={!line.isVenue}
					ondragstart={(e) => onDragStart(e, line.id)}
					ondragover={(e) => onDragOver(e, line.id)}
					ondragleave={onDragLeave}
					ondrop={(e) => onDrop(e, line.id)}
				>
					<span class="grip" aria-hidden="true">{line.isVenue ? '' : '≡'}</span>
					{#if line.isVenue}
						<span class="cat venue-cat">{line.category} <Pill tone="green">Synced</Pill></span>
						<input
							class="num"
							type="number"
							value={line.budgeted}
							onchange={(e) => saveField(line.id, 'budgeted', e.currentTarget.value)}
						/>
						<span class="readonly num">{gbp(line.confirmed)}</span>
						<input
							class="num"
							type="number"
							value={line.paid}
							onchange={(e) => saveField(line.id, 'paid', e.currentTarget.value)}
						/>
						<select
							onchange={(e) => saveField(line.id, 'status', e.currentTarget.value)}
							value={line.status}
						>
							{#each statusOptions as opt}
								<option value={opt} selected={opt === line.status}>{opt}</option>
							{/each}
						</select>
						<span class="locked">Essentials</span>
						<span></span>
					{:else}
						<input
							class="cat"
							value={line.category}
							onchange={(e) => saveField(line.id, 'category', e.currentTarget.value)}
						/>
						<input
							class="num"
							type="number"
							value={line.budgeted}
							onchange={(e) => saveField(line.id, 'budgeted', e.currentTarget.value)}
						/>
						<input
							class="num"
							type="number"
							value={line.confirmed}
							onchange={(e) => saveField(line.id, 'confirmed', e.currentTarget.value)}
						/>
						<input
							class="num"
							type="number"
							value={line.paid}
							onchange={(e) => saveField(line.id, 'paid', e.currentTarget.value)}
						/>
						<select
							onchange={(e) => saveField(line.id, 'status', e.currentTarget.value)}
							value={line.status}
						>
							{#each statusOptions as opt}
								<option value={opt} selected={opt === line.status}>{opt}</option>
							{/each}
						</select>
						<select
							onchange={(e) => saveField(line.id, 'section', e.currentTarget.value)}
							value={line.section}
						>
							{#each data.sections as s}
								<option value={s} selected={s === line.section}>{s}</option>
							{/each}
						</select>
						<form method="POST" action="?/remove" use:enhance class="rmf">
							<input type="hidden" name="id" value={line.id} />
							<button type="submit" title="Remove" aria-label="Remove">×</button>
						</form>
					{/if}
				</div>
			{/each}

			<form method="POST" action="?/add" use:enhance class="addrow">
				<input type="hidden" name="section" value={section} />
				<input name="category" placeholder={`Add a line in ${section}…`} />
				<button>+ Add</button>
			</form>

			{#if section === 'Stationery'}
				<div class="statio">
					<p class="sublabel">What you'll need (tick as you go)</p>
					<div class="statio-grid">
						{#each data.statio as item}
							<label class="statio-item">
								<input
									type="checkbox"
									checked={item.done}
									onchange={(e) =>
										toggleStatio(item.id, (e.target as HTMLInputElement).checked)}
								/>
								{item.label}
							</label>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>
{/each}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 14px;
		margin-bottom: 18px;
	}
	.stat {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 22px;
	}
	.stat .v {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		line-height: 1;
		display: flex;
		align-items: baseline;
	}
	.stat .v.accent {
		color: var(--sage);
	}
	.stat .v.warning {
		color: var(--terra);
	}
	.stat .l {
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 10.5px;
		color: var(--muted);
		margin-top: 8px;
	}
	.stat-edit {
		border: 0;
		padding: 0;
		margin: 0;
		display: block;
	}
	.stat-edit .v {
		gap: 2px;
	}
	.stat-edit .prefix {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		margin-right: 2px;
	}
	.stat-edit input {
		border: 0;
		background: transparent;
		padding: 0;
		font: inherit;
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30px;
		color: var(--ink);
		line-height: 1;
		width: 100%;
		min-width: 0;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.stat-edit input::-webkit-outer-spin-button,
	.stat-edit input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.stat-edit input:focus {
		outline: none;
		box-shadow: 0 1px 0 var(--sage);
	}

	/* Confirmed / target progress bar */
	.progress {
		position: relative;
		height: 6px;
		background: var(--line2);
		border-radius: 999px;
		margin: 0 0 28px;
		overflow: hidden;
	}
	.progress-bar {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--sage);
		border-radius: 999px;
		transition: width 0.4s ease;
	}
	.progress-bar.warning {
		background: var(--terra);
	}
	.progress-label {
		position: absolute;
		top: 10px;
		right: 0;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
	}

	.bsection {
		margin-bottom: 32px;
		margin-top: 32px;
	}
	.ktitle {
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 11.5px;
		color: var(--sage);
		margin: 0 0 12px 4px;
	}
	.ktitle .kcount {
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--faint);
		font-weight: 500;
	}
	.ktitle .ktotals {
		margin-left: auto;
		font-family: var(--serif);
		font-style: normal;
		font-size: 13px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--ink);
		font-weight: 500;
		display: inline-flex;
		gap: 6px;
		align-items: baseline;
	}
	.ktitle .ktotals .confirmed { color: var(--sage-deep); }
	.ktitle .ktotals .paid { color: var(--sage); }
	.ktitle .ktotals .sep { color: var(--faint); }
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 12px 16px;
	}

	.row {
		display: grid;
		grid-template-columns: 20px minmax(180px, 1.8fr) 100px 100px 100px 120px 140px 28px;
		gap: 10px;
		align-items: center;
		padding: 8px 4px;
		border-bottom: 1px solid var(--line2);
		border-top: 2px solid transparent;
		transition: border-color 0.12s ease, background-color 0.12s ease;
	}
	.row[draggable='true'] {
		cursor: grab;
	}
	.row[draggable='true']:active {
		cursor: grabbing;
	}
	.row.drop-over {
		border-top-color: var(--sage);
		background: var(--sage-soft);
	}
	.row .grip {
		color: var(--faint);
		font-size: 14px;
		line-height: 1;
		user-select: none;
		text-align: center;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.row:hover .grip {
		opacity: 1;
	}
	.row:last-of-type {
		border-bottom: 0;
	}
	.row.head {
		color: var(--muted);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--line);
	}
	.row.head .r {
		text-align: right;
	}
	.row input,
	.row select {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 13px;
		background: #fff;
		min-width: 0;
	}
	.row input.cat {
		font-weight: 500;
		color: var(--ink);
	}
	.row input.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.row .readonly {
		color: var(--body);
		font-variant-numeric: tabular-nums;
		padding-right: 8px;
		text-align: right;
	}
	.row .locked {
		color: var(--faint);
		font-size: 12px;
		font-style: italic;
	}
	.row.venue .venue-cat {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--ink);
	}
	.rmf {
		margin: 0;
	}
	.rmf button {
		background: none;
		border: 0;
		color: var(--faint);
		font-size: 18px;
		cursor: pointer;
		padding: 0;
	}
	.rmf button:hover {
		color: var(--terra);
	}

	.addrow {
		display: flex;
		gap: 10px;
		margin: 12px 4px 4px;
	}
	.addrow input {
		flex: 1;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
		font: inherit;
		font-size: 13px;
	}
	.addrow button {
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 8px;
		padding: 8px 14px;
		cursor: pointer;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 500;
	}

	.statio {
		margin-top: 18px;
		padding: 18px 4px 4px;
		border-top: 1px solid var(--line2);
	}
	.sublabel {
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 10.5px;
		color: var(--muted);
		margin: 0 0 12px;
	}
	.statio-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 6px 16px;
	}
	.statio-item {
		font-size: 13.5px;
		color: var(--body);
		padding: 3px 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	@media (max-width: 800px) {
		.row {
			grid-template-columns: 1fr 1fr 1fr;
			gap: 6px;
		}
		.row.head {
			display: none;
		}
	}
</style>

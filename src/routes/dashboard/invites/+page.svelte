<script lang="ts">
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import Rule from '$lib/components/Rule.svelte';
	let { data } = $props();
</script>

<div class="noprint">
	<SectionHeading>Invites &amp; QR codes</SectionHeading><Rule />
	<p class="hint">
		One card per household. Print this page to slip QR cards into your invitations. Each code opens
		that household's RSVP page.
	</p>
	<button onclick={() => window.print()}>Print all</button>
</div>

<div class="cards">
	{#each data.rows as r (r.id)}
		<div class="invite">
			<div class="qr">{@html r.qr}</div>
			<div class="who">
				<p class="eyebrow">Alex &amp; Katie · 2 April 2027</p>
				<h3 class="script">{r.name}</h3>
				<p class="members">{r.members.map((m) => m.name).join(' · ')}</p>
				<p class="status noprint">
					<span class="dot" class:done={r.responded === r.total} class:partial={r.responded > 0 && r.responded < r.total}></span>
					<span class="status-text">{r.responded}/{r.total} replied</span>
				</p>
			</div>
		</div>
	{/each}
</div>

<style>
	.hint {
		color: var(--body);
		max-width: 560px;
	}
	button {
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 8px;
		padding: 10px 18px;
		cursor: pointer;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 12px;
		margin-bottom: 24px;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 20px;
	}
	.invite {
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 22px;
		align-items: center;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 24px 26px;
		break-inside: avoid;
	}
	.qr {
		width: 150px;
		height: 150px;
	}
	.qr :global(svg) {
		width: 100%;
		height: 100%;
	}
	.who { min-width: 0; }
	.who .eyebrow {
		font-size: 9.5px;
		letter-spacing: 0.32em;
		color: var(--faint);
		margin: 0;
	}
	.who h3 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 26px;
		line-height: 1.1;
		margin: 8px 0 6px;
		color: var(--ink);
	}
	.members {
		font-size: 13px;
		color: var(--body);
		line-height: 1.5;
		margin: 0;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--rule);
	}
	.dot.partial { background: var(--tan); }
	.dot.done { background: var(--sage); }

	@media print {
		.noprint {
			display: none !important;
		}
		.cards {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}
		.invite {
			border-color: #ccc;
			padding: 18px 20px;
		}
	}
</style>

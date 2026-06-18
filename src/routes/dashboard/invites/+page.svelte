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
				<p class="eyebrow">Alex &amp; Katie · 2 Apr 2027</p>
				<h3>{r.name}</h3>
				<p class="members">{r.members.map((m) => m.name).join(', ')}</p>
				<p class="link noprint">
					{r.url} ·
					<span class:done={r.responded === r.total}>{r.responded}/{r.total} replied</span>
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
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}
	.invite {
		display: flex;
		gap: 16px;
		align-items: center;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px;
		break-inside: avoid;
	}
	.qr {
		width: 110px;
		height: 110px;
		flex: 0 0 auto;
	}
	.qr :global(svg) {
		width: 100%;
		height: 100%;
	}
	.who h3 {
		font-family: var(--serif);
		font-size: 22px;
		margin: 4px 0;
	}
	.members {
		font-size: 12.5px;
		color: var(--body);
	}
	.link {
		font-size: 11px;
		color: var(--faint);
		margin-top: 6px;
	}
	.link .done {
		color: var(--sage-deep);
	}
	@media print {
		.noprint {
			display: none !important;
		}
		.cards {
			grid-template-columns: repeat(2, 1fr);
		}
		.invite {
			border-color: #ddd;
		}
	}
</style>

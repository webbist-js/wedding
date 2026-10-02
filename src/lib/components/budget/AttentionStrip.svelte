<script lang="ts">
	import type { AttentionItem } from '$lib/attention';
	let { items }: { items: AttentionItem[] } = $props();

	const KIND_LABEL: Record<AttentionItem['kind'], string> = {
		'no-quote': 'No quote',
		'over-budget': 'Over earmark',
		'stage-mismatch': 'Stage',
		unassigned: 'Unfiled'
	};
</script>

{#if items.length}
	<section class="card attn" aria-label="Needs attention">
		<div class="head">
			<span class="kicker">Needs attention</span>
			<span class="count">{items.length} {items.length === 1 ? 'thing' : 'things'}</span>
		</div>
		<ul>
			{#each items as it}
				<li>
					<span class={`kind ${it.kind}`}>{KIND_LABEL[it.kind]}</span>
					<a href={it.href}>{it.label}</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; }
	.attn { padding: 14px 20px 12px; margin-bottom: 18px; border-color: #ecd9cf; background: #fdf8f5; }
	.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
	.kicker { font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 10.5px; color: var(--terra); }
	.count { font-size: 11.5px; color: var(--muted); }
	ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	li { display: flex; align-items: center; gap: 10px; font-size: 13px; }
	a { color: var(--ink); text-decoration: none; }
	a:hover { color: var(--terra); text-decoration: underline; }
	.kind { flex: none; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; background: var(--terra-bg); color: var(--terra); min-width: 86px; text-align: center; }
	.kind.unassigned { background: #f0e8da; color: #9a7b53; }
	.kind.stage-mismatch { background: var(--lilac-bg); color: var(--lilac); }
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let busyId = $state<number | null>(null);

	const photos = $derived(data.items.filter((i) => i.kind === 'photo').length);
	const videos = $derived(data.items.filter((i) => i.kind === 'video').length);
	const mb = $derived((data.totalBytes / 1024 / 1024).toFixed(1));

	async function itemOp(id: number, op: 'hide' | 'unhide' | 'delete') {
		if (op === 'delete' && !confirm('Delete this forever? It comes out of storage too.')) return;
		busyId = id;
		try {
			await fetch('/dashboard/gallery/item', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, op })
			});
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}

	function copy(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

<div class="stats">
	<div class="stat"><strong>{photos}</strong><span>photos</span></div>
	<div class="stat"><strong>{videos}</strong><span>videos</span></div>
	<div class="stat"><strong>{mb} MB</strong><span>stored</span></div>
</div>

<section class="card">
	<h2>The QR code</h2>
	<p class="hint">
		Print this for the venue — scanning opens the camera page and unlocks the gallery,
		no password needed. Gallery-only visitors use the link + <code>GALLERY_PASSWORD</code>.
	</p>
	<div class="row">
		<a class="btn" href="/dashboard/gallery/qr">Download print QR (circle, SVG)</a>
		<a class="btn ghost" href="/dashboard/gallery/qr?format=png">Square PNG</a>
		<button class="btn ghost" onclick={() => copy(data.snapsUrl)}>Copy upload link</button>
		<button class="btn ghost" onclick={() => copy(data.galleryUrl)}>Copy gallery link</button>
	</div>
	<form
		method="POST"
		action="?/regenerate"
		use:enhance
		onsubmit={(e) => {
			if (!confirm('Regenerate the token? Every ALREADY-PRINTED QR stops working. Only do this if the link leaked.'))
				e.preventDefault();
		}}
	>
		<button class="btn danger" type="submit">Regenerate token (kills printed QRs)</button>
		{#if form?.regenerated}<span class="done">Done — download and print the new QR.</span>{/if}
	</form>
</section>

<section class="card">
	<h2>Uploads</h2>
	{#if !data.items.length}
		<p class="hint">Nothing yet — it'll fill up fast on the day.</p>
	{/if}
	<div class="grid">
		{#each data.items as item (item.id)}
			<figure class:hidden-item={item.hidden}>
				{#if item.hidden}<span class="flag">hidden</span>{/if}
				{#if item.kind === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={item.url} preload="metadata" controls></video>
				{:else}
					<img src={item.url} alt={item.caption ?? 'Guest upload'} loading="lazy" />
				{/if}
				<figcaption>
					<span class="meta">{item.name ?? 'Anonymous'}{item.caption ? ` — ${item.caption}` : ''}</span>
					<span class="ops">
						{#if item.hidden}
							<button disabled={busyId === item.id} onclick={() => itemOp(item.id, 'unhide')}>Unhide</button>
						{:else}
							<button disabled={busyId === item.id} onclick={() => itemOp(item.id, 'hide')}>Hide</button>
						{/if}
						<button class="del" disabled={busyId === item.id} onclick={() => itemOp(item.id, 'delete')}>Delete</button>
					</span>
				</figcaption>
			</figure>
		{/each}
	</div>
</section>

<style>
	.stats {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
	}
	.stat {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 14px 18px;
		display: grid;
	}
	.stat strong {
		font-size: 22px;
		color: var(--ink);
	}
	.stat span {
		color: var(--muted);
		font-size: 13px;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 20px;
		margin-bottom: 16px;
	}
	.card h2 {
		margin: 0 0 6px;
		font-size: 17px;
	}
	.hint {
		color: var(--muted);
		font-size: 14px;
		margin: 0 0 12px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 14px;
	}
	.btn {
		display: inline-block;
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 9px;
		padding: 9px 14px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
	}
	.btn.ghost {
		background: var(--sage-soft);
		color: var(--sage-deep);
	}
	.btn.danger {
		background: var(--terra-bg);
		color: var(--terra);
	}
	.done {
		color: var(--sage-deep);
		font-size: 14px;
		margin-left: 10px;
	}
	.grid {
		columns: 4 200px;
		column-gap: 12px;
	}
	figure {
		position: relative;
		break-inside: avoid;
		margin: 0 0 12px;
		border: 1px solid var(--line2);
		border-radius: 10px;
		overflow: hidden;
	}
	figure.hidden-item {
		opacity: 0.45;
	}
	figure img,
	figure video {
		display: block;
		width: 100%;
		height: auto;
	}
	figcaption {
		padding: 8px 10px;
		font-size: 12.5px;
		display: grid;
		gap: 6px;
	}
	.meta {
		color: var(--body);
	}
	.ops {
		display: flex;
		gap: 8px;
	}
	.ops button {
		background: none;
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 3px 9px;
		font-size: 12px;
		cursor: pointer;
		color: var(--body);
	}
	.ops .del {
		color: var(--terra);
		border-color: var(--terra-bg);
	}
	.flag {
		position: absolute;
		top: 8px;
		left: 8px;
		background: var(--ink);
		color: #fff;
		font-size: 11px;
		border-radius: 6px;
		padding: 2px 7px;
	}
</style>

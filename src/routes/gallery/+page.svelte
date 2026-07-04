<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const unlocked = $derived(data.unlocked || !!form?.unlocked);

	type Item = {
		id: number;
		url: string;
		kind: 'photo' | 'video';
		name: string | null;
		caption: string | null;
		at: number | null;
	};

	let items = $state<Item[]>([]);
	let loaded = $state(false);

	async function poll() {
		try {
			const res = await fetch('/api/gallery/feed');
			if (!res.ok) return;
			const body = (await res.json()) as { items: Item[] };
			items = body.items;
			loaded = true;
		} catch {
			// transient network blip — keep showing what we have, next poll retries
		}
	}

	// $effect (not onMount) so polling starts the moment the form unlocks the
	// page without a full reload, and stops if it ever re-locks.
	$effect(() => {
		if (!unlocked) return;
		poll();
		const t = setInterval(poll, 8000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>The live album — Katie &amp; Alex</title></svelte:head>

<main class="wrap">
	{#if !unlocked}
		<div class="gate">
			<p class="eyebrow">2 April 2027 · The Tithe Barn</p>
			<h1 class="script">The live album</h1>
			<p>Psst — what’s the magic word? (It’s on your menu, or ask anyone in a nice frock.)</p>
			<form method="POST" action="?/unlock" use:enhance>
				<input type="password" name="password" placeholder="Magic word" autocomplete="off" />
				<button type="submit">Let me in</button>
			</form>
			{#if form?.wrong}<p class="oops">Not quite — try again!</p>{/if}
		</div>
	{:else}
		<header class="head">
			<p class="eyebrow">Live from The Tithe Barn</p>
			<h1 class="script">Katie &amp; Alex</h1>
			<p class="sub">
				{items.length
					? `${items.length} ${items.length === 1 ? 'memory' : 'memories'} and counting — refreshes itself, just keep watching`
					: loaded
						? 'Nothing here yet — be the first to add a photo!'
						: 'Warming up the projector…'}
			</p>
		</header>
		<div class="grid">
			{#each items as item (item.id)}
				<figure>
					{#if item.kind === 'video'}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video src={item.url} controls playsinline preload="metadata"></video>
					{:else}
						<img src={item.url} alt={item.caption ?? 'Wedding photo'} loading="lazy" />
					{/if}
					{#if item.name || item.caption}
						<figcaption>
							{#if item.caption}<span class="cap">{item.caption}</span>{/if}
							{#if item.name}<span class="who">— {item.name}</span>{/if}
						</figcaption>
					{/if}
				</figure>
			{/each}
		</div>
	{/if}
</main>

<style>
	.wrap {
		max-width: 1100px;
		margin: 0 auto;
		padding: 40px 20px 80px;
	}
	.gate {
		max-width: 420px;
		margin: 10vh auto 0;
		text-align: center;
	}
	.gate h1 {
		font-size: 52px;
		margin: 10px 0;
	}
	.gate form {
		display: grid;
		gap: 10px;
		margin-top: 20px;
	}
	.gate input {
		padding: 13px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font: inherit;
		text-align: center;
	}
	.gate button {
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 10px;
		padding: 13px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}
	.oops {
		color: var(--terra);
		margin-top: 12px;
	}
	.head {
		text-align: center;
		margin-bottom: 28px;
	}
	.head h1 {
		font-size: 56px;
		margin: 8px 0 4px;
	}
	.sub {
		color: var(--muted);
	}
	.grid {
		columns: 3 280px;
		column-gap: 14px;
	}
	figure {
		break-inside: avoid;
		margin: 0 0 14px;
		background: var(--card);
		border: 1px solid var(--line2);
		border-radius: 12px;
		overflow: hidden;
		animation: pop 0.5s ease;
	}
	figure img,
	figure video {
		display: block;
		width: 100%;
		height: auto;
	}
	figcaption {
		padding: 10px 12px;
		font-size: 14px;
		color: var(--body);
	}
	.who {
		color: var(--muted);
		font-style: italic;
		margin-left: 4px;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>

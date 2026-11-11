<script lang="ts">
	// Live days/hours/minutes/seconds to a moment. Renders the SSR value first,
	// then ticks once a second in the browser.
	import { onMount } from 'svelte';
	import { countdown } from '$lib/cp-trip';

	let { target, now: initial, label, big = false }: { target: number; now: number; label: string; big?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	let now = $state(initial);
	onMount(() => {
		now = Date.now();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});
	const c = $derived(countdown(target, now));
	const pad = (n: number) => String(n).padStart(2, '0');
</script>

<div class="cd" class:big role="timer" aria-label={`${label}: ${c.days} days, ${c.hours} hours`}>
	<div><b>{c.days}</b><span>{c.days === 1 ? 'day' : 'days'}</span></div>
	<div><b>{pad(c.hours)}</b><span>hrs</span></div>
	<div><b>{pad(c.minutes)}</b><span>mins</span></div>
	<div class="secs"><b>{pad(c.seconds)}</b><span>secs</span></div>
</div>

<style>
	.cd { display: flex; gap: 8px; }
	.cd > div { display: grid; justify-items: center; min-width: 58px; padding: 8px 6px; background: var(--paper-2); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; }
	.cd b { font: 30px/1 var(--f-display); font-weight: 800; font-variant-numeric: lining-nums tabular-nums; }
	.cd span { font: 600 9px var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: var(--gold-ink); }
	.big > div { min-width: 0; flex: 1; padding: 14px 8px 10px; border-color: var(--sun); border-radius: 6px; box-shadow: 0 12px 30px #0006; }
	.big b { font-size: clamp(44px, 9vw, 84px); }
	.big > div:first-child b { color: var(--ember); }
	@media (max-width: 420px) { .big .secs { display: none; } }
</style>

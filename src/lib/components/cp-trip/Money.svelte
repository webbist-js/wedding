<script lang="ts">
	// A money figure that rolls to its new value. Pence in, "£1,060.43" out.
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { gbp, signed } from '$lib/cp-trip';

	let { pence, sign = false }: { pence: number; sign?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	const t = new Tween(pence, { duration: 420, easing: cubicOut });
	$effect(() => {
		t.set(pence, { duration: prefersReducedMotion.current ? 0 : 420 });
	});
	const shown = $derived(Math.round(t.current));
</script>

<span class="money" aria-label={sign ? signed(pence) : gbp(pence)}><span aria-hidden="true">{sign ? signed(shown) : gbp(shown)}</span></span>

<style>
	.money { font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>

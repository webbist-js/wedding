<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import MusicPlayer from '$lib/components/MusicPlayer.svelte';
	import { initSmoothScroll } from '$lib/scrollfx';

	let { children } = $props();

	// Music only on the public guest-facing pages; the dashboard / login should stay quiet.
	const adminPrefixes = ['/dashboard', '/login', '/logout'];
	let isPublic = $derived(!adminPrefixes.some((p) => page.url.pathname.startsWith(p)));

	// Lenis smooth scrolling on the public guest pages only (not the dashboard).
	// Re-runs when crossing the public/admin boundary; persists across public navs.
	$effect(() => {
		if (!isPublic) return;
		return initSmoothScroll();
	});
	// On RSVP we render a prominent inline banner instead, so the chip would be
	// redundant. Mount as "host" so the audio element keeps playing across the
	// landing → RSVP transition.
	let isRsvp = $derived(page.url.pathname.startsWith('/rsvp/'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isPublic}<MusicPlayer variant={isRsvp ? 'host' : 'chip'} />{/if}
{@render children()}

<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import MusicPlayer from '$lib/components/MusicPlayer.svelte';

	let { children } = $props();

	// Music only on the public guest-facing pages; the dashboard / login should stay quiet.
	const adminPrefixes = ['/dashboard', '/login', '/logout'];
	let isPublic = $derived(!adminPrefixes.some((p) => page.url.pathname.startsWith(p)));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isPublic}<MusicPlayer />{/if}
{@render children()}

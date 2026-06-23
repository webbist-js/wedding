<script lang="ts">
	import { onMount } from 'svelte';
	import { attachAudio, toggleMusic, music } from '$lib/music.svelte';

	let {
		variant = 'chip' as 'chip' | 'host',
		src = '/audio/good-for-me-acoustic.mp3',
		title = 'Good For Me · Above & Beyond (Acoustic)'
	} = $props();

	let audio = $state<HTMLAudioElement | null>(null);

	onMount(() => {
		if (audio) attachAudio(audio);
	});
</script>

<audio bind:this={audio} {src} loop preload="auto" aria-hidden="true"></audio>

{#if variant === 'chip' && music.available}
	<button
		type="button"
		class="player"
		class:on={music.playing}
		onclick={toggleMusic}
		aria-label={music.playing ? 'Mute music' : 'Play music'}
		title={music.playing ? `Mute · ${title}` : `Play · ${title}`}
	>
		{#if music.playing}
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M9 18V5l12-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="16" r="3" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M9 18V5l12-2v13" opacity=".4" />
				<circle cx="6" cy="18" r="3" opacity=".4" />
				<circle cx="18" cy="16" r="3" opacity=".4" />
				<line x1="3" y1="3" x2="21" y2="21" />
			</svg>
		{/if}
	</button>
{/if}

<style>
	.player {
		position: fixed;
		bottom: 18px;
		left: 18px;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: var(--card);
		color: var(--muted);
		cursor: pointer;
		display: grid;
		place-items: center;
		z-index: 50;
		box-shadow: 0 2px 10px rgba(33, 31, 26, 0.06);
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			background-color 0.2s ease,
			transform 0.2s ease;
	}
	.player:hover {
		color: var(--sage-deep);
		border-color: var(--sage);
		transform: scale(1.05);
	}
	.player.on {
		color: var(--sage);
		border-color: var(--sage);
		background: var(--sage-soft);
	}
	.player:focus-visible {
		outline: 2px solid var(--sage);
		outline-offset: 3px;
	}

	@media (max-width: 480px) {
		.player {
			bottom: 12px;
			left: 12px;
			width: 38px;
			height: 38px;
		}
	}
</style>

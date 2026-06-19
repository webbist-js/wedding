<script lang="ts">
	import { music, toggleMusic } from '$lib/music.svelte';
</script>

{#if music.available}
	<button
		type="button"
		class="banner"
		class:playing={music.playing}
		onclick={toggleMusic}
		aria-label={music.playing ? 'Pause our first dance song' : 'Play our first dance song'}
	>
		<span class="play-btn" aria-hidden="true">
			{#if music.playing}
				<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
					<rect x="6" y="5" width="4" height="14" rx="1.2" />
					<rect x="14" y="5" width="4" height="14" rx="1.2" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
					<path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z" />
				</svg>
			{/if}
		</span>
		<span class="info">
			<span class="kick">Our first dance</span>
			<span class="track">Good For Me</span>
			<span class="artist">Above &amp; Beyond · Acoustic</span>
		</span>
		<span class="bars" aria-hidden="true">
			<span class="b"></span><span class="b"></span><span class="b"></span><span class="b"></span><span class="b"></span>
		</span>
	</button>
{/if}

<style>
	.banner {
		display: grid;
		grid-template-columns: 56px 1fr 60px;
		gap: 16px;
		align-items: center;
		width: 100%;
		max-width: 480px;
		margin: 22px auto 0;
		padding: 14px 18px 14px 14px;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 999px;
		cursor: pointer;
		font: inherit;
		text-align: left;
		color: var(--body);
		transition:
			background-color 0.25s ease,
			border-color 0.25s ease,
			box-shadow 0.25s ease;
		position: relative;
		z-index: 1;
	}
	.banner:hover {
		border-color: var(--sage);
		box-shadow: 0 6px 20px rgba(33, 31, 26, 0.06);
	}
	.banner.playing {
		border-color: var(--sage);
		background: var(--sage-soft);
	}
	.banner:focus-visible {
		outline: 2px solid var(--sage);
		outline-offset: 3px;
	}

	.play-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--sage);
		color: #fff;
		display: grid;
		place-items: center;
		transition: background-color 0.2s ease;
	}
	.banner:hover .play-btn,
	.banner.playing .play-btn {
		background: var(--sage-deep);
	}

	.info {
		display: grid;
		gap: 1px;
		min-width: 0;
	}
	.info .kick {
		font-size: 9.5px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--sage-deep);
		font-weight: 600;
	}
	.info .track {
		font-family: var(--serif);
		font-size: 18px;
		font-weight: 600;
		color: var(--ink);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.info .artist {
		font-size: 11.5px;
		color: var(--muted);
		letter-spacing: 0.02em;
	}

	/* Animated equaliser bars — only "moving" when music is playing */
	.bars {
		display: inline-flex;
		gap: 3px;
		align-items: flex-end;
		justify-content: flex-end;
		height: 22px;
	}
	.bars .b {
		width: 3px;
		height: 6px;
		background: var(--rule);
		border-radius: 2px;
		transition: background-color 0.2s ease;
	}
	.banner.playing .bars .b {
		background: var(--sage);
		animation: bar 0.9s ease-in-out infinite;
	}
	.banner.playing .b:nth-child(1) { animation-delay: 0s; }
	.banner.playing .b:nth-child(2) { animation-delay: 0.15s; }
	.banner.playing .b:nth-child(3) { animation-delay: 0.3s; }
	.banner.playing .b:nth-child(4) { animation-delay: 0.45s; }
	.banner.playing .b:nth-child(5) { animation-delay: 0.6s; }

	@keyframes bar {
		0%, 100% { height: 6px; }
		50% { height: 22px; }
	}

	@media (prefers-reduced-motion: reduce) {
		.banner.playing .bars .b {
			animation: none;
			height: 14px;
		}
	}

	@media (max-width: 480px) {
		.banner {
			gap: 12px;
			padding: 12px 14px 12px 12px;
		}
		.play-btn {
			width: 40px;
			height: 40px;
		}
		.info .track {
			font-size: 16px;
		}
	}
</style>

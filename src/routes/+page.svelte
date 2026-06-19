<script lang="ts">
	import Flora from '$lib/components/Flora.svelte';
	import MusicPlayer from '$lib/components/MusicPlayer.svelte';
</script>

<Flora />
<MusicPlayer />

<main class="landing">
	<p class="eyebrow">Together with their families</p>
	<h1 class="script">Alex &amp; Katie</h1>
	<img src="/flora/layer-13.png" class="title-sprig" alt="" aria-hidden="true" />
	<p class="when">Friday 2 April 2027</p>
	<p class="where">The Tithe Barn · Bolton Abbey · Yorkshire Dales</p>
	<p class="note">
		If you've received an invitation, please use the QR code or personal link to RSVP.
	</p>
</main>

<style>
	.landing {
		max-width: 620px;
		margin: 0 auto;
		padding: 22vh 24px;
		text-align: center;
		position: relative;
		z-index: 1;
	}
	.landing h1 {
		font-size: clamp(64px, 16vw, 120px);
		margin: 8px 0 6px;
		line-height: 1;
		color: var(--ink);
	}
	.title-sprig {
		display: block;
		width: 30px;
		margin: 16px auto 18px;
		opacity: 0.7;
	}
	.when {
		font-family: var(--sans);
		letter-spacing: 0.24em;
		text-transform: uppercase;
		font-size: 12.5px;
		color: var(--ink);
		margin: 0;
	}
	.where {
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 10.5px;
		color: var(--muted);
		margin: 10px 0 0;
	}
	.note {
		color: var(--body);
		margin-top: 32px;
		max-width: 360px;
		margin-left: auto;
		margin-right: auto;
	}
</style>

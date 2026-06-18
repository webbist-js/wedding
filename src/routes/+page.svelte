<script lang="ts">
	import Flora from '$lib/components/Flora.svelte';
</script>

<Flora placement="top" />

<main class="landing">
	<p class="eyebrow">Together with their families</p>
	<h1 class="script">Alex &amp; Katie</h1>
	<p class="date">are getting married</p>
	<p class="meta">Friday 2 April 2027 · The Tithe Barn, Bolton Abbey</p>
	<p class="note">
		If you've received an invitation, please use the QR code or personal link to RSVP.
	</p>
</main>

<Flora placement="bottom" />

<style>
	.landing {
		max-width: 620px;
		margin: 0 auto;
		padding: 18vh 24px;
		text-align: center;
		position: relative;
		z-index: 1;
	}
	.landing h1 {
		font-size: clamp(64px, 16vw, 120px);
		margin: 8px 0;
	}
	.date {
		font-family: var(--serif);
		font-size: 22px;
		color: var(--ink);
	}
	.meta {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 12px;
		color: #5f5b50;
		margin-top: 14px;
	}
	.note {
		color: var(--body);
		margin-top: 28px;
	}
</style>

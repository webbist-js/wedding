<script lang="ts">
	// Fixed minimal wordmark + cross-navigation for the public guest pages.
	// Uses mix-blend-mode so it stays legible over both light and dark sections.
	let { current = '' }: { current?: 'home' | 'party' | 'location' | '' } = $props();
</script>

<nav class="topbar">
	<a class="wordmark script" href="/">K&amp;A</a>
	<div class="nav-links">
		<a href="/" aria-current={current === 'home' ? 'page' : undefined}>Home</a>
		<a href="/party" aria-current={current === 'party' ? 'page' : undefined}>The Party</a>
		<a href="/location" aria-current={current === 'location' ? 'page' : undefined}>The Area</a>
	</div>
</nav>

<style>
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px clamp(20px, 4vw, 56px);
		mix-blend-mode: difference;
		color: #fff;
		pointer-events: none;
	}
	.wordmark {
		font-size: 30px;
		line-height: 1;
		color: #fff;
		text-decoration: none;
		pointer-events: auto;
	}
	.nav-links {
		display: flex;
		gap: 26px;
		pointer-events: auto;
	}
	.nav-links a {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: #fff;
		text-decoration: none;
		opacity: 0.9;
		transition: opacity 0.2s ease;
	}
	.nav-links a:hover {
		opacity: 0.55;
	}
	.nav-links a[aria-current='page'] {
		opacity: 0.45;
	}
	@media (max-width: 560px) {
		.nav-links {
			gap: 15px;
		}
		.nav-links a {
			font-size: 10px;
			letter-spacing: 0.16em;
		}
		.wordmark {
			font-size: 26px;
		}
	}
</style>

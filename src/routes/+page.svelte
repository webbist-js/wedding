<script lang="ts">
	import { WEDDING } from '$lib/wedding-info';
	import {
		HERO_IMAGE,
		HERO_FOCUS,
		STORY_STATEMENT,
		STORY_CHAPTERS,
		WISHES_INTRO,
		FUTURE_WISHES
	} from '$lib/our-story';
	import { enhance } from '$lib/scrollfx';
	import Topbar from '$lib/components/Topbar.svelte';

	let root = $state<HTMLElement>();

	// Smooth scroll is started by the public layout; here we wire up the
	// scroll-driven reveals + parallax for this page's content.
	$effect(() => {
		if (root) return enhance(root);
	});
</script>

<svelte:head>
	<title>{WEDDING.coupleName} · {WEDDING.dateLong}</title>
	<!-- Without JS the scroll reveals never fire; show everything. -->
	<noscript>
		<style>
			[data-reveal] {
				opacity: 1 !important;
				transform: none !important;
			}
		</style>
	</noscript>
</svelte:head>

<Topbar current="home" />

<main class="home" bind:this={root}>
	<!-- ============ HERO ============ -->
	<header class="hero">
		<p class="eyebrow hero-eyebrow" data-reveal>Together with their families</p>
		<h1 class="hero-title">
			<span class="line" data-reveal>Katie</span>
			<span class="line line2" data-reveal style="--d:.08s">
				<span class="amp script">&amp;</span> Alex
			</span>
		</h1>

		<div class="hero-photo frame" data-reveal style="--d:.16s">
			<img src={HERO_IMAGE} data-speed="0.07" alt="Katie and Alex" style="object-position:{HERO_FOCUS}" />
		</div>

		<div class="hero-meta" data-reveal style="--d:.24s">
			<span>{WEDDING.dateLong}</span>
			<span class="dot" aria-hidden="true">·</span>
			<span>{WEDDING.venueName} · {WEDDING.venueArea}</span>
		</div>

		<div class="scroll-cue" aria-hidden="true" data-reveal style="--d:.4s">
			<span>Our story</span>
			<span class="cue-line"></span>
		</div>
	</header>

	<!-- ============ STATEMENT ============ -->
	<section class="statement">
		<p class="statement-text" data-reveal>{STORY_STATEMENT}</p>
	</section>

	<!-- ============ CHAPTERS ============ -->
	<section class="chapters">
		{#each STORY_CHAPTERS as c (c.index)}
			<article class="chapter" class:left={c.align === 'left'}>
				<div class="chapter-art">
					<span class="chapter-index" data-speed="0.05" aria-hidden="true">{c.index}</span>
					<div class="frame chapter-frame" data-reveal style={c.aspect ? `aspect-ratio:${c.aspect}` : undefined}>
						<img src={c.image} data-speed="0.06" alt={c.title} loading="lazy" style={c.focus ? `object-position:${c.focus}` : undefined} />
					</div>
				</div>

				<div class="chapter-copy">
					<p class="chapter-kicker" data-reveal>
						<span class="kicker-year">{c.year}</span>
						{c.kicker}
					</p>
					<h2 class="chapter-title" data-reveal style="--d:.06s">{c.title}</h2>
					<p class="chapter-body" data-reveal style="--d:.12s">{c.body}</p>
				</div>
			</article>
		{/each}
	</section>

	<!-- ============ FUTURE WISHES — "what comes next" ============ -->
	<section class="statement wishes-intro">
		<p class="eyebrow" data-reveal>What comes next</p>
		<p class="statement-text" data-reveal style="--d:.06s">{WISHES_INTRO}</p>
	</section>

	<section class="chapters">
		{#each FUTURE_WISHES as w (w.index)}
			<article class="chapter" class:left={w.align === 'left'}>
				<div class="chapter-art">
					<span class="chapter-index" data-speed="0.05" aria-hidden="true">{w.index}</span>
					<div class="frame chapter-frame" data-reveal style={w.aspect ? `aspect-ratio:${w.aspect}` : undefined}>
						<img src={w.image} data-speed="0.06" alt={w.title} loading="lazy" style={w.focus ? `object-position:${w.focus}` : undefined} />
					</div>
				</div>

				<div class="chapter-copy">
					<p class="chapter-kicker" data-reveal>
						<span class="kicker-year">{w.year}</span>
						{w.kicker}
					</p>
					<h2 class="chapter-title" data-reveal style="--d:.06s">{w.title}</h2>
					<p class="chapter-body" data-reveal style="--d:.12s">{w.body}</p>
				</div>
			</article>
		{/each}
	</section>

	<!-- ============ DETAILS ============ -->
	<section class="details">
		<p class="eyebrow" data-reveal>You're invited</p>
		<h2 class="details-title script" data-reveal style="--d:.06s">The Day</h2>

		<div class="details-grid">
			<div class="detail" data-reveal style="--d:.1s">
				<p class="detail-label">When</p>
				<p class="detail-value">{WEDDING.dateLong}</p>
				<p class="detail-sub">Ceremony at {WEDDING.ceremonyTime}</p>
			</div>
			<div class="detail" data-reveal style="--d:.18s">
				<p class="detail-label">Where</p>
				<p class="detail-value">{WEDDING.venueName}</p>
				<p class="detail-sub">{WEDDING.venueArea}</p>
			</div>
		</div>

		<p class="details-note" data-reveal style="--d:.24s">
			If you've received an invitation, please use the QR code or personal link to RSVP.
		</p>
	</section>

	<!-- ============ CTA ============ -->
	<section class="cta">
		<div class="cta-inner">
			<p class="eyebrow light" data-reveal>The 2nd of April, 2027</p>
			<h2 class="cta-title" data-reveal style="--d:.06s">
				<span class="line">Come</span>
				<span class="line">celebrate</span>
				<span class="line">with us</span>
			</h2>
			<div class="cta-links" data-reveal style="--d:.2s">
				<a href="/party">Meet the wedding party</a>
				<a href="/location">The venue &amp; the area</a>
			</div>
		</div>
	</section>

	<!-- ============ FOOTER ============ -->
	<footer class="home-foot">
		<p class="foot-names script">{WEDDING.coupleName}</p>
		<p class="foot-line">{WEDDING.dateLong} · {WEDDING.venueName}, Bolton Abbey</p>
		<a class="foot-contact" href={`mailto:${WEDDING.contact.email}`}>{WEDDING.contact.email}</a>
	</footer>
</main>

<style>
	.home {
		position: relative;
		overflow: clip;
		color: var(--ink);
	}

	/* ---------------- Reveals ---------------- */
	[data-reveal] {
		opacity: 0;
		transform: translateY(46px);
		transition:
			opacity 1s cubic-bezier(0.16, 1, 0.3, 1),
			transform 1.15s cubic-bezier(0.16, 1, 0.3, 1);
		transition-delay: var(--d, 0s);
		will-change: opacity, transform;
	}
	:global([data-reveal].in) {
		opacity: 1;
		transform: none;
	}

	/* ---------------- Frames (parallax images) ---------------- */
	.frame {
		position: relative;
		overflow: hidden;
		background: var(--line2);
	}
	.frame img {
		display: block;
		width: 100%;
		height: 128%;
		object-fit: cover;
		position: relative;
		top: -14%;
		will-change: transform;
	}

	/* ---------------- Hero ---------------- */
	.hero {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 120px clamp(20px, 5vw, 64px) 60px;
		position: relative;
	}
	.hero-eyebrow {
		margin: 0 0 clamp(20px, 4vw, 40px);
	}
	.hero-title {
		font-family: var(--serif);
		font-weight: 600;
		line-height: 0.86;
		letter-spacing: -0.02em;
		font-size: clamp(72px, 17vw, 230px);
		margin: 0;
		color: var(--ink);
	}
	.hero-title .line {
		display: block;
	}
	.hero-title .line2 {
		font-style: italic;
		font-weight: 500;
	}
	.hero-title .amp {
		font-style: normal;
		color: var(--terra);
		font-size: 0.7em;
		padding-right: 0.08em;
	}
	.hero-photo {
		width: min(560px, 80vw);
		aspect-ratio: 4 / 5;
		border-radius: 4px;
		margin: clamp(36px, 6vw, 72px) auto clamp(28px, 4vw, 44px);
		box-shadow: 0 40px 90px rgba(33, 31, 26, 0.22);
	}
	.hero-photo img {
		filter: grayscale(1);
	}
	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14px;
		font-family: var(--sans);
		font-size: 12px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--body);
	}
	.hero-meta .dot {
		opacity: 0.5;
	}
	.scroll-cue {
		position: absolute;
		bottom: 28px;
		/* Centre via auto margins, not translateX — this carries [data-reveal],
		   whose transform animation would clobber a translateX(-50%). */
		left: 0;
		right: 0;
		margin-inline: auto;
		width: max-content;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.cue-line {
		width: 1px;
		height: 46px;
		background: linear-gradient(var(--rule), transparent);
		animation: cuepulse 2.4s ease-in-out infinite;
		transform-origin: top;
	}
	@keyframes cuepulse {
		0%,
		100% {
			transform: scaleY(0.4);
			opacity: 0.4;
		}
		50% {
			transform: scaleY(1);
			opacity: 1;
		}
	}

	/* ---------------- Statement ---------------- */
	.statement {
		max-width: 1100px;
		margin: 0 auto;
		padding: clamp(80px, 16vw, 220px) clamp(24px, 6vw, 80px);
	}
	.statement-text {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(28px, 5vw, 62px);
		line-height: 1.16;
		letter-spacing: -0.01em;
		color: var(--ink);
		margin: 0;
		text-wrap: balance;
	}

	/* ---------------- Chapters ---------------- */
	.chapters {
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 clamp(24px, 5vw, 64px);
		display: flex;
		flex-direction: column;
		gap: clamp(100px, 18vw, 240px);
	}
	.chapter {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: clamp(36px, 6vw, 96px);
		align-items: center;
	}
	.chapter.left .chapter-art {
		order: 2;
	}
	.chapter-art {
		position: relative;
	}
	.chapter-index {
		position: absolute;
		top: -0.55em;
		left: -0.12em;
		z-index: 2;
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(90px, 13vw, 200px);
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1px var(--rule);
		pointer-events: none;
	}
	.chapter.left .chapter-index {
		left: auto;
		right: -0.12em;
	}
	.chapter-frame {
		aspect-ratio: 4 / 5;
		border-radius: 4px;
		box-shadow: 0 36px 80px rgba(33, 31, 26, 0.16);
	}
	.chapter-kicker {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--sage-deep);
		font-weight: 600;
		margin: 0 0 22px;
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.kicker-year {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 500;
		font-size: 20px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--terra);
	}
	.chapter-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(38px, 6vw, 74px);
		line-height: 1.02;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 24px;
	}
	.chapter-body {
		font-family: var(--serif);
		font-size: clamp(17px, 2vw, 20px);
		line-height: 1.62;
		color: var(--body);
		margin: 0;
		max-width: 460px;
	}

	/* ---------------- Future wishes intro ---------------- */
	.wishes-intro .eyebrow {
		display: block;
		margin-bottom: clamp(18px, 3vw, 30px);
	}


	/* ---------------- Details ---------------- */
	.details {
		max-width: 820px;
		margin: 0 auto;
		padding: clamp(110px, 18vw, 240px) clamp(24px, 6vw, 64px) clamp(80px, 12vw, 160px);
		text-align: center;
	}
	.details-title {
		font-size: clamp(54px, 10vw, 110px);
		line-height: 1;
		color: var(--ink);
		margin: 10px 0 clamp(40px, 6vw, 64px);
	}
	.details-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(24px, 5vw, 60px);
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		padding: clamp(28px, 4vw, 44px) 0;
	}
	.detail-label {
		font-family: var(--sans);
		font-size: 10.5px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--sage);
		font-weight: 600;
		margin: 0 0 12px;
	}
	.detail-value {
		font-family: var(--serif);
		font-size: clamp(22px, 3vw, 30px);
		color: var(--ink);
		margin: 0 0 4px;
	}
	.detail-sub {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15px;
		color: var(--muted);
		margin: 0;
	}
	.details-note {
		font-family: var(--serif);
		font-size: clamp(16px, 2vw, 19px);
		line-height: 1.6;
		color: var(--body);
		max-width: 440px;
		margin: clamp(32px, 5vw, 48px) auto 0;
	}

	/* ---------------- CTA ---------------- */
	.cta {
		background: var(--sage-deep);
		color: #fff;
		padding: clamp(90px, 16vw, 220px) clamp(24px, 6vw, 64px);
	}
	.cta-inner {
		max-width: 1100px;
		margin: 0 auto;
		text-align: center;
	}
	.eyebrow.light {
		color: rgba(255, 255, 255, 0.7);
	}
	.cta-title {
		font-family: var(--serif);
		font-weight: 500;
		font-style: italic;
		font-size: clamp(54px, 12vw, 150px);
		line-height: 0.92;
		letter-spacing: -0.01em;
		margin: 18px 0 clamp(44px, 6vw, 70px);
		color: #fff;
	}
	.cta-title .line {
		display: block;
	}
	.cta-links {
		display: inline-flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 16px 40px;
	}
	.cta-links a {
		font-family: var(--sans);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #fff;
		text-decoration: none;
		padding-bottom: 5px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.4);
		transition:
			border-color 0.25s ease,
			opacity 0.25s ease;
	}
	.cta-links a:hover {
		opacity: 0.7;
		border-color: rgba(255, 255, 255, 0.9);
	}

	/* ---------------- Footer ---------------- */
	.home-foot {
		text-align: center;
		padding: clamp(60px, 10vw, 110px) 24px clamp(50px, 8vw, 90px);
	}
	.foot-names {
		font-size: clamp(44px, 9vw, 80px);
		color: var(--ink);
		margin: 0 0 16px;
	}
	.foot-line {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0 0 18px;
	}
	.foot-contact {
		font-family: var(--serif);
		font-style: italic;
		font-size: 17px;
		color: var(--sage-deep);
	}

	/* ---------------- Responsive ---------------- */
	@media (max-width: 820px) {
		.chapter {
			grid-template-columns: 1fr;
			gap: 28px;
			max-width: 520px;
			margin: 0 auto;
		}
		.chapter.left .chapter-art {
			order: 0;
		}
		.chapter-copy {
			text-align: center;
		}
		.chapter-kicker {
			justify-content: center;
		}
		.chapter-body {
			margin-left: auto;
			margin-right: auto;
		}
		.details-grid {
			grid-template-columns: 1fr;
			gap: 24px;
		}
	}
</style>

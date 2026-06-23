<script lang="ts">
	import Topbar from '$lib/components/Topbar.svelte';
	import { enhance } from '$lib/scrollfx';
	import { WEDDING, TRAVEL, ACCOMMODATION } from '$lib/wedding-info';
	import { VENUE, AREA_INTRO, ATTRACTIONS, AREA_OUTRO, IMAGE_CREDITS } from '$lib/location-info';

	let root = $state<HTMLElement>();
	$effect(() => {
		if (root) return enhance(root);
	});

	const pad = (n: number) => String(n).padStart(2, '0');
</script>

<svelte:head>
	<title>The Venue & The Area · {WEDDING.coupleName}</title>
</svelte:head>

<Topbar current="location" />

<main class="ed loc" bind:this={root}>
	<!-- ============ HERO ============ -->
	<header class="ed-hero">
		<div class="ed-hero-inner">
			<p class="eyebrow" data-reveal>{VENUE.estate}</p>
			<h1 class="ed-hero-title" data-reveal style="--d:.08s">Where <span class="it">We'll</span> Be</h1>
			<div class="ed-hero-photo ed-frame loc-hero-photo" data-reveal style="--d:.16s">
				<img src={VENUE.heroImage} data-speed="0.07" alt="The Tithe Barn at Bolton Abbey" />
			</div>
			<p class="ed-hero-meta" data-reveal style="--d:.24s">
				{WEDDING.dateLong} · Ceremony at {WEDDING.ceremonyTime}
			</p>
		</div>
		<div class="ed-cue" aria-hidden="true" data-reveal style="--d:.4s">
			<span>The venue</span><span class="ed-cue-line"></span>
		</div>
	</header>

	<!-- ============ VENUE ============ -->
	<section class="venue ed-wrap">
		<p class="ed-statement-kicker" data-reveal>The Venue</p>
		<h2 class="venue-title" data-reveal style="--d:.06s">The Tithe Barn</h2>
		<p class="ed-lead venue-lead" data-reveal style="--d:.1s">{VENUE.lead}</p>
		<p class="ed-body venue-body" data-reveal style="--d:.14s">{VENUE.body}</p>

		<div class="getting-there" data-reveal style="--d:.2s">
			<div class="gt-item">
				<p class="gt-label">Address</p>
				<p class="gt-val">{VENUE.name}, Bolton Abbey<br />{WEDDING.venuePostcode}</p>
			</div>
			<div class="gt-item">
				<p class="gt-label">By car</p>
				<p class="gt-val">{TRAVEL.driveFromSkipton}</p>
			</div>
			<div class="gt-item">
				<p class="gt-label">Parking</p>
				<p class="gt-val">{TRAVEL.parking}</p>
			</div>
		</div>

		<div class="gt-actions" data-reveal style="--d:.26s">
			<a class="ed-btn" href={WEDDING.mapLink} target="_blank" rel="noopener">Open in Maps</a>
			<a class="ed-btn ghost" href={WEDDING.venueWebsite} target="_blank" rel="noopener">Visit the venue</a>
		</div>
	</section>

	<!-- ============ PANORAMIC BAND ============ -->
	<figure class="ed-band">
		<div class="ed-frame">
			<img src={VENUE.bandImage} data-speed="0.1" alt="The priory ruins and stepping stones across the River Wharfe" loading="lazy" />
		</div>
		<figcaption class="ed-band-undercap">
			The priory ruins and stepping stones across the River Wharfe — a short stroll from the barn.
		</figcaption>
	</figure>

	<!-- ============ AREA INTRO ============ -->
	<section class="ed-statement">
		<p class="ed-statement-kicker" data-reveal>Make a weekend of it</p>
		<h2 class="area-title" data-reveal style="--d:.06s">
			Brontë Country <span class="it">&amp;</span> the Dales
		</h2>
		<p class="ed-statement-text area-intro" data-reveal style="--d:.12s">{AREA_INTRO}</p>
	</section>

	<!-- ============ ATTRACTIONS ============ -->
	<section class="attractions ed-wrap" aria-label="Things to do nearby">
		{#each ATTRACTIONS as a, i (a.slug)}
			<article class="attraction" data-reveal style="--d:{(i % 3) * 0.08}s">
				<div class="ed-frame attr-frame">
					<img src={a.image} data-speed={(0.05 + (i % 3) * 0.015).toFixed(3)} alt={a.name} loading="lazy" />
				</div>
				<div class="attr-head">
					<span class="attr-index" aria-hidden="true">{pad(i + 1)}</span>
					<span class="attr-dist">{a.distance}</span>
				</div>
				<h3 class="attr-name">{a.name}</h3>
				<p class="attr-body">{a.body}</p>
				{#if a.link}
					<a class="ed-link" href={a.link.href} target="_blank" rel="noopener">{a.link.label} ↗</a>
				{/if}
			</article>
		{/each}
	</section>

	<!-- ============ WHERE TO STAY ============ -->
	<section class="stay ed-wrap">
		<p class="ed-statement-kicker" data-reveal>Rest your head</p>
		<h2 class="stay-title" data-reveal style="--d:.06s">Where to Stay</h2>
		<ul class="stay-list">
			{#each ACCOMMODATION as s, i (s.name)}
				<li data-reveal style="--d:{i * 0.05}s">
					<div class="stay-text">
						<p class="stay-name">
							{#if s.url}
								<a href={s.url} target="_blank" rel="noopener">{s.name} ↗</a>
							{:else}{s.name}{/if}
						</p>
						<p class="stay-note">{s.note}</p>
					</div>
					{#if s.phone}
						<a class="stay-phone" href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ============ CLOSING BAND ============ -->
	<figure class="ed-band closing-band">
		<div class="ed-frame">
			<img src={AREA_OUTRO.image} data-speed="0.12" alt="Golden light over Wharfedale in the Yorkshire Dales" loading="lazy" />
		</div>
		<div class="ed-band-overlay" aria-hidden="true"></div>
		<figcaption class="ed-band-cap"><span>{AREA_OUTRO.text}</span></figcaption>
	</figure>

	<!-- ============ FOOTER ============ -->
	<footer class="ed-foot">
		<p class="ed-foot-names script">{WEDDING.coupleName}</p>
		<p class="ed-foot-line">{WEDDING.dateLong} · {WEDDING.venueName}, Bolton Abbey</p>
		<a class="ed-link" href="/">← Back to the invitation</a>

		<details class="credits">
			<summary>Photography credits</summary>
			<ul>
				{#each IMAGE_CREDITS as c (c.subject)}
					<li>
						{c.subject} — {c.artist},
						<a href={c.page} target="_blank" rel="noopener">{c.license}</a>, via Wikimedia Commons
					</li>
				{/each}
			</ul>
		</details>
	</footer>
</main>

<style>
	/* Location hero: content sits in a centered wrapper that fills the space, with
	   the scroll cue as an in-flow, centred item pinned to the bottom. This avoids
	   the cue overlapping the meta and keeps everything horizontally centred,
	   whatever the viewport height. */
	.ed-hero {
		padding-top: clamp(92px, 12vh, 124px);
		padding-bottom: clamp(44px, 7vh, 80px);
	}
	.ed-hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}
	.ed-hero-title {
		font-size: clamp(46px, 8.5vw, 120px);
	}
	.loc-hero-photo {
		aspect-ratio: 16 / 10;
		width: min(800px, 86vw);
		max-height: 36vh;
		margin-top: clamp(22px, 3.5vw, 44px);
		margin-bottom: clamp(20px, 2.6vw, 32px);
	}
	.ed-cue {
		position: static;
		transform: none;
		left: auto;
		bottom: auto;
		margin-top: clamp(20px, 3vh, 36px);
	}

	/* ---------- Venue ---------- */
	.venue {
		max-width: 760px;
		text-align: center;
		padding-top: clamp(40px, 8vw, 90px);
	}
	.venue-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(46px, 8vw, 96px);
		line-height: 1;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 10px 0 22px;
	}
	.venue-lead {
		margin-left: auto;
		margin-right: auto;
	}
	.venue-body {
		margin: 0 auto;
		max-width: 620px;
	}
	.getting-there {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 28px;
		margin: clamp(40px, 6vw, 64px) 0 32px;
		text-align: left;
		border-top: 1px solid var(--line);
		padding-top: clamp(28px, 4vw, 40px);
	}
	.gt-label {
		font-family: var(--sans);
		font-size: 10.5px;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--sage);
		font-weight: 600;
		margin: 0 0 8px;
	}
	.gt-val {
		font-family: var(--serif);
		font-size: 15.5px;
		line-height: 1.5;
		color: var(--ink);
		margin: 0;
	}
	.gt-actions {
		display: flex;
		gap: 12px;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ---------- Area heading ---------- */
	.area-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(44px, 9vw, 110px);
		line-height: 0.98;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 0 0 clamp(26px, 4vw, 40px);
	}
	.area-title .it {
		font-style: italic;
		font-weight: 500;
		color: var(--terra);
	}
	.area-intro {
		font-size: clamp(20px, 2.6vw, 30px);
		font-weight: 500;
		line-height: 1.4;
		color: var(--body);
	}

	/* ---------- Attractions ---------- */
	.attractions {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(36px, 5vw, 64px) clamp(24px, 3vw, 44px);
	}
	.attraction:nth-child(3n + 2) {
		margin-top: clamp(40px, 7vw, 110px);
	}
	.attr-frame {
		aspect-ratio: 4 / 5;
		border-radius: 4px;
		box-shadow: 0 26px 60px rgba(33, 31, 26, 0.14);
		margin-bottom: 22px;
	}
	.attr-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		border-top: 1px solid var(--line);
		padding-top: 14px;
	}
	.attr-index {
		font-family: var(--serif);
		font-size: 22px;
		font-weight: 600;
		color: transparent;
		-webkit-text-stroke: 0.8px var(--rule);
	}
	.attr-dist {
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--sage-deep);
	}
	.attr-name {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(26px, 3vw, 34px);
		line-height: 1.05;
		color: var(--ink);
		margin: 10px 0 12px;
	}
	.attr-body {
		font-family: var(--serif);
		font-size: 16px;
		line-height: 1.58;
		color: var(--body);
		margin: 0 0 16px;
	}

	/* ---------- Where to stay ---------- */
	.stay {
		max-width: 820px;
		text-align: center;
		padding-top: clamp(110px, 18vw, 220px);
	}
	.stay-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(44px, 8vw, 92px);
		line-height: 1;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 10px 0 clamp(36px, 5vw, 56px);
	}
	.stay-list {
		list-style: none;
		margin: 0;
		padding: 0;
		text-align: left;
	}
	.stay-list li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20px;
		padding: 22px 0;
		border-top: 1px solid var(--line);
	}
	.stay-list li:last-child {
		border-bottom: 1px solid var(--line);
	}
	.stay-name {
		font-family: var(--serif);
		font-size: 22px;
		font-weight: 600;
		color: var(--ink);
		margin: 0 0 4px;
	}
	.stay-name a {
		text-decoration: none;
	}
	.stay-name a:hover {
		text-decoration: underline;
	}
	.stay-note {
		font-family: var(--serif);
		font-size: 15px;
		line-height: 1.5;
		color: var(--body);
		margin: 0;
		max-width: 520px;
	}
	.stay-phone {
		font-family: var(--sans);
		font-size: 13px;
		color: var(--sage-deep);
		white-space: nowrap;
		text-decoration: none;
		flex-shrink: 0;
	}

	/* ---------- Closing + footer ---------- */
	.closing-band {
		margin-bottom: 0;
	}
	.credits {
		margin: 40px auto 0;
		max-width: 620px;
		font-family: var(--sans);
		font-size: 11.5px;
		color: var(--faint);
		text-align: left;
	}
	.credits summary {
		cursor: pointer;
		text-align: center;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.credits ul {
		margin: 14px 0 0;
		padding-left: 18px;
		line-height: 1.7;
	}
	.credits a {
		color: var(--muted);
	}

	/* ---------- Responsive ---------- */
	@media (max-width: 860px) {
		.attractions {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 560px) {
		.getting-there {
			grid-template-columns: 1fr;
			gap: 18px;
			text-align: center;
		}
		.attractions {
			grid-template-columns: 1fr;
			max-width: 420px;
			margin: 0 auto;
		}
		.attraction:nth-child(3n + 2) {
			margin-top: 0;
		}
		.stay-list li {
			flex-direction: column;
			gap: 6px;
		}
	}
</style>

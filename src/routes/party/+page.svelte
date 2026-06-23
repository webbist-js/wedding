<script lang="ts">
	import Topbar from '$lib/components/Topbar.svelte';
	import { enhance } from '$lib/scrollfx';
	import { WEDDING } from '$lib/wedding-info';
	import { WEDDING_PARTY, PARTY_INTRO, PARTY_OUTRO, RING_BEARER } from '$lib/wedding-party';

	const leads = WEDDING_PARTY.filter((c) => c.lead);
	const rest = WEDDING_PARTY.filter((c) => !c.lead);

	let root = $state<HTMLElement>();
	$effect(() => {
		if (root) return enhance(root);
	});

	const first = (name: string) => name.split(' ')[0];
	const pad = (n: number) => String(n).padStart(2, '0');
	const sideLabel = (s: string) => (s === 'bride' ? "Bride's side" : "Groom's side");
</script>

<svelte:head>
	<title>The Wedding Party · {WEDDING.coupleName}</title>
</svelte:head>

<Topbar current="party" />

<main class="ed party" bind:this={root}>
	<!-- ============ HERO ============ -->
	<header class="ed-hero party-hero">
		<p class="eyebrow" data-reveal>Those standing beside us</p>
		<h1 class="ed-hero-title" data-reveal style="--d:.08s">
			The Wedding <span class="it">Party</span>
		</h1>
		<p class="party-intro" data-reveal style="--d:.16s">{PARTY_INTRO}</p>
		<div class="ed-cue" aria-hidden="true" data-reveal style="--d:.34s">
			<span>Meet them</span><span class="ed-cue-line"></span>
		</div>
	</header>

	<!-- ============ LEAD COUPLES (chapter spreads) ============ -->
	<section class="ed-wrap ed-chapters lead-chapters">
		{#each leads as c, i (c.id)}
			<article class="ed-chapter" class:left={i % 2 === 1}>
				<div class="ed-chapter-art">
					<span class="ed-chapter-index" data-speed="0.05" aria-hidden="true">{pad(i + 1)}</span>
					<div class="duo">
						<figure class="ed-frame duo-a" data-reveal>
							<img src={c.members[0].photo} data-speed="0.05" alt={c.members[0].name} loading="lazy" style={c.members[0].focus ? `object-position:${c.members[0].focus}` : undefined} />
						</figure>
						<figure class="ed-frame duo-b" data-reveal style="--d:.1s">
							<img src={c.members[1].photo} data-speed="0.09" alt={c.members[1].name} loading="lazy" style={c.members[1].focus ? `object-position:${c.members[1].focus}` : undefined} />
						</figure>
						<span class="duo-amp script" aria-hidden="true">&amp;</span>
					</div>
				</div>

				<div class="ed-chapter-copy">
					<p class="side-flag" data-side={c.side} data-reveal>{sideLabel(c.side)}</p>
					<p class="ed-kicker" data-reveal style="--d:.04s">
						<span class="ed-kicker-accent">{c.tagline}</span>
					</p>
					<h2 class="ed-chapter-title" data-reveal style="--d:.08s">
						{first(c.members[0].name)} <span class="amp">&amp;</span>
						<span class="it">{first(c.members[1].name)}</span>
					</h2>
					<ul class="roles" data-reveal style="--d:.12s">
						{#each c.members as m (m.name)}
							<li><span class="role-dot" aria-hidden="true"></span>{m.name} · <em>{m.role}</em></li>
						{/each}
					</ul>
					<p class="ed-body" data-reveal style="--d:.16s">{c.story}</p>
				</div>
			</article>
		{/each}
	</section>

	<!-- ============ THE REST ============ -->
	<section class="ed-statement rest-head">
		<p class="ed-statement-kicker" data-reveal>And the rest of our favourites</p>
		<h2 class="rest-title" data-reveal style="--d:.06s">
			Groomsmen <span class="it">&amp;</span> Bridesmaids
		</h2>
	</section>

	<section class="rest-grid ed-wrap">
		{#each rest as c, i (c.id)}
			<article class="rest-couple" data-reveal style="--d:{(i % 3) * 0.08}s">
				<div class="duo small">
					<figure class="ed-frame duo-a">
						<img src={c.members[0].photo} data-speed={(0.04 + (i % 3) * 0.01).toFixed(3)} alt={c.members[0].name} loading="lazy" style={c.members[0].focus ? `object-position:${c.members[0].focus}` : undefined} />
					</figure>
					<figure class="ed-frame duo-b">
						<img src={c.members[1].photo} data-speed={(0.07 + (i % 3) * 0.01).toFixed(3)} alt={c.members[1].name} loading="lazy" style={c.members[1].focus ? `object-position:${c.members[1].focus}` : undefined} />
					</figure>
					<span class="duo-amp script" aria-hidden="true">&amp;</span>
				</div>
				<h3 class="rest-names">
					{first(c.members[0].name)} <span class="amp">&amp;</span>
					<span class="it">{first(c.members[1].name)}</span>
				</h3>
				<ul class="roles center">
					{#each c.members as m (m.name)}
						<li>{first(m.name)} · <em>{m.role}</em></li>
					{/each}
				</ul>
				<p class="rest-story">{c.story}</p>
			</article>
		{/each}
	</section>

	<!-- ============ RING BEARER — BODIE ============ -->
	<section class="bodie">
		<div class="bodie-inner ed-wrap">
			<div class="bodie-art" data-reveal>
				<figure class="bodie-portrait">
					<img src={RING_BEARER.photo} alt={RING_BEARER.name} loading="lazy" />
				</figure>
				<span class="bodie-badge">
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
						<circle cx="6" cy="10" r="2.1" />
						<circle cx="11" cy="6.5" r="2.1" />
						<circle cx="17" cy="7.5" r="2.1" />
						<circle cx="20.5" cy="12" r="1.9" />
						<path d="M13 12.5c2.6 0 4.6 2 5.2 4.2.5 1.9-1 3.3-2.9 3-1-.2-1.7-.6-2.3-.6s-1.3.4-2.3.6c-1.9.3-3.4-1.1-2.9-3C8.4 14.5 10.4 12.5 13 12.5z" />
					</svg>
					{RING_BEARER.role}
				</span>
			</div>
			<div class="bodie-copy">
				<p class="ed-statement-kicker" data-reveal>A very important member of the family</p>
				<h2 class="bodie-name" data-reveal style="--d:.06s">{RING_BEARER.name}</h2>
				<p class="bodie-meta" data-reveal style="--d:.1s">
					{RING_BEARER.breed} · {RING_BEARER.age} years old
				</p>
				<p class="ed-body" data-reveal style="--d:.14s">{RING_BEARER.story}</p>
			</div>
		</div>
	</section>

	<!-- ============ CLOSING ============ -->
	<section class="party-outro">
		<p class="outro-text" data-reveal>{PARTY_OUTRO}</p>
	</section>

	<footer class="ed-foot">
		<p class="ed-foot-names script">{WEDDING.coupleName}</p>
		<p class="ed-foot-line">{WEDDING.dateLong} · {WEDDING.venueName}, Bolton Abbey</p>
		<a class="ed-link" href="/">← Back to the invitation</a>
	</footer>
</main>

<style>
	/* ---------- Hero ---------- */
	.party-intro {
		font-family: var(--serif);
		font-size: clamp(18px, 2.6vw, 24px);
		line-height: 1.5;
		color: var(--body);
		max-width: 560px;
		margin: clamp(28px, 4vw, 40px) auto 0;
	}

	/* ---------- Duo portraits (two equal, overlapping frames) ---------- */
	.duo {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.duo .ed-frame {
		width: 56%;
		flex: none;
		aspect-ratio: 4 / 5;
		border-radius: 4px;
		box-shadow: 0 26px 60px rgba(33, 31, 26, 0.16);
	}
	.duo-a {
		margin-top: 16%;
		margin-right: -10%;
		z-index: 2;
	}
	.duo-b {
		margin-left: -10%;
		z-index: 1;
		border: 6px solid var(--bg);
		box-shadow: 0 24px 50px rgba(33, 31, 26, 0.2);
	}
	.duo-amp {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 3;
		font-size: clamp(40px, 5vw, 60px);
		line-height: 1;
		color: var(--terra);
		text-shadow: 0 2px 10px rgba(251, 250, 246, 0.9);
	}

	/* ---------- Lead chapter copy ---------- */
	.lead-chapters {
		margin-top: clamp(20px, 4vw, 40px);
	}
	.side-flag {
		font-family: var(--sans);
		font-size: 10.5px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		font-weight: 600;
		margin: 0 0 14px;
	}
	.side-flag[data-side='bride'] {
		color: var(--rose);
	}
	.side-flag[data-side='groom'] {
		color: var(--sage);
	}
	.ed-chapter-title .amp,
	.rest-names .amp {
		color: var(--terra);
		font-weight: 500;
		padding: 0 0.04em;
	}
	.roles {
		list-style: none;
		margin: 0 0 22px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.roles li {
		font-family: var(--sans);
		font-size: 13px;
		color: var(--ink);
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.roles em {
		color: var(--sage-deep);
		font-style: italic;
		font-family: var(--serif);
		font-size: 15.5px;
	}
	.role-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: 1px solid var(--sage);
		flex-shrink: 0;
	}

	/* ---------- The rest ---------- */
	.rest-head {
		padding-bottom: clamp(40px, 6vw, 70px);
	}
	.rest-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(40px, 8vw, 96px);
		line-height: 0.98;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 10px 0 0;
	}
	.rest-title .it {
		font-style: italic;
		font-weight: 500;
		color: var(--terra);
	}
	.rest-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(40px, 5vw, 64px) clamp(28px, 3vw, 48px);
	}
	.rest-couple {
		text-align: center;
	}
	.rest-couple .duo {
		max-width: 320px;
		margin: 0 auto 26px;
	}
	.rest-names {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(28px, 3.4vw, 40px);
		line-height: 1;
		letter-spacing: -0.01em;
		color: var(--ink);
		margin: 0 0 10px;
	}
	.rest-names .it {
		font-style: italic;
		font-weight: 500;
	}
	.roles.center {
		align-items: center;
		margin-bottom: 14px;
	}
	.roles.center li {
		font-size: 12.5px;
	}
	.rest-story {
		font-family: var(--serif);
		font-size: 15.5px;
		line-height: 1.6;
		color: var(--body);
		margin: 0;
		max-width: 360px;
		margin-left: auto;
		margin-right: auto;
	}

	/* ---------- Bodie ---------- */
	.bodie {
		background: var(--sage-soft);
		margin-top: clamp(110px, 18vw, 220px);
		padding: clamp(60px, 10vw, 130px) 0;
	}
	.bodie-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(36px, 6vw, 90px);
	}
	.bodie-art {
		position: relative;
		flex-shrink: 0;
	}
	.bodie-portrait {
		margin: 0;
	}
	.bodie-portrait img {
		display: block;
		width: clamp(220px, 30vw, 320px);
		height: clamp(220px, 30vw, 320px);
		object-fit: cover;
		object-position: center 22%;
		border-radius: 50%;
		border: 8px solid #fff;
		box-shadow: 0 26px 56px rgba(33, 31, 26, 0.2);
	}
	.bodie-badge {
		position: absolute;
		bottom: 6px;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 600;
		color: #fff;
		background: var(--terra);
		padding: 7px 15px;
		border-radius: 999px;
		box-shadow: 0 4px 14px rgba(33, 31, 26, 0.2);
	}
	.bodie-copy {
		max-width: 460px;
	}
	.bodie-name {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(56px, 9vw, 104px);
		line-height: 0.95;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 6px 0 8px;
	}
	.bodie-meta {
		font-family: var(--sans);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0 0 18px;
	}

	/* ---------- Closing ---------- */
	.party-outro {
		max-width: 800px;
		margin: 0 auto;
		padding: clamp(90px, 15vw, 200px) clamp(24px, 6vw, 64px) clamp(40px, 6vw, 70px);
		text-align: center;
	}
	.outro-text {
		font-family: var(--serif);
		font-weight: 500;
		font-style: italic;
		font-size: clamp(26px, 4.5vw, 50px);
		line-height: 1.22;
		letter-spacing: -0.01em;
		color: var(--ink);
		margin: 0;
		text-wrap: balance;
	}

	/* ---------- Responsive ---------- */
	@media (max-width: 860px) {
		.rest-grid {
			grid-template-columns: 1fr;
			max-width: 440px;
			margin: 0 auto;
			gap: 64px;
		}
		.bodie-inner {
			flex-direction: column;
			text-align: center;
		}
		.bodie-copy {
			margin: 0 auto;
		}
	}
</style>

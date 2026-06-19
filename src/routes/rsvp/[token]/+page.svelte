<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		WEDDING,
		CEREMONY_TIMETABLE,
		MENU,
		ACCOMMODATION,
		TAXIS,
		TRAVEL,
		GIFTS
	} from '$lib/wedding-info';
	import Flora from '$lib/components/Flora.svelte';
	import MusicBanner from '$lib/components/MusicBanner.svelte';
	import { reveal } from '$lib/actions/reveal';
	let { data, form } = $props();

	// Track each member's current selection client-side so meal/dietary blocks
	// can appear only after they've actually clicked "Joyfully accepts".
	type Attend = 'yes' | 'no' | null;
	let attending = $state<Record<number, Attend>>(
		Object.fromEntries(
			data.members.map((m) => [
				m.id,
				m.rsvpStatus === 'yes' ? 'yes' : m.rsvpStatus === 'no' ? 'no' : null
			])
		)
	);

	// Days to go — recomputed client-side so SSR-cached pages don't show a stale figure.
	let daysToGo = $state<number | null>(null);
	$effect(() => {
		const weddingMs = new Date('2027-04-02T14:30:00').getTime();
		daysToGo = Math.max(0, Math.ceil((weddingMs - Date.now()) / 86400000));
	});

	// Fire confetti once on success, but only if at least one person is attending.
	$effect(() => {
		if (!form?.saved) return;
		const anyAttending = data.members.some((m) => m.rsvpStatus === 'yes');
		if (!anyAttending) return;
		import('canvas-confetti').then(({ default: confetti }) => {
			const sage = ['#6f7d59', '#9aa685', '#c08a86', '#e8dec6'];
			confetti({ particleCount: 110, spread: 90, startVelocity: 35, origin: { y: 0.65 }, colors: sage });
			setTimeout(
				() =>
					confetti({
						particleCount: 70,
						spread: 110,
						startVelocity: 28,
						origin: { y: 0.7 },
						colors: sage,
						scalar: 0.85
					}),
				260
			);
		});
	});

	function mealLabel(m: { isChild: boolean; attendanceType: string; meal: string | null }) {
		if (m.isChild) return "Kids' menu";
		if (m.attendanceType === 'evening') return 'Evening · Baz & Fred pizza';
		if (m.meal === 'veg') return 'Vegetarian';
		if (m.meal === 'non-veg') return 'Standard menu';
		return '';
	}
</script>

<Flora side="left" />
<div class="form-panel-bg" aria-hidden="true"></div>

<main class="rsvp">
	<!-- Full-width hero banner with the Tithe Barn video behind it. -->
	<header class="hero-banner" use:reveal>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video class="hero-bg" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
			<source src="/video/tithe-barn.mp4" type="video/mp4" />
		</video>
		<div class="hero-overlay" aria-hidden="true"></div>
		<div class="hero-content">
			<p class="eyebrow fade-in">You are invited to the wedding of</p>
			<svg
				class="title-svg"
				viewBox="0 0 700 220"
				preserveAspectRatio="xMidYMid meet"
				role="img"
				aria-label={WEDDING.coupleName}
			>
				<text class="title-text" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">
					{WEDDING.coupleName}
				</text>
			</svg>
			<img src="/flora/layer-13.png" class="title-sprig fade-in" alt="" aria-hidden="true" />
			<p class="when fade-in">{WEDDING.dateLong}</p>
			<p class="where fade-in">{WEDDING.venueName} · Bolton Abbey · Yorkshire Dales</p>
			{#if daysToGo !== null}
				<p class="countdown fade-in">
					<span class="cd-num">{daysToGo}</span>
					<span class="cd-label">{daysToGo === 1 ? 'day' : 'days'} to go</span>
				</p>
			{/if}
			<div class="fade-in"><MusicBanner /></div>
		</div>
	</header>

	<div class="rsvp-grid">
		{#if data.group.personalMessage}
			<section class="personal" use:reveal>
				<p>{data.group.personalMessage}</p>
			</section>
		{/if}

		<!-- The Day -->
		<section class="card" use:reveal>
		<h2 class="card-title script">The Day</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<ul class="timetable">
			{#each CEREMONY_TIMETABLE as row}
				<li>
					<span class="t">{row.time}</span>
					<span class="d"></span>
					<span class="w">{row.what}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Dress Code -->
	<section class="card center" use:reveal>
		<h2 class="card-title script">Dress Code</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="lead">{WEDDING.dressCode.headline}</p>
		<p class="body">{WEDDING.dressCode.body}</p>
	</section>

	{#if form?.saved}
		<!-- Submission summary — replaces the form entirely on success. -->
		<section class="card center success-card col-right" use:reveal>
			<h2 class="card-title script">We look forward to seeing you!</h2>
			<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
			<p class="body">Your reply is saved. You can update it any time from this link.</p>
			<ul class="summary">
				{#each data.members as m (m.id)}
					<li class="srow" class:declined={m.rsvpStatus === 'no'}>
						<span class="s-name">{m.name}</span>
						<span class="s-status">
							{#if m.rsvpStatus === 'yes'}Joyfully attending
							{:else if m.rsvpStatus === 'no'}Sending regrets
							{:else}—{/if}
						</span>
						{#if m.rsvpStatus === 'yes'}
							{#if mealLabel(m)}
								<span class="s-meal">{mealLabel(m)}</span>
							{/if}
							{#if m.dietaryNotes}
								<span class="s-diet">"{m.dietaryNotes}"</span>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
			{#if data.group.allergiesNote}
				<p class="note"><b>Note to us:</b> {data.group.allergiesNote}</p>
			{/if}
			{#if data.group.message}
				<p class="msg"><em>"{data.group.message}"</em></p>
			{/if}
			<a class="update-link" href={`/rsvp/${data.group.token}`}>Need to change something? Reload to edit →</a>
		</section>
	{:else}
	<!-- Please Reply -->
	<section class="card rsvp-form col-right" use:reveal>
		<h2 class="card-title script">Please Reply</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="deadline">Kindly RSVP by <b>{WEDDING.rsvpDeadline}</b>.</p>

		<form method="POST" use:enhance>
			{#each data.members as m (m.id)}
				<fieldset class:plusone={m.isPlusOne} class:kid={m.isChild}>
					<legend>
						<span class="member-name script">
							{#if m.isChild}
								Will little {m.name.split(' ')[0]} be joining us?
							{:else if m.isPlusOne}
								Your plus one
							{:else}
								{m.name}
							{/if}
						</span>
						<span class="type">
							·
							{#if m.isChild}
								Child
							{:else}
								{m.attendanceType === 'day' ? 'Day & evening' : 'Evening reception'}
							{/if}
						</span>
					</legend>

					{#if m.isPlusOne}
						<p class="plusnote">
							{m.relation ?? "You're welcome to bring a guest"} — let us know who's joining you.
						</p>
						<div class="plusfields">
							<label class="field">
								Their name
								<input name="name_{m.id}" placeholder="e.g. Sam Bennett" />
							</label>
							<label class="field">
								Relation (optional)
								<input name="relation_{m.id}" placeholder="e.g. partner" />
							</label>
						</div>
					{/if}

					<div class="toggle-group">
						<label class="toggle accept">
							<input
								type="radio"
								name="attend_{m.id}"
								value="yes"
								checked={m.rsvpStatus === 'yes'}
								onchange={() => (attending[m.id] = 'yes')}
							/>
							<span>Joyfully accepts</span>
						</label>
						<label class="toggle decline">
							<input
								type="radio"
								name="attend_{m.id}"
								value="no"
								checked={m.rsvpStatus === 'no'}
								onchange={() => (attending[m.id] = 'no')}
							/>
							<span>Regretfully declines</span>
						</label>
					</div>

					{#if attending[m.id] === 'yes'}
						{#if m.attendanceType === 'evening'}
							<p class="pizza">
								You'll be joining us for <b>Baz &amp; Fred</b> wood-fired pizza, handmade on site —
								served to everyone in the evening.
							</p>
						{:else if m.isChild}
							<p class="kids">Children are served from our <b>kids' menu</b>.</p>
						{:else}
							<p class="sub-label">Meal choice</p>
							<div class="toggle-group">
								<label class="toggle">
									<input
										type="radio"
										name="meal_{m.id}"
										value="non-veg"
										checked={m.meal === 'non-veg'}
									/>
									<span>Standard menu</span>
								</label>
								<label class="toggle">
									<input
										type="radio"
										name="meal_{m.id}"
										value="veg"
										checked={m.meal === 'veg'}
									/>
									<span>Vegetarian</span>
								</label>
							</div>
						{/if}

						<label class="field">
							Allergies / Dietary notes
							<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} placeholder="Optional" />
						</label>
					{/if}
				</fieldset>
			{/each}

			<label class="field">
				Anything else we should know about?
				<textarea
					name="allergies"
					rows="2"
					placeholder="e.g. high chair needed, access requirements…"
					>{data.group.allergiesNote ?? ''}</textarea
				>
			</label>
			<label class="field">
				A message to the couple <span class="optional">(optional)</span>
				<textarea name="message" rows="3" placeholder="Leave us a note…"
					>{data.group.message ?? ''}</textarea
				>
			</label>
			<button type="submit" class="primary">Send our reply</button>
		</form>
	</section>
	{/if}

	<!-- The Menu -->
	<section class="card menu-card" use:reveal>
		<h2 class="card-title script">The Menu</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<div class="menu-video">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				src="/video/cripps-food.webm"
				autoplay
				muted
				loop
				playsinline
				preload="metadata"
			></video>
		</div>
		<dl class="menu">
			<dt>Canapés</dt>
			<dd>
				{#each MENU.canapes as c, i}{c}{#if i < MENU.canapes.length - 1}<br />{/if}{/each}
			</dd>
			<dt>Starter</dt>
			<dd>{MENU.starter}</dd>
			<dt>Main</dt>
			<dd>{MENU.main}</dd>
			<dt>Vegetarian main</dt>
			<dd>{MENU.mainVeg}</dd>
			<dt>Sides</dt>
			<dd>
				{#each MENU.sides as s, i}{s}{#if i < MENU.sides.length - 1}<br />{/if}{/each}
			</dd>
			<dt>Dessert</dt>
			<dd>{MENU.dessert}</dd>
			<dt>Tea &amp; coffee</dt>
			<dd>{MENU.teaCoffee}</dd>
			<dt>In the evening</dt>
			<dd>{MENU.evening}</dd>
			<dt>Drinks</dt>
			<dd>{MENU.drinks}</dd>
			<dt>Children</dt>
			<dd>{MENU.kids}</dd>
		</dl>
	</section>

	<!-- Gifts -->
	<section class="card center" use:reveal>
		<h2 class="card-title script">Gifts</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="lead">{GIFTS.headline}</p>
		<p class="body">{GIFTS.body}</p>
		<a class="primary-link" href={WEDDING.paypalLink} target="_blank" rel="noopener">
			Contribute to the honeymoon →
		</a>
	</section>

	<!-- Getting There -->
	<section class="card" use:reveal>
		<h2 class="card-title script">Getting There</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<div class="grid-2">
			<div>
				<h4 class="micro">Address</h4>
				<p>{WEDDING.venueName}, Bolton Abbey, {WEDDING.venuePostcode}</p>
			</div>
			<div>
				<h4 class="micro">Parking</h4>
				<p>{TRAVEL.parking}</p>
			</div>
			<div>
				<h4 class="micro">By train</h4>
				<p>{TRAVEL.station} {TRAVEL.driveFromSkipton}</p>
			</div>
			<div>
				<h4 class="micro">Taxis</h4>
				<ul class="phones">
					{#each TAXIS as t}
						<li>
							{t.name} · <a href={`tel:${t.phone.replace(/\s/g, '')}`}>{t.phone}</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="map">
			<iframe
				title="Map of The Tithe Barn, Bolton Abbey"
				src={WEDDING.mapEmbed}
				width="100%"
				height="280"
				loading="lazy"
			></iframe>
		</div>
		<div class="centered-links">
			<a href={WEDDING.mapLink} target="_blank" rel="noopener">Open in maps →</a>
			<span class="dot">·</span>
			<a href={WEDDING.venueWebsite} target="_blank" rel="noopener">Visit the Tithe Barn →</a>
		</div>
	</section>

	<!-- Where to Stay -->
	<section class="card" use:reveal>
		<h2 class="card-title script">Where to Stay</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<ul class="accom">
			{#each ACCOMMODATION as a}
				<li>
					<div class="accom-head">
						<a href={a.url} target="_blank" rel="noopener" class="accom-name">{a.name}</a>
						{#if a.phone}
							<a href={`tel:${a.phone.replace(/\s/g, '')}`} class="accom-phone">{a.phone}</a>
						{/if}
					</div>
					<p class="accom-note">{a.note}</p>
				</li>
			{/each}
		</ul>
	</section>

		<section class="card center contact-card" use:reveal>
			<h2 class="card-title script">Any questions?</h2>
			<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
			<p class="body">
				Drop us a line — we'd love to hear from you.
			</p>
			<p class="contact-lines">
				<a href={`mailto:${WEDDING.contact.email}`}>{WEDDING.contact.email}</a>
				<br />
				<a href={`tel:${WEDDING.contact.phone.replace(/\s/g, '')}`}>{WEDDING.contact.phone}</a>
			</p>
		</section>
	</div>

	<footer class="foot" use:reveal>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="script">With love · A &amp; K</p>
	</footer>
</main>

<style>
	.rsvp {
		color: var(--body);
		position: relative;
		z-index: 1;
	}

	/* Fixed sage panel covering only the right half of the viewport on desktop —
	   leaves the left half untouched so the cream body bg + flora show through. */
	.form-panel-bg {
		display: none;
	}
	@media (min-width: 960px) {
		.form-panel-bg {
			display: block;
			position: fixed;
			top: 0;
			right: 0;
			width: 50vw;
			height: 100vh;
			background: var(--sage-soft);
			z-index: 0;
			pointer-events: none;
		}
	}

	/* ---- Hero banner (above the split) ---- */
	.hero-banner {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		padding: 80px 22px 64px;
		text-align: center;
		min-height: 65vh;
		display: flex;
		align-items: center;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -2;
	}
	.hero-overlay {
		position: absolute;
		inset: 0;
		/* Soft dark wash for richness — paired with light text below */
		background: linear-gradient(180deg, rgba(20, 19, 16, 0.45), rgba(20, 19, 16, 0.35) 55%, rgba(20, 19, 16, 0.55));
		z-index: -1;
	}
	.hero-content {
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
		color: var(--bg);
	}
	.hero-content .eyebrow {
		color: rgba(251, 250, 246, 0.85);
	}
	.hero-content h1 {
		font-size: clamp(64px, 14vw, 110px);
		margin: 6px 0 8px;
		line-height: 1;
		color: #fbfaf6;
		text-shadow: 0 2px 22px rgba(0, 0, 0, 0.25);
	}

	/* SVG draw-in title — strokes the script letterforms first, then fills.
	   Other hero items wait for the draw to finish before fading in. */
	.title-svg {
		display: block;
		width: min(680px, 92%);
		margin: 6px auto 8px;
		filter: drop-shadow(0 2px 22px rgba(0, 0, 0, 0.25));
	}
	.title-text {
		font-family: var(--script);
		font-size: 168px;
		fill: #fbfaf6;
		fill-opacity: 0;
		stroke: #fbfaf6;
		stroke-width: 1.1;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-dasharray: 2800;
		stroke-dashoffset: 2800;
		animation: titleWrite 2.2s cubic-bezier(0.4, 0, 0.3, 1) 0.25s forwards;
	}
	@keyframes titleWrite {
		0% {
			stroke-dashoffset: 2800;
			fill-opacity: 0;
		}
		70% {
			stroke-dashoffset: 0;
			fill-opacity: 0;
		}
		100% {
			stroke-dashoffset: 0;
			fill-opacity: 1;
		}
	}

	/* The eyebrow, sprig, date, venue, countdown and music banner wait until
	   the title finishes drawing, then ease in. */
	.fade-in {
		opacity: 0;
		transform: translateY(8px);
		animation: heroFadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 2s forwards;
	}
	.fade-in:nth-child(1) { animation-delay: 2.05s; }
	.fade-in:nth-child(n + 3) { animation-delay: 2.25s; }
	.fade-in:nth-child(n + 4) { animation-delay: 2.35s; }
	.fade-in:nth-child(n + 5) { animation-delay: 2.45s; }
	.fade-in:nth-child(n + 6) { animation-delay: 2.55s; }
	.fade-in:nth-child(n + 7) { animation-delay: 2.7s; }
	@keyframes heroFadeIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.title-text {
			animation: none;
			stroke-dashoffset: 0;
			fill-opacity: 1;
		}
		.fade-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
	.hero-content .when {
		color: #fbfaf6;
	}
	.hero-content .where {
		color: rgba(251, 250, 246, 0.78);
	}
	.hero-content .title-sprig {
		filter: brightness(0) invert(1) opacity(0.7);
	}

	/* ---- Grid below the hero ---- */
	.rsvp-grid {
		max-width: 620px;
		margin: 0 auto;
		padding: 36px 22px 60px;
		display: flex;
		flex-direction: column;
	}
	.rsvp-grid > * {
		margin-top: 0;
	}
	.rsvp-grid > * + * {
		margin-top: 22px;
	}

	/* Desktop: full-width 50/50 grid with sage right panel */
	@media (min-width: 960px) {
		.hero-banner {
			min-height: 75vh;
			padding: 100px 24px 88px;
		}
		.hero-content h1 {
			font-size: clamp(96px, 11vw, 168px);
		}

		.rsvp-grid {
			max-width: none;
			padding: 0 0 120px;
			display: grid;
			grid-template-columns: 1fr 1fr;
			column-gap: 0;
			row-gap: 0;
			align-items: start;
			/* No background here — left half shows the body cream + flora behind,
			   right half is painted by the fixed .form-panel-bg below. */
		}
		.rsvp-grid > * {
			grid-column: 1;
			width: min(580px, calc(100% - 48px));
			margin: 0 auto !important;
			min-width: 0;
		}
		.rsvp-grid > * + * {
			margin-top: 28px !important;
		}
		.rsvp-grid > :first-child {
			margin-top: 96px !important;
		}

		/* Wider cards on desktop so content fills the column more */
		.rsvp-grid > * {
			width: min(640px, calc(100% - 48px));
		}

		/* The form/success card sits in the right column, sticky at the top */
		.rsvp-grid > .col-right {
			grid-column: 2;
			grid-row: 1 / span 99;
			width: min(600px, calc(100% - 48px));
			margin: 96px auto !important;
			align-self: start;
			position: sticky;
			top: 32px;
		}

		/* Universal font bump on desktop */
		.card { padding: 36px 40px 32px; overflow: hidden; }
		.card-title { font-size: 52px; }
		.card .body, .card p { font-size: 15.5px; }
		.timetable li { font-size: 16px; }
		.menu dd { font-size: 17px; }
		.accom-name { font-size: 20px; }
		.accom-note { font-size: 14.5px; }
		.field input, .field textarea { font-size: 15.5px; padding: 12px 14px; }
		.toggle span { font-size: 11.5px; padding: 13px 14px; }
		.member-name { font-size: 28px; }
		.primary { font-size: 12.5px; padding: 17px 28px; }
		.eyebrow { font-size: 12.5px; }
		.when { font-size: 13.5px; }
		.where { font-size: 11.5px; }
		.lead { font-size: 22px; }
	}

	/* ---- Hero ---- */
	.hero {
		text-align: center;
		padding: 60px 0 32px;
	}
	.hero h1 {
		font-size: clamp(62px, 14vw, 110px);
		margin: 4px 0 6px;
		line-height: 1;
		color: var(--ink);
	}
	.title-sprig {
		display: block;
		width: 28px;
		margin: 14px auto 16px;
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
		margin: 8px 0 0;
	}
	.countdown {
		display: inline-flex;
		align-items: baseline;
		gap: 10px;
		margin: 22px auto 0;
		padding: 7px 18px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--card);
	}
	.cd-num {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 22px;
		color: var(--sage-deep);
	}
	.cd-label {
		font-size: 10.5px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.personal {
		background: var(--rose-bg);
		border-radius: 14px;
		padding: 20px 24px;
		margin-top: 12px;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.55;
		color: var(--ink);
		text-align: center;
		font-style: italic;
	}

	/* ---- Cards ---- */
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 18px;
		padding: 36px 36px 32px;
		margin-top: 26px;
		position: relative;
	}
	.card.center {
		text-align: center;
	}
	.menu-card {
		background: #f4ede0;
		border-color: #e8dec6;
	}
	.card-title {
		font-family: var(--script);
		font-weight: 400;
		text-align: center;
		font-size: 42px;
		line-height: 1;
		color: var(--ink);
		margin: 0;
	}
	.card-sprig {
		display: block;
		width: 22px;
		margin: 10px auto 22px;
		opacity: 0.7;
	}

	/* ---- The Day ---- */
	.timetable {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 460px;
	}
	@media (min-width: 960px) {
		.timetable { max-width: none; }
	}
	.timetable li {
		display: grid;
		grid-template-columns: 80px 18px 1fr;
		gap: 14px;
		align-items: center;
		padding: 7px 0;
		font-size: 14.5px;
	}
	.timetable .t {
		font-family: var(--sans);
		font-weight: 500;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
	}
	.timetable .d {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: 1px solid var(--sage);
		justify-self: center;
		background: transparent;
	}
	.timetable .w {
		color: var(--body);
	}

	.thanks {
		background: var(--sage-soft);
		color: var(--sage-deep);
		border-radius: 12px;
		padding: 14px 18px;
		margin-top: 22px;
		text-align: center;
	}

	/* ---- Please Reply ---- */
	.deadline {
		text-align: center;
		color: var(--body);
		margin: 0 0 24px;
	}
	.rsvp-form fieldset {
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 22px 22px 18px;
		margin: 0 0 24px;
	}
	.rsvp-form fieldset:last-of-type {
		margin-bottom: 8px;
	}
	.rsvp-form fieldset.plusone {
		background: var(--sage-soft);
		border-color: var(--sage);
	}
	.rsvp-form legend {
		padding: 0 8px;
	}
	.member-name {
		font-family: var(--script);
		font-size: 26px;
		color: var(--ink);
		line-height: 1;
		display: inline-block;
		margin-right: 4px;
	}
	.type {
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.plusnote {
		font-size: 13.5px;
		color: var(--body);
		margin: 6px 0 12px;
	}
	.plusfields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 14px;
	}
	@media (max-width: 480px) {
		.plusfields {
			grid-template-columns: 1fr;
		}
	}

	.sub-label {
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--muted);
		margin: 14px 0 8px;
	}

	.toggle-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		margin: 12px 0;
	}
	.toggle {
		position: relative;
		display: block;
		cursor: pointer;
	}
	.toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		margin: 0;
		padding: 0;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		overflow: hidden;
		pointer-events: none;
	}
	.toggle span {
		display: block;
		text-align: center;
		padding: 12px 14px;
		border: 1px solid var(--line);
		font-size: 10.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--muted);
		background: #fff;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease;
		user-select: none;
	}
	.toggle:first-of-type span {
		border-radius: 10px 0 0 10px;
		border-right: 0;
	}
	.toggle:last-of-type span {
		border-radius: 0 10px 10px 0;
	}
	.toggle:hover span {
		color: var(--sage-deep);
		border-color: var(--sage);
	}
	.toggle input:checked ~ span {
		background: var(--sage);
		color: #fff;
		border-color: var(--sage);
	}
	.toggle:first-of-type input:checked ~ span {
		border-right: 1px solid var(--sage);
	}
	.toggle input:focus-visible ~ span {
		outline: 2px solid var(--sage);
		outline-offset: 2px;
	}

	/* Decline gets a softer beige treatment (matches the menu card) — it's not
	   a "celebration" colour, but still clearly chosen. */
	.toggle.decline:hover span {
		color: #8c7a4e;
		border-color: #d9cca8;
		background: #faf3e3;
	}
	.toggle.decline input:checked ~ span {
		background: #f4ede0;
		color: var(--ink);
		border-color: #d9cca8;
	}
	.toggle.decline input:focus-visible ~ span {
		outline-color: #d9cca8;
	}

	.pizza,
	.kids {
		font-size: 13.5px;
		color: var(--body);
		padding: 10px 14px;
		border-radius: 10px;
		margin: 12px 0;
	}
	.pizza {
		background: var(--sage-soft);
	}
	.kids {
		background: var(--rose-bg);
	}

	.field {
		display: grid;
		gap: 6px;
		font-size: 10.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--muted);
		margin-top: 14px;
	}
	.field input,
	.field textarea {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 11px 14px;
		font: inherit;
		font-size: 14px;
		text-transform: none;
		letter-spacing: normal;
		font-weight: 400;
		color: var(--ink);
		background: #fff;
	}
	.field textarea {
		resize: vertical;
		min-height: 60px;
	}
	.optional {
		text-transform: lowercase;
		letter-spacing: 0.04em;
		font-weight: 400;
		color: var(--faint);
		font-size: 10.5px;
		margin-left: 4px;
	}

	.primary {
		margin-top: 24px;
		width: 100%;
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 12px;
		padding: 16px 28px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.primary:hover {
		background: var(--sage-deep);
	}

	/* ---- Menu ---- */
	.menu-video {
		/* Break out of the card padding so the video runs flush with the card edges */
		margin: -8px -40px 28px;
		border-radius: 0;
		overflow: hidden;
		background: #1a1a1a;
		aspect-ratio: 16 / 9;
		width: calc(100% + 80px);
	}
	.menu-video video {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.menu {
		max-width: none;
		margin: 0 auto;
		text-align: center;
	}
	@media (max-width: 559px) {
		.menu-video {
			margin: -4px -22px 22px;
			width: calc(100% + 44px);
		}
	}
	.menu dt {
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--sage-deep);
		margin-top: 18px;
	}
	.menu dt:first-child {
		margin-top: 0;
	}
	.menu dd {
		margin: 6px 0 0;
		font-family: var(--serif);
		font-size: 16px;
		color: var(--ink);
		line-height: 1.45;
	}

	/* ---- Gifts ---- */
	.lead {
		font-family: var(--serif);
		font-style: italic;
		font-size: 22px;
		color: var(--ink);
		margin: 0 0 14px;
	}
	.body {
		max-width: 560px;
		margin: 0 auto 22px;
		color: var(--body);
		font-size: 14.5px;
		line-height: 1.6;
	}
	.primary-link {
		display: inline-block;
		background: var(--sage);
		color: #fff;
		text-decoration: none;
		padding: 14px 28px;
		border-radius: 999px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 11.5px;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}
	.primary-link:hover {
		background: var(--sage-deep);
	}

	/* ---- Getting There ---- */
	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 22px 32px;
		margin-bottom: 22px;
	}
	@media (max-width: 480px) {
		.grid-2 {
			grid-template-columns: 1fr;
			gap: 16px;
		}
	}
	.micro {
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--sage-deep);
		margin: 0 0 8px;
	}
	.grid-2 p {
		margin: 0;
		font-size: 13.5px;
		color: var(--body);
		line-height: 1.55;
	}
	.phones {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.phones li {
		font-size: 13px;
		color: var(--body);
		padding: 2px 0;
	}
	.phones a {
		color: var(--sage-deep);
		text-decoration: none;
	}
	.phones a:hover {
		text-decoration: underline;
	}

	.map iframe {
		display: block;
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 12px;
	}
	.centered-links {
		text-align: center;
		margin-top: 14px;
		font-size: 12.5px;
	}
	.centered-links a {
		color: var(--sage-deep);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.centered-links a:hover {
		border-bottom-color: var(--sage);
	}
	.centered-links .dot {
		margin: 0 10px;
		color: var(--faint);
	}

	/* ---- Accommodation ---- */
	.accom {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.accom li {
		padding: 14px 0;
		border-bottom: 1px solid var(--line2);
	}
	.accom li:last-child {
		border-bottom: 0;
	}
	.accom-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
	}
	.accom-name {
		font-family: var(--serif);
		font-size: 18px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 500;
	}
	.accom-name:hover {
		color: var(--sage-deep);
	}
	.accom-phone {
		font-size: 12.5px;
		color: var(--sage-deep);
		text-decoration: none;
		letter-spacing: 0.04em;
	}
	.accom-note {
		margin: 6px 0 0;
		font-size: 13.5px;
		color: var(--body);
		line-height: 1.5;
	}

	/* ---- Success summary (replaces form on submit) ---- */
	.success-card {
		background: var(--sage-soft);
		border-color: var(--sage);
	}
	.summary {
		list-style: none;
		margin: 18px 0 0;
		padding: 0;
		text-align: left;
	}
	.srow {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas:
			'name status'
			'meal meal'
			'diet diet';
		row-gap: 2px;
		column-gap: 12px;
		padding: 14px 0;
		border-bottom: 1px solid rgba(81, 96, 63, 0.18);
	}
	.srow:last-child {
		border-bottom: 0;
	}
	.s-name {
		grid-area: name;
		font-family: var(--serif);
		font-size: 18px;
		color: var(--ink);
		font-weight: 600;
	}
	.s-status {
		grid-area: status;
		font-size: 10.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sage-deep);
		font-weight: 600;
		align-self: center;
	}
	.declined .s-status {
		color: var(--muted);
	}
	.s-meal {
		grid-area: meal;
		font-size: 13px;
		color: var(--body);
	}
	.s-diet {
		grid-area: diet;
		font-size: 12.5px;
		color: var(--muted);
		font-style: italic;
	}
	.success-card .note,
	.success-card .msg {
		margin-top: 16px;
		font-size: 13.5px;
		color: var(--ink);
	}
	.success-card .msg {
		font-family: var(--serif);
		font-size: 16px;
		font-style: italic;
	}
	.update-link {
		display: inline-block;
		margin-top: 22px;
		font-size: 12.5px;
		color: var(--sage-deep);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.update-link:hover {
		border-bottom-color: var(--sage);
	}

	/* ---- Contact card ---- */
	.contact-lines {
		font-family: var(--serif);
		font-size: 18px;
		line-height: 1.7;
		margin: 8px 0 0;
		color: var(--ink);
	}
	.contact-lines a {
		color: var(--sage-deep);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.contact-lines a:hover {
		border-bottom-color: var(--sage);
	}

	/* ---- Footer ---- */
	.foot {
		text-align: center;
		margin-top: 40px;
		color: var(--muted);
	}
	.foot .script {
		font-size: 32px;
		color: var(--sage);
	}

	@media (max-width: 560px) {
		.card {
			padding: 28px 22px 24px;
		}
	}
</style>

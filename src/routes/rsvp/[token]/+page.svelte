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
	import MusicPlayer from '$lib/components/MusicPlayer.svelte';
	import { reveal } from '$lib/actions/reveal';
	let { data, form } = $props();
</script>

<Flora />
<MusicPlayer />

<main class="rsvp">
	<header class="hero" use:reveal>
		<p class="eyebrow">You are invited to the wedding of</p>
		<h1 class="script">{WEDDING.coupleName}</h1>
		<img src="/flora/layer-13.png" class="title-sprig" alt="" aria-hidden="true" />
		<p class="when">{WEDDING.dateLong}</p>
		<p class="where">{WEDDING.venueName} · Bolton Abbey · Yorkshire Dales</p>
	</header>

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
		<div class="dress">
			<p class="dress-label">A gentle note on dress</p>
			<p class="dress-body">{WEDDING.dressNote}</p>
		</div>
	</section>

	{#if form?.saved}
		<div class="thanks" use:reveal>
			Thank you — your reply is saved. You can change it any time from this link.
		</div>
	{/if}

	<!-- Please Reply -->
	<section class="card rsvp-form" use:reveal>
		<h2 class="card-title script">Please Reply</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="deadline">Kindly RSVP by <b>{WEDDING.rsvpDeadline}</b>.</p>

		<form method="POST" use:enhance>
			{#each data.members as m (m.id)}
				<fieldset class:plusone={m.isPlusOne}>
					<legend>
						<span class="member-name script">{m.isPlusOne ? 'Your plus one' : m.name}</span>
						<span class="type">
							·
							{m.attendanceType === 'day' ? 'Day & evening' : 'Evening reception'}
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
						<label class="toggle">
							<input
								type="radio"
								name="attend_{m.id}"
								value="yes"
								checked={m.rsvpStatus === 'yes'}
							/>
							<span>Joyfully accepts</span>
						</label>
						<label class="toggle">
							<input
								type="radio"
								name="attend_{m.id}"
								value="no"
								checked={m.rsvpStatus === 'no'}
							/>
							<span>Regretfully declines</span>
						</label>
					</div>

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

	<!-- The Menu -->
	<section class="card menu-card" use:reveal>
		<h2 class="card-title script">The Menu</h2>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
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

	<footer class="foot" use:reveal>
		<img src="/flora/layer-13.png" class="card-sprig" alt="" aria-hidden="true" />
		<p class="script">With love · A &amp; K</p>
	</footer>
</main>

<style>
	.rsvp {
		max-width: 620px;
		margin: 0 auto;
		padding: 5vh 22px 60px;
		color: var(--body);
		position: relative;
		z-index: 1;
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
		max-width: 360px;
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

	.dress {
		margin: 26px auto 0;
		max-width: 460px;
		background: var(--sage-soft);
		border-radius: 12px;
		padding: 16px 20px;
		text-align: left;
	}
	.dress-label {
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--sage-deep);
		margin: 0 0 6px;
	}
	.dress-body {
		margin: 0;
		color: var(--sage-deep);
		font-size: 13.5px;
		line-height: 1.55;
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
		margin: 0 0 16px;
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
	.menu {
		max-width: 460px;
		margin: 0 auto;
		text-align: center;
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
		max-width: 440px;
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

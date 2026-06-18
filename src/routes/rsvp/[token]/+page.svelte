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
	let { data, form } = $props();
</script>

<main class="rsvp">
	<header class="hero">
		<p class="eyebrow">You are invited to the wedding of</p>
		<h1 class="script">{WEDDING.coupleName}</h1>
		<p class="when">
			{WEDDING.dateLong}<br />
			{WEDDING.venueName} · {WEDDING.venueArea}
		</p>
	</header>

	{#if data.group.personalMessage}
		<section class="personal">
			<p>{data.group.personalMessage}</p>
		</section>
	{/if}

	<section class="card">
		<h2 class="kick">The day</h2>
		<ul class="timetable">
			{#each CEREMONY_TIMETABLE as row}
				<li><span class="t">{row.time}</span><span class="w">{row.what}</span></li>
			{/each}
		</ul>
		<p class="fine">Dress code · <b>{WEDDING.dressCode}</b></p>
	</section>

	{#if form?.saved}
		<div class="thanks">Thank you — your reply is saved. You can change it any time from this link.</div>
	{/if}

	<section class="card rsvp-form">
		<h2 class="kick">Please reply</h2>
		<p class="deadline">Kindly RSVP by <b>{WEDDING.rsvpDeadline}</b>.</p>
		<form method="POST" use:enhance>
			{#each data.members as m (m.id)}
				<fieldset class:plusone={m.isPlusOne}>
					<legend>
						{m.isPlusOne ? 'Your plus one' : m.name}
						<span class="type">· {m.attendanceType === 'day' ? 'Day & evening' : 'Evening reception'}</span>
					</legend>
					{#if m.isPlusOne}
						<p class="plusnote">{m.relation ?? "You're welcome to bring a guest"} — let us know who's joining you.</p>
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
					<div class="attend">
						<label>
							<input type="radio" name="attend_{m.id}" value="yes" checked={m.rsvpStatus === 'yes'} />
							Joyfully accepts
						</label>
						<label>
							<input type="radio" name="attend_{m.id}" value="no" checked={m.rsvpStatus === 'no'} />
							Regretfully declines
						</label>
					</div>
					{#if m.attendanceType === 'evening'}
						<p class="pizza">
							In the evening we'll be serving <b>Baz &amp; Fred</b> wood-fired pizza,
							made by hand on site.
						</p>
						<label class="field">
							Allergies / dietary notes
							<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} />
						</label>
					{:else if m.isChild}
						<p class="kids">Children are served from our <b>kids' menu</b>.</p>
						<label class="field">
							Allergies / dietary notes
							<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} />
						</label>
					{:else}
						<div class="meal">
							<label>
								<input type="radio" name="meal_{m.id}" value="non-veg" checked={m.meal === 'non-veg'} />
								Standard menu
							</label>
							<label>
								<input type="radio" name="meal_{m.id}" value="veg" checked={m.meal === 'veg'} />
								Vegetarian
							</label>
						</div>
						<label class="field">
							Allergies / dietary notes
							<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} />
						</label>
					{/if}
				</fieldset>
			{/each}

			<section class="menu-block">
				<h3 class="kick small">Menu</h3>
				<dl class="menu">
					<dt>Canapés</dt>
					<dd>{#each MENU.canapes as c, i}{c}{#if i < MENU.canapes.length - 1} · {/if}{/each}</dd>
					<dt>Starter</dt>
					<dd>{MENU.starter}</dd>
					<dt>Main</dt>
					<dd>{MENU.main}</dd>
					<dt>Vegetarian main</dt>
					<dd>{MENU.mainVeg}</dd>
					<dt>Sides</dt>
					<dd>{#each MENU.sides as s, i}{s}{#if i < MENU.sides.length - 1} · {/if}{/each}</dd>
					<dt>Dessert</dt>
					<dd>{MENU.dessert}</dd>
					<dt>Tea & coffee</dt>
					<dd>{MENU.teaCoffee}</dd>
					<dt>Evening</dt>
					<dd>{MENU.evening}</dd>
					<dt>Drinks</dt>
					<dd>{MENU.drinks}</dd>
					<dt>Children</dt>
					<dd>{MENU.kids}</dd>
				</dl>
				<label class="field allergies">
					Any allergies or dietary needs we should know about?
					<textarea
						name="allergies"
						rows="2"
						placeholder="e.g. nut allergy, gluten free, no dairy…"
					>{data.group.allergiesNote ?? ''}</textarea>
				</label>
			</section>

			<label class="field msg">
				A message to the couple (optional)
				<textarea name="message" rows="3">{data.group.message ?? ''}</textarea>
			</label>
			<button type="submit">Send our reply</button>
		</form>
	</section>

	<section class="card">
		<h2 class="kick">Gifts</h2>
		<p class="lead">{GIFTS.headline}</p>
		<p>{GIFTS.body}</p>
		<a class="paypal" href={WEDDING.paypalLink} target="_blank" rel="noopener">Contribute via PayPal →</a>
	</section>

	<section class="card">
		<h2 class="kick">Getting there</h2>
		<p><b>Address</b><br />{WEDDING.venueName}, Bolton Abbey, {WEDDING.venuePostcode}</p>
		<p><b>Parking</b><br />{TRAVEL.parking}</p>
		<p><b>By train</b><br />{TRAVEL.station} {TRAVEL.driveFromSkipton}</p>
		<p><b>Taxis</b></p>
		<ul class="taxis">
			{#each TAXIS as t}
				<li>{t.name} · <a href={`tel:${t.phone.replace(/\s/g, '')}`}>{t.phone}</a></li>
			{/each}
		</ul>
		<div class="map">
			<iframe
				title="Map of The Tithe Barn, Bolton Abbey"
				src={WEDDING.mapEmbed}
				width="100%"
				height="280"
				loading="lazy"
			></iframe>
			<p class="fine">
				<a href={WEDDING.mapLink} target="_blank" rel="noopener">Open in maps →</a>
				·
				<a href={WEDDING.venueWebsite} target="_blank" rel="noopener">Visit the Tithe Barn →</a>
			</p>
		</div>
	</section>

	<section class="card">
		<h2 class="kick">Where to stay</h2>
		<ul class="accom">
			{#each ACCOMMODATION as a}
				<li>
					<a href={a.url} target="_blank" rel="noopener"><b>{a.name}</b></a>
					{#if a.phone} · <a href={`tel:${a.phone.replace(/\s/g, '')}`}>{a.phone}</a>{/if}
					<div class="note">{a.note}</div>
				</li>
			{/each}
		</ul>
	</section>

	<footer class="foot">
		<p class="script">With love · A &amp; K</p>
	</footer>
</main>

<style>
	.rsvp {
		max-width: 620px;
		margin: 0 auto;
		padding: 6vh 22px 60px;
		color: var(--body);
	}
	.hero {
		text-align: center;
		padding-bottom: 8px;
	}
	.hero h1 {
		font-size: clamp(58px, 14vw, 96px);
		margin: 6px 0;
		line-height: 1;
	}
	.eyebrow {
		font-size: 11px;
		letter-spacing: 0.38em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0;
	}
	.when {
		font-family: var(--serif);
		font-size: 17px;
		color: var(--ink);
		line-height: 1.55;
		margin: 12px 0 0;
	}

	.personal {
		background: var(--rose-bg);
		border-radius: 14px;
		padding: 20px 24px;
		margin: 28px 0 0;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.55;
		color: var(--ink);
		text-align: center;
		font-style: italic;
	}

	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 22px 26px;
		margin-top: 22px;
	}
	.kick {
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 11.5px;
		color: var(--sage);
		margin: 0 0 14px;
	}
	.kick.small {
		font-size: 10.5px;
		margin: 0 0 10px;
	}

	.timetable {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.timetable li {
		display: grid;
		grid-template-columns: 100px 1fr;
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid var(--line2);
		font-size: 14.5px;
	}
	.timetable li:last-child {
		border-bottom: 0;
	}
	.timetable .t {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.timetable .w {
		color: var(--body);
	}
	.fine {
		margin: 14px 0 0;
		font-size: 13px;
		color: var(--muted);
		letter-spacing: 0.04em;
	}

	.thanks {
		background: var(--sage-soft);
		color: var(--sage-deep);
		border-radius: 12px;
		padding: 14px 18px;
		margin: 22px 0 0;
		text-align: center;
	}
	.deadline {
		margin: 0 0 14px;
		color: var(--body);
	}
	.rsvp-form fieldset {
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 18px 20px;
		margin: 0 0 14px;
	}
	.rsvp-form fieldset.plusone {
		background: var(--sage-soft);
		border-color: var(--sage);
	}
	.plusnote {
		font-size: 13.5px;
		color: var(--body);
		margin: 4px 0 12px;
	}
	.plusfields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 8px;
	}
	@media (max-width: 480px) {
		.plusfields { grid-template-columns: 1fr; }
	}
	.rsvp-form legend {
		font-family: var(--serif);
		font-size: 20px;
		color: var(--ink);
		padding: 0 8px;
	}
	.type {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.attend,
	.meal {
		display: flex;
		gap: 18px;
		flex-wrap: wrap;
		margin: 10px 0;
	}
	.attend label,
	.meal label {
		font-size: 14px;
	}
	.kids {
		font-size: 13.5px;
		color: var(--body);
		background: var(--rose-bg);
		padding: 8px 12px;
		border-radius: 8px;
	}
	.pizza {
		font-size: 13.5px;
		color: var(--body);
		background: var(--sage-soft);
		padding: 8px 12px;
		border-radius: 8px;
	}
	.field {
		display: grid;
		gap: 6px;
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
		margin-top: 8px;
	}
	.field input,
	.field textarea {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 12px;
		font: inherit;
		font-size: 14px;
		text-transform: none;
		letter-spacing: normal;
		color: var(--ink);
	}
	.msg {
		margin-top: 14px;
	}
	.rsvp-form button {
		margin-top: 18px;
		background: var(--sage);
		color: #fff;
		border: 0;
		border-radius: 10px;
		padding: 14px 28px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 13px;
		cursor: pointer;
		width: 100%;
	}

	.menu-block {
		margin-top: 18px;
		padding: 18px 20px;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 14px;
	}
	.menu dt {
		font-family: var(--sans);
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 10px;
		color: var(--sage);
		margin-top: 12px;
	}
	.menu dt:first-child {
		margin-top: 0;
	}
	.menu dd {
		margin: 4px 0 0;
		font-family: var(--serif);
		font-size: 16px;
		color: var(--ink);
		line-height: 1.45;
	}
	.allergies {
		margin-top: 18px;
		padding-top: 16px;
		border-top: 1px solid var(--line2);
	}

	.lead {
		font-family: var(--serif);
		font-size: 18px;
		color: var(--ink);
		margin: 0 0 8px;
	}
	.paypal {
		display: inline-block;
		margin-top: 8px;
		color: var(--sage-deep);
		font-weight: 500;
		text-decoration: none;
		border-bottom: 1px solid var(--sage);
	}

	.card p {
		margin: 0 0 12px;
	}
	.card p:last-child {
		margin-bottom: 0;
	}
	.card b {
		color: var(--ink);
	}
	.taxis {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
	}
	.taxis li {
		padding: 4px 0;
		font-size: 14px;
	}
	.taxis a {
		color: var(--sage-deep);
	}

	.map {
		margin-top: 8px;
	}
	.map iframe {
		display: block;
		border: 1px solid var(--line);
		border-radius: 12px;
	}
	.map .fine a {
		color: var(--sage-deep);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.map .fine a:hover {
		border-bottom-color: var(--sage);
	}

	.accom {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.accom li {
		padding: 10px 0;
		border-bottom: 1px solid var(--line2);
		font-size: 14.5px;
	}
	.accom li:last-child {
		border-bottom: 0;
	}
	.accom a {
		color: var(--sage-deep);
	}
	.accom .note {
		margin-top: 4px;
		color: var(--body);
		font-size: 13.5px;
	}

	.foot {
		text-align: center;
		margin-top: 36px;
		color: var(--muted);
	}
	.foot .script {
		font-size: 38px;
		color: var(--sage);
	}
</style>

<script lang="ts">
	// motion-site · profile: playful-editorial · archetype: pitch-landing · patterns: news-modal·village-duel·plan-cards·receipt·live-tally
	import { onMount } from 'svelte';
	import StendoIntro from '$lib/components/StendoIntro.svelte';
	import type { PageData } from './$types';
	import {
		VILLAGES, VILLAGE_IDS, LODGES, PLANS, ACCOM_CHOICES, BUDGETS, OFFER, STAY, CHECKED, HOME, FOOD_ROWS,
		summarisePlan, planFor, lodge, accomRange, GUEST_COUPLES, estimate, drive, fmtDrive, money, range, cleanName, nameKey,
		type VillageId, type AccomChoice, type Tally, type Response
	} from '$lib/stendo';
	import { WEDDING } from '$lib/wedding-info';

	let { data }: { data: PageData } = $props();

	const store = {
		get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
		set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
	};

	// ---- live totals (seeded from SSR, refreshed by polling) ----
	// svelte-ignore state_referenced_locally
	let tallyNow = $state<Tally>(data.tally);
	// svelte-ignore state_referenced_locally
	let names = $state<string[]>(data.names);
	// svelte-ignore state_referenced_locally
	let responded = $state<string[]>(data.responded);
	// svelte-ignore state_referenced_locally
	let organiser = $state<(Response & { updatedAt: string | null })[] | null>(data.organiser);

	// ---- this person's answers ----
	let myName = $state('');
	let village = $state<VillageId | null>(null);
	let accom = $state<AccomChoice | null>(null);
	let twinOk = $state(false);
	let budget = $state<string | null>(null);
	let offer = $state(false);
	let notes = $state('');
	let status = $state<'idle' | 'saving' | 'saved' | 'offline'>('idle');
	let newsOpen = $state(true); // the song opening is the front door, every visit
	let namePicker = $state(false);
	let typedName = $state('');

	// ---- where you're driving from (stays on this device) ----
	let postcode = $state('');
	let origin = $state<{ lat: number; lng: number; label: string }>({ ...HOME, label: 'Cullingworth' });
	let postcodeMsg = $state('');

	// The village whose details are on screen: your pick, else the one you're browsing.
	let browsing = $state<VillageId>('sherwood');
	const shown = $derived<VillageId>(browsing);
	const v = $derived(VILLAGES[shown]);
	const plans = $derived(PLANS.filter((p) => p.village === shown).map(summarisePlan).sort((a, b) => a.guestLow - b.guestLow || a.guestHigh - b.guestHigh));
	const budgetPlan = $derived(planFor(shown, 'budget'));
	const bougyPlan = $derived(planFor(shown, 'bougy'));
	const off = (n: number) => Math.max(0, n - OFFER);
	const priceSpan = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? money(lo) : `${money(lo)}–${money(hi)}`);
	const lodgesHere = $derived(LODGES.filter((l) => l.village === shown));
	const drives = $derived(Object.fromEntries(VILLAGE_IDS.map((id) => [id, drive(origin, id)])) as Record<VillageId, { miles: number; minutes: number }>);
	const est = $derived(estimate(shown, accom ?? 'either', offer, drives[shown].miles));
	const votesTotal = $derived(tallyNow.village.sherwood + tallyNow.village.longleat);
	const fromPrice = (id: VillageId) => Math.min(...PLANS.filter((p) => p.village === id).map((p) => summarisePlan(p).guestLow));

	function pickVillage(id: VillageId) {
		village = village === id ? null : id;
		browsing = id;
		scheduleSave();
	}

	// ---- persistence ----
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let loading = false;
	function scheduleSave() {
		if (loading) return;
		clearTimeout(saveTimer);
		if (!cleanName(myName)) return;
		status = 'saving';
		saveTimer = setTimeout(save, 450);
	}
	async function save() {
		const name = cleanName(myName);
		if (!name) return;
		try {
			const res = await fetch('/stendo/response', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, village, accom, twinOk, budget, offer, notes })
			});
			if (!res.ok) throw new Error(String(res.status));
			apply(await res.json());
			status = 'saved';
		} catch {
			status = 'offline';
		}
	}
	function apply(d: { tally?: Tally; names?: string[]; responded?: string[]; organiser?: typeof organiser }) {
		if (d.tally) tallyNow = d.tally;
		if (d.names) names = d.names;
		if (d.responded) responded = d.responded;
		if (d.organiser !== undefined) organiser = d.organiser;
	}
	async function chooseName(raw: string) {
		const name = cleanName(raw);
		if (!name) return;
		myName = name;
		namePicker = false;
		store.set('stendo.v2.name', name);
		loading = true;
		try {
			const res = await fetch(`/stendo/feed?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
			const d = await res.json();
			apply(d);
			const m = d.mine as Response | null;
			if (m) {
				village = m.village; accom = m.accom; twinOk = m.twinOk; budget = m.budget; offer = m.offer; notes = m.notes;
				if (m.village) browsing = m.village;
				status = 'saved';
			} else {
				status = 'idle';
			}
		} catch {
			status = 'offline';
		} finally {
			loading = false;
		}
	}
	async function refresh() {
		if (document.hidden || status === 'saving') return;
		try {
			const res = await fetch('/stendo/feed', { cache: 'no-store' });
			if (res.ok) apply(await res.json());
		} catch { /* keep the last totals */ }
	}

	async function lookupPostcode() {
		const pc = postcode.trim().toUpperCase();
		if (!pc) { origin = { ...HOME, label: 'Cullingworth' }; postcodeMsg = ''; store.set('stendo.v2.postcode', ''); return; }
		postcodeMsg = 'Looking that up…';
		const tryUrl = async (url: string) => {
			const r = await fetch(url);
			if (!r.ok) return null;
			const j = await r.json();
			return j.result?.latitude ? { lat: j.result.latitude as number, lng: j.result.longitude as number } : null;
		};
		try {
			const compact = pc.replace(/\s+/g, '');
			const hit = (await tryUrl(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`))
				?? (await tryUrl(`https://api.postcodes.io/outcodes/${encodeURIComponent(compact)}`));
			if (!hit) { postcodeMsg = 'Couldn’t find that postcode. Try the first half, e.g. BD13.'; return; }
			origin = { ...hit, label: pc };
			postcodeMsg = '';
			store.set('stendo.v2.postcode', pc);
		} catch {
			postcodeMsg = 'Postcode lookup is offline right now. Showing distances from Cullingworth.';
		}
	}

	onMount(() => {
		const saved = cleanName(store.get('stendo.v2.name'));
		if (saved) void chooseName(saved);
		const pc = store.get('stendo.v2.postcode');
		if (pc) { postcode = pc; void lookupPostcode(); }
		const poll = setInterval(refresh, 6000);
		return () => { clearInterval(poll); clearTimeout(saveTimer); };
	});

	const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
	const accomLabel = (id: AccomChoice | null) => ACCOM_CHOICES.find((a) => a.id === id)?.label ?? '—';
	const budgetLabel = (id: string | null) => BUDGETS.find((b) => b.id === id)?.label ?? '—';
</script>

<svelte:head>
	<title>The Stendo Vol. 02 · Center Parcs · {WEDDING.coupleName}</title>
	<meta name="robots" content="noindex" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Figtree:wght@400;500;600;700;800&family=Permanent+Marker&display=swap" />
	<link rel="preconnect" href="https://centerparcs.scene7.com" />
</svelte:head>

<StendoIntro bind:open={newsOpen} />

<div class="cp">
	<a class="skip" href="#vote">Skip to the vote</a>

	<nav class="mast wrap" aria-label="Page navigation">
		<a class="brand" href="#top"><span class="dot" aria-hidden="true">●</span> STEN RECORDS <small>VOL. 02 · THE FOREST SESSIONS</small></a>
		<div class="mast-links">
			<button type="button" onclick={() => (newsOpen = true)}>♪ The song</button>
			<a href="#vote">Vote</a><a href="#costs">Costs</a><a href="/stendo/archive">Archive</a>
		</div>
	</nav>

	<header class="hero" id="top">
		<img class="hero-img" src={VILLAGES.sherwood.hero} alt="Pine forest around the Center Parcs Sherwood village, seen from above" width="1800" height="900" fetchpriority="high" />
		<div class="hero-shade" aria-hidden="true"></div>
		<div class="hero-copy wrap">
			<p class="eyebrow">THE COUNTER-COUNTER-RECOUNTER-DOUBLE-BACK PITCH</p>
			<h1>Center<br /><span>Parcs.</span></h1>
			<p class="hero-sub">Six couples. A forest. A proper bed for everyone, one big lodge to pile into, and a pool with palm trees. No flights. No bunk beds. No floor-plan forensics.</p>
			<div class="ticket">
				<span class="ticket-side">ADMIT 12</span>
				<div><span class="eyebrow">FRI 19 → MON 22 MARCH ’27</span><b>THREE NIGHTS</b><span>Center Parcs weekends run Friday to Monday. Head home Sunday if you like.</span></div>
			</div>
			<div class="hero-actions">
				<a class="btn primary" href="#vote">Cast your vote <span aria-hidden="true">↓</span></a>
				<button class="btn ghost" type="button" onclick={() => (newsOpen = true)}>Why aren’t we flying?</button>
			</div>
		</div>
	</header>

	<div class="strip"><div class="wrap"><span>2 VILLAGES</span><i>✳</i><span>1 VOTE EACH</span><i>✳</i><span>EVERYONE IN A REAL BED</span><i>✳</i><span>£{OFFER} TOP-UP FROM US</span></div></div>

	<main>
		<!-- THE STORY SO FAR -->
		<section class="story wrap" aria-labelledby="story-title">
			<div class="story-head">
				<p class="eyebrow">PREVIOUSLY, ON THE STENDO</p>
				<h2 id="story-title">We looked.<br />We searched.<br /><span>We built three apps.</span></h2>
				<p class="marker">(and burned through a frankly unreasonable number of AI tokens)</p>
			</div>
			<div class="story-body">
				<p>Since the summer we’ve trawled Airbnb, Canine Cottages, holidaycottages.co.uk, CoolStays and owners’ own booking calendars. We shortlisted castles, barns and a lodge with a pool. We built a vote. Then we built another vote. Then we pitched Switzerland.</p>
				<p>Here’s what all that taught us: <strong>the house we were looking for doesn’t really exist.</strong></p>
				<div class="maths">
					<article><b>6 beds</b><span>usually comes with</span><strong>~3 bathrooms</strong><p>Somebody queues for the loo every morning.</p></article>
					<article><b>6 bathrooms</b><span>usually comes with</span><strong>~9 beds</strong><p>A house for 18, priced for 18. We’re 12.</p></article>
					<article class="ouch"><b>Add a hot tub or pool</b><span>and it climbs to</span><strong>£500–£600</strong><p>per couple. For two nights. Before food.</p></article>
				</div>
				<p class="pivot">So here is the counter-counter-recounter-double-back pitch. One last time, we promise. <a href="/stendo/archive">See the old shortlist →</a></p>
			</div>
		</section>

		<!-- WHY CENTER PARCS -->
		<section class="why" aria-labelledby="why-title">
			<div class="wrap">
				<p class="eyebrow">THE PITCH</p>
				<h2 id="why-title">Why the forest <span>wins.</span></h2>
				<div class="why-grid">
					<article><h3>Your bed, your bathroom</h3><p>Lodges are booked individually, so couples can have their own front door, double bed and bathroom — or share and save.</p></article>
					<article><h3>One big lodge</h3><p>We book at least one big house with a hot tub, sauna or games room. That’s base camp: drinks, games, Friday night.</p></article>
					<article><h3>The pool is free</h3><p>The Subtropical Swimming Paradise — rapids, slides, wave pool, palm trees in March — is included for everyone.</p></article>
					<article class="byo"><h3>Bring your own</h3><p><strong>Every lodge has a full kitchen, so bring your own food and drink.</strong> Fill the fridge, cook in at the big lodge, BYO everything. Eight restaurants and lodge delivery for when nobody can be bothered.</p></article>
					<article><h3>Three nights, not two</h3><p>Fri–Mon is the shortest weekend break. You get an extra night for roughly what the houses wanted for two.</p></article>
					<article><h3>As busy as you like</h3><p>Short drive, flat paths, a step-free lodge option, big sofas. Do the rapids and the archery, or do owls, pottery and the hot tub. Nobody’s keeping score.</p></article>
				</div>
				<aside class="offer" aria-labelledby="offer-title">
					<div class="offer-badge" aria-hidden="true"><b>£{OFFER}</b><span>per couple</span></div>
					<div>
						<p class="eyebrow">FROM KATIE & ALEX</p>
						<h3 id="offer-title">We’ll chip in £{OFFER} per couple.</h3>
						<p>If the price is the thing standing between you and a weekend with us, tick <em>“Include Katie & Alex’s offer”</em> below and we’ll knock £{OFFER} off your share of the accommodation. No questions asked, nobody else sees who ticked it.</p>
						<p><strong>We book everything and pay upfront.</strong> You pay us back for your lodge whenever suits — there is no deadline. Food and activities you pay as you go, only for what you actually do.</p>
					</div>
				</aside>
			</div>
		</section>

		<!-- YOUR NAME -->
		<section class="who wrap" id="vote" aria-labelledby="who-title">
			<p class="eyebrow">STEP 0 · WHO’S VOTING?</p>
			<h2 id="who-title">{myName ? `Hi, ${myName.split(' ')[0]}.` : 'Pick your name.'}</h2>
			<p class="section-intro">Answers save automatically to your name, so you can pick up on any phone. Everyone sees the totals; only Katie & Alex see who said what.</p>
			{#if !myName || namePicker}
				<div class="names" role="group" aria-label="Choose your name">
					{#each names as n}<button type="button" aria-pressed={nameKey(n) === nameKey(myName)} onclick={() => chooseName(n)}>{n}{#if responded.some((r) => nameKey(r) === nameKey(n))}<span aria-label="has answered"> ✓</span>{/if}</button>{/each}
				</div>
				<form class="name-form" onsubmit={(e) => { e.preventDefault(); void chooseName(typedName); }}>
					<label for="typed-name">Not listed?</label>
					<input id="typed-name" maxlength="24" placeholder="Your name" bind:value={typedName} autocomplete="given-name" />
					<button class="btn" type="submit">That’s me</button>
				</form>
			{:else}
				<button class="text-btn" type="button" onclick={() => (namePicker = true)}>Not {myName}? Switch name</button>
			{/if}
		</section>

		<!-- STEP 1: VILLAGE -->
		<section class="villages wrap" aria-labelledby="village-title">
			<p class="eyebrow">STEP 1 · THE VILLAGE</p>
			<h2 id="village-title">Sherwood <span>or</span> Longleat?</h2>
			<form class="postcode" onsubmit={(e) => { e.preventDefault(); void lookupPostcode(); }}>
				<label for="pc">Where are you driving from?</label>
				<div><input id="pc" bind:value={postcode} placeholder="Your postcode, e.g. BD13 5" autocomplete="postal-code" maxlength="9" /><button class="btn" type="submit">Work it out</button></div>
				<p class="fine">{postcodeMsg || `Distances from ${origin.label}. Your postcode stays on this device — it isn’t saved anywhere.`}</p>
			</form>
			<div class="duel">
				{#each VILLAGE_IDS as id}
					{@const vv = VILLAGES[id]}
					{@const d = drives[id]}
					{@const n = tallyNow.village[id]}
					<article class="vcard" class:chosen={village === id}>
						<div class="vphoto"><img src={vv.gallery[0].src} alt={vv.gallery[0].alt} width="1200" height="800" loading="lazy" />{#if village === id}<span class="chosen-stamp">MY VOTE ✓</span>{/if}</div>
						<div class="vbody">
							<p class="vcounty">{vv.county} · {vv.postcode}</p>
							<h3>{vv.name}</h3>
							<p class="vstrap">{vv.strap}</p>
							<dl class="vstats">
								<div><dt>Drive from {origin.label}</dt><dd>{fmtDrive(d.minutes)}</dd><small>~{d.miles} miles · rough</small></div>
								<div><dt>Your share from</dt><dd>{money(off(fromPrice(id)))}</dd><small>per couple · 3 nights · with our £{OFFER} <s>{money(fromPrice(id))}</s></small></div>
							</dl>
							<p class="vpitch">{vv.pitch}</p>
							<ul class="sig">{#each vv.signature as s}<li><b>{s.title}</b> {s.text}</li>{/each}</ul>
							<button class="btn vote" class:primary={village === id} type="button" aria-pressed={village === id} onclick={() => pickVillage(id)} disabled={!myName}>
								{village === id ? `✓ You voted ${vv.name.split(' ')[0]}` : `Vote ${vv.name.split(' ')[0]}`}
							</button>
							{#if !myName}<p class="fine">Pick your name above to vote.</p>{/if}
							<div class="vtally" aria-label={`${n} of ${votesTotal} votes`}><div class="track"><i style:transform={`scaleX(${votesTotal ? n / votesTotal : 0})`}></i></div><span>{n} {n === 1 ? 'vote' : 'votes'}</span></div>
						</div>
					</article>
				{/each}
			</div>

			<div class="explore">
				<div class="tabs" role="tablist" aria-label="Village details">
					{#each VILLAGE_IDS as id}<button role="tab" type="button" aria-selected={shown === id} onclick={() => (browsing = id)}>{VILLAGES[id].name}{village === id ? ' ✓' : ''}</button>{/each}
				</div>
				<p class="fine">The plans, lodges and cost estimate below follow this tab.</p>
				<div class="gallery">{#each v.gallery as g, i}<img src={g.src} alt={g.alt} width="1200" height="800" loading="lazy" class:wide={i === 0} />{/each}</div>
				<div class="explore-grid">
					<div><h3>Things to do</h3><ul class="list">{#each v.activities as a}<li><b>{a.name}</b><span>{a.note}</span></li>{/each}</ul><p class="fine">Pool, walks, bikes-you-bring and the play areas are included. Most activities are paid extras, booked before you go.</p></div>
					<div><h3>Food & drink</h3><ul class="list">{#each v.food as f}<li><b>{f.name}</b><span>{f.note}</span></li>{/each}</ul><p class="fine">{v.nearby}</p></div>
				</div>
			</div>
		</section>

		<!-- STEP 2: COMBINATIONS -->
		<section class="plans-sec" aria-labelledby="plans-title">
			<div class="wrap">
				<p class="eyebrow">STEP 2 · HOW WE’D SLEEP AT {v.name.toUpperCase()}</p>
				<h2 id="plans-title">Budget <span>or Bougy?</span></h2>
				<div class="vswitch" role="group" aria-label="Choose village">{#each VILLAGE_IDS as id}<button type="button" aria-pressed={shown === id} onclick={() => (browsing = id)}>{VILLAGES[id].name.split(' ')[0]}{village === id ? ' ✓' : ''}</button>{/each}</div>
				<p class="section-intro">Real lodges, live prices for 19–22 March, checked {CHECKED}. Every price below is per couple for three nights <strong>with our £{OFFER} already taken off</strong>. Katie & Alex’s own lodge is theirs to pay for — it isn’t in your share. And you can bring your own food and drink, so the rest is as cheap as you like.</p>
				<div class="bb">
					{#each [{ s: budgetPlan, label: 'Budget', line: 'Cheapest possible. Two Woodland Lodges, five couples, one even split.' }, { s: bougyPlan, label: 'Bougy', line: 'The big lodge: hot tub, games room, an en-suite each.' }] as o}
						<article class="bb-card" class:bougy={o.label === 'Bougy'}>
							<p class="bb-label">{o.label}</p>
							<p class="bb-price"><strong>{priceSpan(off(o.s.guestLow), off(o.s.guestHigh))}</strong><span>per couple · 3 nights</span></p>
							<p class="bb-was">Was <s>{priceSpan(o.s.guestLow, o.s.guestHigh)}</s> · £{OFFER} off from us · about {priceSpan(off(o.s.guestLow) / 2, off(o.s.guestHigh) / 2)} each</p>
							<p class="bb-line">{o.line}</p>
							<p class="bb-meta">{o.s.plan.name} · {o.s.twinCouples ? `${o.s.twinCouples} ${o.s.twinCouples === 1 ? 'couple' : 'couples'} in a twin room` : 'everyone in a double'} · {o.s.hasHotTub ? 'hot tub ✓' : 'no hot tub'}</p>
						</article>
					{/each}
				</div>
				<p class="byo-note">🍕 <strong>Bring your own food and drink.</strong> Every lodge has a full kitchen. You don’t have to eat out once.</p>
				<h3 class="plan-sub">All {plans.length} ways to fit six couples, cheapest first</h3>
				<div class="plan-grid">
					{#each plans as s (s.plan.id)}
						{@const host = lodge(s.plan.hosts)}
						<article class="plan">
							<p class="plan-tag">{s.plan.name}</p>
							<p class="plan-line">{s.plan.tagline}</p>
							<div class="plan-price"><strong>{priceSpan(off(s.guestLow), off(s.guestHigh))}</strong><span>per couple · 3 nights · with our £{OFFER}</span></div>
							<p class="after">Before our discount <s>{priceSpan(s.guestLow, s.guestHigh)}</s></p>
							<ul class="who-where">
								{#if s.plan.hub}
									{@const hub = lodge(s.plan.hub.lodge)}
									<li><img src={hub.image} alt="" width="160" height="110" loading="lazy" /><div><b>{s.plan.hub.couples} couples · the big lodge</b><span>{hub.name} · {money(hub.price)} ÷ {s.plan.hub.couples} = {money(hub.price / s.plan.hub.couples)}</span><span class="feat">{hub.features.join(' · ')}</span></div></li>
								{/if}
								{#each s.plan.others as o}
									{@const l = lodge(o.lodge)}
									{#if s.plan.splitEvenly}
										<li><img src={l.image} alt="" width="160" height="110" loading="lazy" /><div><b>{l.bedrooms} couples · {l.name}</b><span>{l.doubles} double · {l.twins} twin{l.twins === 1 ? '' : 's'} · {l.baths} · {money(l.price)}</span><span class="feat">{l.features.join(' · ')}</span></div></li>
									{:else}
										<li><img src={l.image} alt="" width="160" height="110" loading="lazy" /><div><b>{o.couples} {o.couples === 1 ? 'couple' : 'couples'} · own place each</b><span>{l.name} · {money(l.price)}</span><span class="feat">{l.features.join(' · ')}</span></div></li>
									{/if}
								{/each}
								{#if s.plan.splitEvenly}<li class="split"><div><b>Split evenly</b><span>{money(s.total - lodge(s.plan.hosts).price)} ÷ {GUEST_COUPLES} couples = {money(s.guestLow)} each, before our £{OFFER}</span></div></li>{/if}
								<li class="hosts"><img src={host.image} alt="" width="160" height="110" loading="lazy" /><div><b>Katie & Alex{s.plan.hostsAreHub ? ' · the clubhouse' : ''}</b><span>{host.name}</span><span class="feat">{host.features.join(' · ')}</span></div></li>
							</ul>
							<div class="chips">
								<span class:yes={s.hasHotTub}>{s.hasHotTub ? '✓' : '✕'} Hot tub</span>
								<span class:yes={s.hasSauna}>{s.hasSauna ? '✓' : '✕'} Sauna</span>
								<span class:yes={s.hasGames}>{s.hasGames ? '✓' : '✕'} Games room</span>
								<span class:yes={s.twinCouples === 0}>{s.twinCouples === 0 ? '✓ Everyone in a double' : `${s.twinCouples} ${s.twinCouples === 1 ? 'couple' : 'couples'} in a twin room`}</span>
							</div>
							<p class="fine">Whole booking {money(s.total)} incl. Katie & Alex. {lodge(s.plan.hub?.lodge ?? s.plan.hosts).scarce ?? ''}</p>
						</article>
					{/each}
				</div>
				<details class="all-lodges">
					<summary>Every lodge we found at {v.name} ({lodgesHere.length})</summary>
					<div class="lodge-grid">
						{#each lodgesHere as l (l.id)}
							<article class="lodge">
								<img src={l.image} alt={`${l.name} at ${v.name}`} width="600" height="400" loading="lazy" />
								<div>
									<p class="lkind">{l.kind === 'hub' ? 'BIG LODGE' : l.kind === 'pair' ? 'SHARE WITH ONE COUPLE' : 'OWN PLACE'}{#if l.scarce} · <em>{l.scarce.toUpperCase()}</em>{/if}</p>
									<h3>{l.name}</h3>
									<p class="lrooms">{l.doubles} double{l.doubles === 1 ? '' : 's'}{l.twins ? ` · ${l.twins} twin${l.twins === 1 ? '' : 's'}` : ''} · {l.baths}</p>
									<p class="lfeat">{l.features.join(' · ')}</p>
									<p class="lprice"><b>{money(l.price)}</b> lodge{#if l.kind === 'pair'} · {money(l.price / 2)} per couple{:else if l.kind === 'hub'} · {money(l.price / 3)}–{money(l.price / 4)} per couple shared 3–4 ways{/if}</p>
									{#if l.note}<p class="lnote">{l.note}</p>{/if}
								</div>
							</article>
						{/each}
					</div>
					<p class="fine">Twin rooms are two single beds. Sold out for our dates when we checked: at Sherwood the Exclusive Lodge, Treehouse and 6-bed Woodland Lodge; at Longleat the Forest Lodge with infrared sauna and one Grand Forest Lodge. <a href={v.searchUrl} target="_blank" rel="noopener">Check live availability ↗</a></p>
				</details>
			</div>
		</section>

		<!-- STEP 3: YOUR SETUP -->
		<section class="setup wrap" id="costs" aria-labelledby="setup-title">
			<p class="eyebrow">STEP 3 · YOUR IDEAL SETUP</p>
			<h2 id="setup-title">How do <span>you</span> want to sleep?</h2>
			<div class="setup-layout">
				<form class="answers" onsubmit={(e) => e.preventDefault()} onchange={scheduleSave}>
					<fieldset disabled={!myName}>
						<legend>Where would you like to stay?</legend>
						<div class="choices">
							{#each ACCOM_CHOICES as c}
								{@const r = accomRange(shown, c.id)}
								<label class="choice" class:on={accom === c.id}>
									<input type="radio" name="accom" value={c.id} bind:group={accom} />
									<b>{c.label}</b><span>{c.blurb}</span><em>{range(r)} per couple at {v.name.split(' ')[0]} · {range([off(r[0]), off(r[1])])} with our £{OFFER}</em>
								</label>
							{/each}
						</div>
					</fieldset>
					<fieldset disabled={!myName}>
						<legend>What’s comfortable for accommodation? <small>per couple, 3 nights</small></legend>
						<div class="budget">
							{#each BUDGETS as b}<label class:on={budget === b.id}><input type="radio" name="budget" value={b.id} bind:group={budget} />{b.label}</label>{/each}
						</div>
					</fieldset>
					<fieldset disabled={!myName} class="ticks">
						<label class="tick"><input type="checkbox" bind:checked={twinOk} /><span><b>We’re fine in a twin room</b> if it means sharing the big lodge.</span></label>
						<label class="tick offer-tick"><input type="checkbox" bind:checked={offer} /><span><b>Include Katie & Alex’s offer</b> — take £{OFFER} off our share of the accommodation. Only Katie & Alex will see this.</span></label>
						<label class="notes" for="notes">Anything else? <small>(optional)</small></label>
						<textarea id="notes" rows="3" maxlength="500" bind:value={notes} oninput={scheduleSave} placeholder="Arriving late Friday, need ground floor, will bring Uno…"></textarea>
					</fieldset>
					<p class="save-state" aria-live="polite">
						{#if !myName}Pick your name to save your answers.
						{:else if status === 'saving'}Saving…
						{:else if status === 'saved'}✓ Saved for {myName}
						{:else if status === 'offline'}Couldn’t save just now — change anything to try again.
						{:else}Your answers save as you go.{/if}
					</p>
				</form>

				<aside class="receipt" aria-live="polite" aria-atomic="true">
					<p class="eyebrow">YOUR ESTIMATE · PER COUPLE</p>
					<div class="vswitch" role="group" aria-label="Choose village">{#each VILLAGE_IDS as id}<button type="button" aria-pressed={shown === id} onclick={() => (browsing = id)}>{VILLAGES[id].name.split(' ')[0]}{village === id ? ' ✓' : ''}</button>{/each}</div>
					<h3>The whole picture.</h3>
					<dl>
						<div><dt>Accommodation <small>{accomLabel(accom ?? 'either')} · Fri–Mon</small></dt><dd>{range(est.accom)}</dd></div>
						{#if offer}<div class="minus"><dt>Katie & Alex’s offer <small>gift, nothing to pay back</small></dt><dd>−{money(OFFER)}</dd></div>{/if}
						<div><dt>Food & drink <small>allowance · bring your own and it’s less</small></dt><dd>{range(est.food)}</dd></div>
						<div><dt>Activities <small>pool free · a couple of paid extras at the top end</small></dt><dd>{range(est.activities)}</dd></div>
						<div><dt>Fuel <small>{drives[shown].miles * 2} miles there & back from {origin.label}</small></dt><dd>{money(est.fuel ?? 0)}</dd></div>
					</dl>
					<div class="total"><span>Estimated weekend</span><strong>{range(est.total)}</strong><small>per couple · about {range([est.total[0] / 2, est.total[1] / 2])} each</small></div>
					<ul class="foodrows">{#each FOOD_ROWS as row}<li><span><b>{row.label}</b>{row.detail}</span><em>{money(row.low)}–{money(row.high)}</em></li>{/each}</ul>
					<p class="fine">An estimate, not a bill. We pay the lodges upfront; you pay us back for yours whenever. Food and fun are allowances — spend less and it’s cheaper. Fuel is rough: ~{Math.round(drives[shown].miles * 1)} road miles each way at about 16p a mile.</p>
				</aside>
			</div>
		</section>

		<!-- LIVE TALLY -->
		<section class="tally" aria-labelledby="tally-title">
			<div class="wrap tally-layout">
				<div>
					<p class="eyebrow">THE LIVE CHART</p>
					<h2 id="tally-title">The people<br />have <span>spoken.</span></h2>
					<p>{tallyNow.people} of {STAY.couples * 2} have answered{responded.length ? `: ${responded.join(', ')}` : '.'}</p>
				</div>
				<div class="bars">
					{#each VILLAGE_IDS as id}
						<div class="bar-row"><span>{VILLAGES[id].name}</span><b>{tallyNow.village[id]}</b><div class="track"><i style:transform={`scaleX(${pct(tallyNow.village[id], votesTotal) / 100})`}></i></div></div>
					{/each}
					<h3>How people want to sleep</h3>
					{#each ACCOM_CHOICES as c}
						<div class="bar-row small"><span>{c.label}</span><b>{tallyNow.accom[c.id]}</b><div class="track"><i style:transform={`scaleX(${pct(tallyNow.accom[c.id], tallyNow.people) / 100})`}></i></div></div>
					{/each}
					<p class="fine">{tallyNow.twinOk} happy in a twin room if it means sharing the big lodge.</p>
				</div>
			</div>
		</section>

		{#if organiser}
			<section class="org wrap" aria-labelledby="org-title">
				<p class="eyebrow">ORGANISER VIEW · ONLY YOU CAN SEE THIS</p>
				<h2 id="org-title">Who wants what.</h2>
				<div class="table-wrap">
					<table>
						<thead><tr><th>Name</th><th>Village</th><th>Accommodation</th><th>Budget</th><th>Twin OK</th><th>£{OFFER} offer</th><th>Notes</th></tr></thead>
						<tbody>
							{#each organiser as r}
								<tr><td>{r.name}</td><td>{r.village ? VILLAGES[r.village].name.split(' ')[0] : '—'}</td><td>{accomLabel(r.accom)}</td><td>{budgetLabel(r.budget)}</td><td>{r.twinOk ? 'Yes' : '—'}</td><td>{r.offer ? '✓ Yes' : '—'}</td><td>{r.notes || '—'}</td></tr>
							{:else}<tr><td colspan="7">No answers yet.</td></tr>{/each}
						</tbody>
					</table>
				</div>
				<p class="fine">{organiser.filter((r) => r.offer).length} {organiser.filter((r) => r.offer).length === 1 ? 'person has' : 'people have'} ticked the offer. Counted per person, so a couple may both tick it — it’s still £{OFFER} per couple.</p>
			</section>
		{/if}

		<footer class="wrap">
			<span>STEN RECORDS © 2027<br /><small>NO PASSPORTS WERE HARMED IN THE MAKING OF THIS WEEKEND.</small></span>
			<span class="fine">Prices from centerparcs.co.uk, {CHECKED}, for 19–22 March 2027. They change daily and nothing is held. Images © Center Parcs.</span>
			<a href="/stendo/archive">Vol. 01: the house hunt (archive) ↗</a>
		</footer>
	</main>
</div>

<style>
	.cp {
		--paper: #f4efe2; --paper-2: #fbf8ef; --ink: #1d2a22; --pine: #1f3a2c; --moss: #2f6b45;
		--ember: #c86b2a; --muted: #5d665c; --line: #c9c2ae;
		--f-display: 'Anton', Impact, 'Arial Narrow', sans-serif; --f-body: 'Figtree', Arial, sans-serif; --f-marker: 'Permanent Marker', cursive;
		--ease: cubic-bezier(0.23, 1, 0.32, 1);
		color-scheme: light; background: var(--paper); color: var(--ink); font-family: var(--f-body); font-size: 16px; line-height: 1.55; min-height: 100vh; overflow-x: clip;
	}
	:global(body:has(.cp)) { background: #f4efe2; }
	.cp :global(*) { box-sizing: border-box; }
	.wrap { max-width: 1240px; margin-inline: auto; padding-inline: 40px; }
	h1, h2, h3, p { margin: 0; }
	h1, h2, h3 { color: inherit; }
	h1, h2 { font-family: var(--f-display); font-weight: 400; text-transform: uppercase; letter-spacing: -.01em; }
	h2 { font-size: clamp(38px, 5.4vw, 68px); line-height: 1.02; margin-top: 12px; }
	h2 span { color: var(--moss); }
	h3 { font-size: 18px; font-weight: 800; }
	a { color: inherit; text-underline-offset: 4px; }
	button, input, textarea { font: inherit; color: inherit; }
	button { cursor: pointer; }
	button:disabled { cursor: not-allowed; opacity: .5; }
	:focus-visible { outline: 3px solid #2763c5; outline-offset: 3px; }
	.eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .15em; color: var(--ember); }
	.fine { font-size: 12px; color: var(--muted); line-height: 1.6; margin-top: 10px; }
	.section-intro { max-width: 720px; color: var(--muted); margin-top: 14px; font-size: 15px; }
	.skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
	.btn { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; padding: 11px 20px; border: 1px solid var(--ink); background: var(--paper-2); font-weight: 800; font-size: 14px; text-decoration: none; transition: transform 140ms var(--ease); }
	.btn:active:not(:disabled) { transform: translateY(2px); }
	.btn.primary { background: var(--ember); border-color: var(--ember); color: #fff; box-shadow: 3px 3px 0 var(--ink); }
	.btn.ghost { background: transparent; color: #fff; border-color: #fff; }
	.text-btn { border: 0; background: none; text-decoration: underline; font-weight: 700; min-height: 44px; padding: 0; margin-top: 10px; }

	/* masthead */
	.mast { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
	.brand { text-decoration: none; font-weight: 800; letter-spacing: .12em; font-size: 12px; display: flex; align-items: center; gap: 10px; }
	.brand small { font-size: 9px; letter-spacing: .1em; color: var(--muted); font-weight: 600; }
	.dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--pine); color: var(--paper); font-size: 11px; }
	.mast-links { display: flex; align-items: center; gap: 18px; font-size: 13px; font-weight: 700; }
	.mast-links a { text-decoration: none; padding-block: 12px; }
	.mast-links button { border: 1px solid var(--ink); background: var(--paper-2); padding: 8px 12px; font-weight: 800; font-size: 12px; min-height: 40px; }

	/* hero */
	.hero { position: relative; isolation: isolate; min-height: min(86svh, 760px); display: flex; align-items: flex-end; color: #fff; }
	.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
	.hero-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(0deg, #0e1d15f0 0%, #0e1d1599 45%, #0e1d1522 100%); }
	.hero-copy { width: 100%; padding-block: 120px 52px; }
	.hero .eyebrow { color: #f0b37f; }
	h1 { font-size: clamp(76px, 15vw, 190px); line-height: .9; margin-top: 14px; }
	h1 span { color: #f0b37f; }
	.hero-sub { max-width: 560px; font-size: 17px; line-height: 1.6; margin-top: 18px; color: #eef0e8; }
	.ticket { display: inline-flex; align-items: stretch; margin-top: 24px; background: var(--paper); color: var(--ink); border: 1px solid var(--ink); max-width: 100%; }
	.ticket-side { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10px; letter-spacing: .15em; font-weight: 800; padding: 12px 10px; border-left: 1px dashed var(--ink); text-align: center; }
	.ticket > div { display: grid; gap: 2px; padding: 12px 18px; }
	.ticket b { font: 26px/1.1 var(--f-display); }
	.ticket div > span:last-child { font-size: 12px; color: var(--muted); }
	.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
	.strip { background: var(--pine); color: var(--paper); }
	.strip .wrap { display: flex; justify-content: space-between; align-items: center; gap: 14px; min-height: 50px; font: 15px var(--f-display); letter-spacing: .04em; flex-wrap: wrap; }
	.strip i { font-style: normal; color: #f0b37f; font-size: 22px; }

	/* story */
	.story { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 56px; padding-block: 76px 64px; }
	.story-head h2 span { color: var(--ember); }
	.marker { font: 20px/1.35 var(--f-marker); color: var(--moss); transform: rotate(-3deg); margin-top: 18px; max-width: 340px; }
	.story-body > p { font-size: 16px; line-height: 1.7; margin-bottom: 14px; max-width: 620px; }
	.maths { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 22px 0; }
	.maths article { border: 1px solid var(--ink); background: var(--paper-2); padding: 16px; display: grid; gap: 4px; align-content: start; }
	.maths b { font-size: 13px; font-weight: 800; }
	.maths span { font-size: 12px; color: var(--muted); }
	.maths strong { font: 34px/1 var(--f-display); color: var(--moss); }
	.maths p { font-size: 12px; color: var(--muted); margin-top: 4px; }
	.maths .ouch { background: var(--ink); color: var(--paper); }
	.maths .ouch strong { color: #f0b37f; }
	.maths .ouch span, .maths .ouch p { color: #c9cfc4; }
	.pivot { font-weight: 700; }

	/* why */
	.why { background: var(--paper-2); border-block: 1px solid var(--line); padding-block: 64px; }
	.why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-top: 28px; }
	.why-grid article { background: var(--paper-2); padding: 22px; }
	.why-grid h3 { font: 22px/1.1 var(--f-display); text-transform: uppercase; font-weight: 400; margin-bottom: 8px; }
	.why-grid p { font-size: 14px; color: var(--muted); }
	.offer { display: grid; grid-template-columns: auto 1fr; gap: 26px; align-items: center; margin-top: 30px; padding: 26px; background: var(--pine); color: var(--paper); box-shadow: 6px 6px 0 var(--ember); }
	.offer-badge { width: 130px; height: 130px; border-radius: 50%; background: var(--ember); color: #fff; display: grid; place-content: center; text-align: center; transform: rotate(-8deg); border: 3px dashed #fff3; }
	.offer-badge b { font: 40px/1 var(--f-display); }
	.offer-badge span { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	.offer .eyebrow { color: #f0b37f; }
	.offer h3 { font: 30px/1.1 var(--f-display); font-weight: 400; text-transform: uppercase; margin: 6px 0 10px; }
	.offer p { font-size: 14px; line-height: 1.65; margin-bottom: 8px; color: #e6eadf; }
	.offer em { font-style: normal; color: #f0b37f; font-weight: 700; }

	/* who */
	.who { padding-block: 64px 10px; scroll-margin-top: 10px; }
	.names { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
	.names button { min-height: 44px; border: 1px solid var(--line); background: var(--paper-2); padding: 8px 14px; font-weight: 700; font-size: 14px; }
	.names button[aria-pressed=true] { background: var(--ink); color: var(--paper); }
	.names span { color: var(--moss); }
	.name-form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; font-size: 13px; }
	.name-form input, .postcode input { min-height: 48px; border: 1px solid var(--line); background: var(--paper-2); padding: 10px 12px; border-radius: 0; }

	/* villages */
	.villages { padding-block: 50px 64px; }
	.villages h2 span { color: var(--muted); font-size: .6em; vertical-align: middle; }
	.postcode { margin-top: 18px; max-width: 560px; }
	.postcode label { display: block; font-weight: 800; font-size: 14px; margin-bottom: 6px; }
	.postcode > div { display: flex; gap: 8px; }
	.postcode input { flex: 1; min-width: 0; text-transform: uppercase; }
	.duel { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 26px; }
	.vcard { border: 1px solid var(--line); background: var(--paper-2); display: flex; flex-direction: column; transition: box-shadow 160ms var(--ease); }
	.vcard.chosen { box-shadow: inset 0 0 0 3px var(--ember); border-color: var(--ember); }
	.vphoto { position: relative; aspect-ratio: 3 / 2; background: #cfc6b0; overflow: hidden; }
	.vphoto img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.chosen-stamp { position: absolute; top: 18px; left: 16px; transform: rotate(-8deg); border: 4px double var(--ember); color: var(--ember); background: #f4efe2f0; padding: 8px 12px; font: 24px/1 var(--f-display); }
	.vbody { padding: 22px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
	.vcounty { font-size: 12px; color: var(--muted); }
	.vbody h3 { font: 40px/1 var(--f-display); text-transform: uppercase; font-weight: 400; }
	.vstrap { font: 19px/1.3 var(--f-marker); color: var(--moss); transform: rotate(-1.5deg); }
	.vstats { display: grid; grid-template-columns: 1fr 1fr; border-block: 1px solid var(--ink); margin: 6px 0 0; }
	.vstats > div { padding: 12px 0; display: grid; }
	.vstats > div + div { border-left: 1px solid var(--line); padding-left: 14px; }
	.vstats dt { font-size: 11px; color: var(--muted); }
	.vstats dd { margin: 0; font: 34px/1.1 var(--f-display); color: var(--ember); }
	.vstats small { font-size: 11px; color: var(--muted); }
	.vpitch { font-size: 14px; }
	.sig { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font-size: 13px; }
	.sig li { border-left: 3px solid var(--moss); padding-left: 10px; }
	.vote { margin-top: auto; width: 100%; }
	.vtally { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; }
	.track { flex: 1; height: 8px; background: #e2dbc9; overflow: hidden; }
	.track i { display: block; height: 100%; background: var(--ember); transform-origin: left; transition: transform 260ms var(--ease); }
	.explore { margin-top: 34px; border-top: 1px solid var(--ink); padding-top: 22px; }
	.tabs { display: flex; gap: 6px; }
	.tabs button { min-height: 44px; border: 1px solid var(--ink); background: transparent; padding: 8px 16px; font-weight: 800; }
	.tabs button[aria-selected=true] { background: var(--ink); color: var(--paper); }
	.gallery { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-top: 16px; }
	.gallery img { width: 100%; height: 220px; object-fit: cover; display: block; background: #cfc6b0; }
	.explore-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 24px; }
	.explore-grid h3 { font: 26px var(--f-display); font-weight: 400; text-transform: uppercase; margin-bottom: 10px; }
	.list { list-style: none; margin: 0; padding: 0; }
	.list li { display: grid; gap: 1px; padding: 9px 0; border-top: 1px dotted var(--line); font-size: 14px; }
	.list span { font-size: 12px; color: var(--muted); }

	/* plans */
	.plans-sec { background: var(--pine); color: var(--paper); padding-block: 64px; }
	.plans-sec .eyebrow { color: #f0b37f; }
	.plans-sec h2 span { color: #f0b37f; }
	.plans-sec .section-intro, .plans-sec .fine { color: #c3cbbf; }
	.bb { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 26px; }
	.bb-card { background: var(--paper); color: var(--ink); padding: 24px; border-top: 8px solid var(--moss); display: grid; gap: 6px; align-content: start; }
	.bb-card.bougy { border-top-color: var(--ember); }
	.bb-label { font: 46px/1 var(--f-display); text-transform: uppercase; }
	.bb-card.bougy .bb-label { color: var(--ember); }
	.bb-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin-top: 4px; }
	.bb-price strong { font: 64px/1 var(--f-display); letter-spacing: -.02em; color: var(--moss); }
	.bb-card.bougy .bb-price strong { color: var(--ember); }
	.bb-price span { font-size: 13px; font-weight: 700; }
	.bb-was { font-size: 13px; color: var(--muted); }
	.bb-line { font-size: 15px; font-weight: 700; margin-top: 6px; }
	.bb-meta { font-size: 12px; color: var(--muted); }
	.byo-note { margin-top: 16px; padding: 14px 18px; background: #ffffff14; border-left: 4px solid #f0b37f; font-size: 15px; }
	.plan-sub { margin-top: 40px; font: 26px var(--f-display); font-weight: 400; text-transform: uppercase; }
	.who-where .split { grid-template-columns: 1fr; border-top: 1px dashed var(--line); padding-top: 8px; }
	.byo { background: #fbefe4 !important; }
	.byo strong { color: var(--ink); }
	.vstats s, .after s, .bb-was s { opacity: .8; }
	.plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 28px; }
	.plan { background: var(--paper); color: var(--ink); padding: 22px; display: flex; flex-direction: column; gap: 10px; }
	.plan .fine { color: var(--muted); }
	.plan-tag { font: 28px/1 var(--f-display); text-transform: uppercase; }
	.plan-line { font-size: 14px; color: var(--muted); }
	.plan-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--ink); padding-top: 12px; }
	.plan-price strong { font: 42px/1 var(--f-display); color: var(--ember); letter-spacing: -.02em; }
	.plan-price span { font-size: 12px; }
	.after { font-size: 13px; }
	.who-where { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 8px; }
	.who-where li { display: grid; grid-template-columns: 84px 1fr; gap: 12px; align-items: center; font-size: 13px; }
	.who-where img { width: 84px; height: 60px; object-fit: cover; background: #cfc6b0; display: block; }
	.who-where div { display: grid; gap: 1px; }
	.who-where span { color: var(--muted); font-size: 12px; }
	.who-where .feat { color: var(--moss); font-weight: 600; }
	.who-where .hosts { opacity: .8; border-top: 1px dashed var(--line); padding-top: 8px; }
	.chips { display: flex; flex-wrap: wrap; gap: 6px; }
	.chips span { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; padding: 4px 7px; border: 1px solid #b9b19c; color: #8e8672; }
	.chips span.yes { border-color: var(--moss); color: var(--moss); }
	.all-lodges { margin-top: 26px; border-top: 1px solid #ffffff33; }
	.all-lodges summary { min-height: 52px; padding-block: 16px; font-weight: 800; cursor: pointer; }
	.lodge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
	.lodge { background: var(--paper-2); color: var(--ink); display: flex; flex-direction: column; }
	.lodge img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; background: #cfc6b0; }
	.lodge > div { padding: 14px; display: grid; gap: 4px; }
	.lkind { font-size: 10px; font-weight: 800; letter-spacing: .1em; color: var(--muted); }
	.lkind em { color: var(--ember); font-style: normal; }
	.lodge h3 { font-size: 16px; }
	.lrooms, .lfeat { font-size: 12px; color: var(--muted); }
	.lfeat { color: var(--moss); font-weight: 600; }
	.lprice { font-size: 13px; }
	.lprice b { font-size: 18px; color: var(--ember); }
	.lnote { font-size: 12px; border-left: 3px solid var(--ember); padding-left: 8px; }
	.all-lodges .fine a { color: #f0b37f; }

	.vswitch { display: inline-flex; gap: 4px; margin-top: 16px; border: 1px solid currentColor; padding: 3px; }
	.vswitch button { min-height: 40px; border: 0; background: transparent; padding: 6px 14px; font-weight: 800; font-size: 13px; }
	.vswitch button[aria-pressed=true] { background: var(--ember); color: #fff; }
	.receipt .vswitch { margin: 8px 0 0; }

	/* setup + receipt */
	.setup { padding-block: 70px; scroll-margin-top: 10px; }
	.setup h2 span { color: var(--ember); }
	.setup-layout { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 36px; margin-top: 28px; align-items: start; }
	fieldset { border: 0; padding: 0; margin: 0 0 24px; min-width: 0; }
	legend { font-weight: 800; font-size: 15px; margin-bottom: 10px; padding: 0; }
	legend small, .notes small { font-weight: 500; color: var(--muted); }
	.choices { display: grid; gap: 8px; }
	.choice { position: relative; display: grid; gap: 2px; padding: 14px 16px 14px 46px; border: 1px solid var(--line); background: var(--paper-2); cursor: pointer; }
	.choice input, .budget input { position: absolute; opacity: 0; pointer-events: none; }
	.choice::before { content: ''; position: absolute; left: 16px; top: 17px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ink); }
	.choice.on { border-color: var(--ember); box-shadow: inset 0 0 0 2px var(--ember); }
	.choice.on::before { background: var(--ember); box-shadow: inset 0 0 0 3px var(--paper-2); }
	.choice:has(input:focus-visible), .budget label:has(input:focus-visible) { outline: 3px solid #2763c5; outline-offset: 2px; }
	.choice span { font-size: 13px; color: var(--muted); }
	.choice em { font-style: normal; font-size: 12px; font-weight: 800; color: var(--moss); }
	.budget { display: flex; flex-wrap: wrap; gap: 8px; }
	.budget label { position: relative; min-height: 44px; display: inline-flex; align-items: center; padding: 8px 14px; border: 1px solid var(--line); background: var(--paper-2); font-weight: 700; font-size: 14px; cursor: pointer; }
	.budget label.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.ticks { display: grid; gap: 10px; }
	.tick { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 1px solid var(--line); background: var(--paper-2); font-size: 14px; cursor: pointer; }
	.tick input { width: 22px; height: 22px; accent-color: var(--ember); flex-shrink: 0; margin-top: 1px; }
	.offer-tick { border: 2px solid var(--ember); background: #fbefe4; }
	.notes { font-weight: 800; font-size: 14px; margin-top: 6px; }
	textarea { width: 100%; border: 1px solid var(--line); background: var(--paper-2); padding: 10px 12px; border-radius: 0; resize: vertical; }
	.save-state { font-size: 13px; font-weight: 700; color: var(--moss); min-height: 22px; }
	.receipt { position: sticky; top: 16px; background: var(--paper-2); border: 1px solid var(--ink); padding: 24px; box-shadow: 5px 5px 0 var(--pine); }
	.receipt h3 { font: 30px var(--f-display); font-weight: 400; text-transform: uppercase; margin: 6px 0 12px; }
	.receipt dl { margin: 0; }
	.receipt dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px dotted var(--line); font-size: 14px; }
	.receipt dt small { display: block; font-size: 11px; color: var(--muted); }
	.receipt dd { margin: 0; font-weight: 800; white-space: nowrap; }
	.receipt .minus dd { color: var(--moss); }
	.total { display: grid; border-top: 2px solid var(--ink); margin-top: 6px; padding-top: 12px; }
	.total span { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.total strong { font: 44px/1.05 var(--f-display); color: var(--ember); }
	.total small { font-size: 12px; color: var(--muted); }
	.foodrows { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 6px; }
	.foodrows li { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--muted); }
	.foodrows b { display: block; color: var(--ink); }
	.foodrows em { font-style: normal; white-space: nowrap; }

	/* tally */
	.tally { background: var(--ink); color: var(--paper); padding-block: 60px; }
	.tally .eyebrow { color: #f0b37f; }
	.tally h2 span { color: #f0b37f; }
	.tally-layout { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 60px; }
	.tally-layout > div > p { margin-top: 18px; font-size: 14px; color: #c9cfc4; }
	.bars h3 { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; margin: 26px 0 6px; color: #f0b37f; }
	.bar-row { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; padding: 8px 0; }
	.bar-row span { font-size: 15px; font-weight: 700; }
	.bar-row b { font-size: 18px; font-variant-numeric: tabular-nums; }
	.bar-row .track { grid-column: 1 / -1; background: #3a4a40; height: 10px; }
	.bar-row.small span { font-size: 13px; font-weight: 600; }
	.bar-row.small .track { height: 6px; }
	.tally .fine { color: #aab3a6; }

	/* organiser */
	.org { padding-block: 50px; }
	.table-wrap { overflow-x: auto; margin-top: 18px; border: 1px solid var(--ink); }
	table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--paper-2); }
	th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
	th { background: var(--pine); color: var(--paper); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }

	footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; padding-block: 34px 50px; border-top: 1px solid var(--ink); font-size: 12px; font-weight: 800; }
	footer small { font-weight: 500; color: var(--muted); }
	footer .fine { font-weight: 500; max-width: 420px; margin: 0; }

	@media (max-width: 960px) {
		.story, .setup-layout, .tally-layout { grid-template-columns: 1fr; gap: 28px; }
		.why-grid { grid-template-columns: 1fr 1fr; }
		.lodge-grid { grid-template-columns: 1fr 1fr; }
		.receipt { position: static; }
	}
	@media (max-width: 720px) {
		.wrap { padding-inline: 16px; }
		.mast-links a:not(:last-child) { display: none; }
		.brand small { display: none; }
		.bb-price strong { font-size: 52px; }
		.duel, .bb, .plan-grid, .explore-grid, .maths, .why-grid, .lodge-grid { grid-template-columns: 1fr; }
		.gallery { grid-template-columns: 1fr 1fr; }
		.gallery img { height: 140px; }
		.gallery img.wide { grid-column: 1 / -1; height: 200px; }
		.offer { grid-template-columns: 1fr; padding: 20px; }
		.offer-badge { width: 100px; height: 100px; }
		.offer-badge b { font-size: 30px; }
		.strip .wrap { justify-content: center; font-size: 13px; }
		.strip i { display: none; }
		.hero-copy { padding-block: 90px 36px; }
		.vbody h3 { font-size: 34px; }
		.plan-price strong { font-size: 36px; }
	}
	@media (prefers-reduced-motion: reduce) { .track i, .btn, .vcard { transition: none; } }
</style>

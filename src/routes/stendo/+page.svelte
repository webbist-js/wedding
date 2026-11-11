<script lang="ts">
	// The Stendo Vol. 03: we booked it. Trip hub for Center Parcs Whinfell Forest.
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Countdown from '$lib/components/cp-trip/Countdown.svelte';
	import FancyHouseTax from '$lib/components/cp-trip/FancyHouseTax.svelte';
	import PayUp from '$lib/components/cp-trip/PayUp.svelte';
	import ThingsToDo from '$lib/components/cp-trip/ThingsToDo.svelte';
	import TripIcon from '$lib/components/cp-trip/TripIcon.svelte';
	import ChoirPlayer from '$lib/components/cp-trip/ChoirPlayer.svelte';
	import { HALLELUJAH } from '$lib/whinfell-song';
	import {
		BOOKING, GROUPS, HOUSES, PEOPLE, ADULTS, KIDS, EXTRAS, GIFTS, BIG_HOUSE_TAX_TOTAL, ORIGINAL, groupsIn, group, lineFor, gbp, gbpShort, person, daysUntil, pastDeadline,
		isContributor, isReliefGroup, type Person, type GroupId, type HouseId
	} from '$lib/cp-trip';
	import { ITINERARY, PACK, SHOPPING, GALLERY, LODGE_IMAGES, BANNER, FACTS } from '$lib/cp-whinfell';
	import type { TripState } from '$lib/server/cp-trip';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const store = {
		get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
		set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
	};

	// svelte-ignore state_referenced_locally
	let trip = $state<TripState>(data.trip);
	// svelte-ignore state_referenced_locally
	let organiser = $state<boolean>(data.organiser);
	// svelte-ignore state_referenced_locally
	let now = $state<number>(data.now);

	// ---- who's looking (stays on this device) ----
	let me = $state<Person | null>(null);
	let picking = $state(false);
	const myGroup = $derived(me ? me.group : null);
	function choose(p: Person | null) {
		me = p;
		store.set('stendo.v3.person', p?.id ?? '');
		picking = false;
	}

	// ---- talking to the server ----
	async function act(body: Record<string, unknown>): Promise<string | null> {
		try {
			const res = await fetch('/stendo/trip', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
			const json = await res.json().catch(() => null);
			if (!res.ok) return json?.message ?? 'Couldn’t save that. Try again?';
			trip = json;
			organiser = json.organiser;
			return null;
		} catch {
			return 'You look offline. Try again in a sec.';
		}
	}
	async function refresh() {
		if (document.hidden) return;
		try {
			const res = await fetch('/stendo/trip', { cache: 'no-store' });
			if (res.ok) { const json = await res.json(); trip = json; organiser = json.organiser; }
		} catch { /* keep what we have */ }
	}

	onMount(() => {
		now = Date.now();
		const saved = person(store.get('stendo.v3.person') ?? '');
		if (saved) me = saved;
		const poll = setInterval(refresh, 10_000);
		const tick = setInterval(() => (now = Date.now()), 60_000);
		// One burst of confetti per device, because we booked it.
		if (!store.get('stendo.v3.confetti') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
			store.set('stendo.v3.confetti', '1');
			import('canvas-confetti').then(({ default: confetti }) =>
				confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors: ['#c86b2a', '#f0b37f', '#2f6b45', '#f4efe2'] })
			);
		}
		return () => { clearInterval(poll); clearInterval(tick); };
	});

	// ---- the song and the album sleeve ----
	let player = $state<ReturnType<typeof ChoirPlayer>>();
	let singing = $state(false);
	// The page opens on the choir video, looping. It's silent footage; the song
	// is its soundtrack. Tapping it flips to the original album cover and back.
	let showVideo = $state(true);
	function flipCover() {
		showVideo = !showVideo;
		if (!singing) void player?.play();
	}
	onMount(() => {
		// No looping footage for people who've asked for less motion.
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) showVideo = false;
	});

	// ---- app-style navigation (phones) ----
	// A bottom tab bar jumps between the five parts of the page; the top bar
	// names the part you're in. The active tab follows your scroll position.
	type TabId = 'home' | 'lodges' | 'money' | 'plans' | 'pack';
	const TABS: { id: TabId; target: string; label: string; title: string; icon: 'home' | 'bed' | 'wallet' | 'party' | 'backpack' }[] = [
		{ id: 'home', target: 'top', label: 'Home', title: 'We’re going to Whinfell', icon: 'home' },
		{ id: 'lodges', target: 'lodges', label: 'Lodges', title: 'Who’s staying where', icon: 'bed' },
		{ id: 'money', target: 'costs', label: 'Money', title: 'Your money', icon: 'wallet' },
		{ id: 'plans', target: 'do', label: 'Plans', title: 'Things to do', icon: 'party' },
		{ id: 'pack', target: 'pack', label: 'Pack', title: 'What to bring', icon: 'backpack' }
	];
	let activeTab = $state<TabId>('home');
	const activeIndex = $derived(TABS.findIndex((t) => t.id === activeTab));
	let reducedMotion = $state(false);

	function spy() {
		const line = innerHeight * 0.35;
		let current: TabId = 'home';
		for (const t of TABS) {
			const el = document.getElementById(t.target);
			if (el && el.getBoundingClientRect().top <= line) current = t.id;
		}
		activeTab = current;
	}
	/** Jump to a part of the page, and give its heading a small "you're here" cue. */
	function goTo(target: string, e?: Event) {
		const el = document.getElementById(target);
		if (!el) return;
		e?.preventDefault();
		el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
		if (reducedMotion || target === 'top') return;
		el.classList.remove('arrive');
		void el.offsetWidth; // restart the animation
		el.classList.add('arrive');
		setTimeout(() => el.classList.remove('arrive'), 1400);
	}
	onMount(() => {
		reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let ticking = false;
		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => { spy(); ticking = false; });
		};
		spy();
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	});

	// ---- your next step: the one thing this person should do now ----
	const myAccount = $derived(myGroup ? trip.ledger.accounts.find((a) => a.group === myGroup) ?? null : null);
	type Step = { label: string; hint: string; target?: string; pick?: boolean };
	const nextStep = $derived.by<Step>(() => {
		if (!me || !myGroup) return { label: 'Tell us who you are', hint: 'See your share and have your say', pick: true };
		if (myAccount && myAccount.outstanding > 0)
			return { label: `Pay your ${gbp(myAccount.outstanding)}`, hint: late ? 'The deadline has passed' : `By 8 January · ${deadlineDays} ${deadlineDays === 1 ? 'day' : 'days'} left`, target: 'pay' };
		if (isContributor(myGroup) && trip.status.pledges[myGroup] === null)
			return { label: 'Answer the Fancy House Tax question', hint: 'Takes a minute. £0 is a fine answer.', target: 'debate' };
		if (isReliefGroup(myGroup) && trip.status.proposal && trip.status.approvals[myGroup] !== 'approved')
			return { label: 'Check your new share', hint: 'Everyone chipping in has answered. Say yes if you’re happy.', target: 'debate' };
		return { label: 'Vote for things to do', hint: 'Help pick the group activity', target: 'do' };
	});
	function doNext(e: Event) {
		if (nextStep.pick) picking = true;
		else if (nextStep.target) goTo(nextStep.target, e);
	}

	// ---- packing checklist ticks (this device only) ----
	let ticked = $state<Record<string, boolean>>({});
	onMount(() => {
		try { ticked = JSON.parse(store.get('stendo.v3.pack') ?? '{}'); } catch { ticked = {}; }
	});
	function tick(key: string) {
		ticked[key] = !ticked[key];
		store.set('stendo.v3.pack', JSON.stringify(ticked));
	}
	const packCount = $derived(PACK.reduce((n, s) => n + s.items.length, 0));
	const packDone = $derived(Object.values(ticked).filter(Boolean).length);

	// ---- organiser-editable info ----
	let editing = $state<string | null>(null);
	let draft = $state('');
	let noteErr = $state('');
	async function saveNote(key: string) {
		noteErr = (await act({ action: 'note', key, body: draft })) ?? '';
		if (!noteErr) editing = null;
	}

	const deadlineDays = $derived(daysUntil(BOOKING.deadline, now));
	const late = $derived(pastDeadline(now));
	const twinCrew = GROUPS.filter((g) => g.twin);
	// The name picker groups people by couple; Mule gets the third-wheel spot.
	const couples = GROUPS.filter((g) => g.adults > 1);
	const solos = GROUPS.filter((g) => g.adults === 1);

	// ---- whose numbers you see ----
	// Everyone sees only their own group's money; Alex (signed in as organiser)
	// sees the lot. "You" is the name picked on this phone, so this keeps the page
	// personal and uncluttered. It isn't a lock: the trust model is the same as
	// the rest of the Stendo pages.
	const seeAll = $derived(organiser);
	const myLine = $derived(myGroup ? lineFor(ORIGINAL, myGroup) : null);
	const showHouseCost = (h: HouseId) => seeAll || (!!myGroup && group(myGroup).house === h);
	/** Plain-English summary of how one group's original share is made up. */
	function shareStory(id: GroupId): string {
		const g = group(id);
		const l = lineFor(ORIGINAL, id);
		if (g.paidUpfront) return `You paid Center Parcs for the whole booking up front, so your share is already settled. It covers your two House 1 places, Oli & Phoebe’s two empty ones, the ${gbpShort(BIG_HOUSE_TAX_TOTAL)} Big House Tax, your gym pass and bikes, and the £100 gifts.`;
		const mates = groupsIn(g.house).filter((x) => x.id !== id).map((x) => x.label.replace(' & Theo', ''));
		const n = g.house.slice(1);
		const base = g.house === 'h1'
			? `House 1 works out at £310 a head, so ${gbp(l.accommodation)} for ${g.adults === 1 ? 'you' : 'the two of you'}.`
			: mates.length ? `You’re splitting House ${n} with ${mates.join(' and ')}, so your half is ${gbp(l.accommodation)}.` : `House ${n} is yours: ${gbp(l.accommodation)}.`;
		const tax = l.bigHouseTax < 0 ? ` Alex & Katie cover ${gbp(-l.bigHouseTax)} of that (the Big House Tax), bringing you to a round ${gbpShort(l.accommodation + l.bigHouseTax)}.` : '';
		const gift = l.giftsReceived ? ` Alex & Katie are chipping in ${gbpShort(l.giftsReceived)} as a gift.` : '';
		return base + tax + gift;
	}

	const giftList = GIFTS.map((x) => gbpShort(x.pence)).join(' + ');

	// Six cards so the grid fills (3 × 2, 2 × 3). The last is fixed facts, not an editable note.
	const INFO: { key: 'arrival' | 'parking' | 'lodges' | 'shopping' | 'plans' | 'contact'; title: string; facts: string[]; fixed?: boolean }[] = [
		{ key: 'arrival', title: 'Arrival', facts: FACTS.arrival },
		{ key: 'parking', title: 'Parking', facts: FACTS.parking },
		{ key: 'lodges', title: 'Lodge details', facts: FACTS.lodges },
		{ key: 'shopping', title: 'Shared shopping', facts: [] },
		{ key: 'plans', title: 'Activity plans', facts: FACTS.plans },
		{ key: 'contact', title: 'Asking Center Parcs', facts: FACTS.contact, fixed: true }
	];
</script>

<svelte:head>
	<title>We’re going to Whinfell! · The Stendo Forest Choir</title>
	<meta name="robots" content="noindex" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Figtree:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,400;1,600;1,700;1,800&family=Yellowtail&display=swap" />
	<link rel="preload" href="/images/sten-do/forest-choir-poster.jpg" as="image" fetchpriority="high" />
	<link rel="preload" href={HALLELUJAH.src} as="audio" type="audio/mpeg" />
	<link rel="preconnect" href="https://centerparcs.scene7.com" />
</svelte:head>

{#snippet receipt(l: (typeof ORIGINAL.lines)[number])}
	{@const g = group(l.group)}
	<article class="rc" class:mine={myGroup === g.id}>
		<p class="rc-h">House {g.house.slice(1)}</p>
		<h3>{g.label}</h3>
		<dl>
			<div><dt>{g.house === 'h1' ? `House 1 · ${g.adults} × £310` : groupsIn(g.house).length > 1 ? `Half of House ${g.house.slice(1)}` : `House ${g.house.slice(1)}`}</dt><dd>{gbp(l.accommodation)}</dd></div>
			{#if l.absorbed}<div class="tax"><dt>Oli & Phoebe’s empty House 1 places</dt><dd>+{gbp(l.absorbed)}</dd></div>{/if}
			{#if l.bigHouseTax > 0}<div class="tax"><dt>Big House Tax</dt><dd>+{gbp(l.bigHouseTax)}</dd></div>{/if}
			{#if l.bigHouseTax < 0}<div class="gift"><dt>Big House Tax, paid by Alex & Katie</dt><dd>{gbp(l.bigHouseTax)}</dd></div>{/if}
			{#each EXTRAS.filter((e) => e.group === g.id) as e}<div><dt>{e.label}</dt><dd>{gbp(e.pence)}</dd></div>{/each}
			{#if l.giftsGiven}<div><dt>Gifts ({giftList})</dt><dd>{gbp(l.giftsGiven)}</dd></div>{/if}
			{#if l.giftsReceived}<div class="gift"><dt>Gift from Alex & Katie</dt><dd>{gbp(-l.giftsReceived)}</dd></div>{/if}
		</dl>
		<p class="rc-total"><span>Total</span><b>{gbp(l.total)}</b></p>
	</article>
{/snippet}

{#snippet pickCard(g: (typeof GROUPS)[number], title: string, sub: string)}
	<div class="pick-card" class:solo={g.adults === 1} class:chosen={myGroup === g.id} role="group" aria-label={title}>
		<p class="pick-title">{title}</p>
		<p class="pick-sub">{sub}</p>
		<div class="pick-people">
			{#each PEOPLE.filter((p) => p.group === g.id) as p (p.id)}
				<button type="button" aria-pressed={me?.id === p.id} onclick={() => choose(p)}>{p.name}</button>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet pickToSee(what: string)}
	<div class="gate">
		<p><strong>Your numbers are just for you.</strong> Pick your name to see {what}.</p>
		<button class="btn primary" type="button" onclick={() => (picking = true)}>Who are you?</button>
	</div>
{/snippet}

<div class="trip">
	<a class="skip" href="#lodges">Skip to who’s staying where</a>

	<nav class="mast wrap" aria-label="Page navigation">
		<a class="brand" href="#top" onclick={(e) => goTo('top', e)}><span class="dot" aria-hidden="true">✦</span> <span class="brand-name">STEN RECORDS</span> <small>VOL. 03 · THE FOREST CHOIR</small></a>
		<div class="bar-title" aria-hidden="true">
			{#key activeTab}<span in:fly={{ y: reducedMotion ? 0 : 10, duration: reducedMotion ? 0 : 260 }}>{TABS[activeIndex].title}</span>{/key}
		</div>
		<div class="mast-links">
			<a href="#lodges">Lodges</a><a href="#debate">Costs</a><a href="#pay">Pay</a><a href="#do">Do</a><a href="#pack">Pack</a>
			<button type="button" class="song-link" onclick={() => player?.showLyrics()}><TripIcon name="music" size={14} strokeWidth={2.5} /> Lyrics</button>
			<button type="button" class="me" onclick={() => (picking = true)} aria-label={me ? `You’re ${me.name}. Change` : 'Who are you?'}><span class="me-full">{me ? `Hi, ${me.name}` : 'Who are you?'}</span><span class="me-short" aria-hidden="true">{me ? me.name.slice(0, 1) : '?'}</span></button>
		</div>
	</nav>

	<header class="hero" id="top">
		<img class="hero-img" src={BANNER.src} alt={BANNER.alt} width="2000" height="1333" fetchpriority="high" />
		<div class="hero-shade" aria-hidden="true"></div>
		<div class="hero-copy wrap">
			<div class="hero-title">
				<p class="presents">THE STENDO FOREST CHOIR <i>presents</i></p>
				<p class="booked" aria-label="Booking confirmed"><span>BOOKED</span> CONFIRMED · 3 NIGHTS ONLY</p>
				<h1>We’re going to <span>Whinfell!</span></h1>
				<p class="hero-sub">Three nights. Three lodges. One very questionable collection of people, robed and ready.</p>
				<div class="hero-cta">
					<a class="next" href={nextStep.target ? `#${nextStep.target}` : '#top'} onclick={doNext}>
						<span class="next-text"><span class="next-k">Your next step</span><b>{nextStep.label}</b><small>{nextStep.hint}</small></span>
						<span class="next-go" aria-hidden="true"><TripIcon name="chevron-right" size={22} strokeWidth={2.5} /></span>
					</a>
					<button class="btn ghost sing" type="button" onclick={() => { void player?.play(); player?.showLyrics(); }}><TripIcon name="music" size={16} strokeWidth={2.5} /> Sing along</button>
				</div>
			</div>
			<figure class="sleeve">
				<div class="sleeve-art">
					<div class="vinyl" class:spin={singing} aria-hidden="true"><span>STEN<br />SIDE A</span></div>
					<button class="album-cover" type="button" onclick={flipCover} aria-pressed={showVideo} aria-label={showVideo ? 'Show the original album cover' : 'Play the Stendo Forest Choir video'}>
						{#if showVideo}
							<video src={HALLELUJAH.video} poster="/images/sten-do/forest-choir-poster.jpg" width="720" height="720" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
						{:else}
							<img src="/images/sten-do/forest-edition.jpg" alt="Album cover: STENDO, Forest Edition. All thirteen of us on the steps of a woodland lodge." width="1000" height="1000" fetchpriority="high" />
						{/if}
						<span class="cover-sticker" aria-hidden="true">{#if showVideo}TAP FOR<b>the cover</b>{:else}BACK IN<b>robes</b>TAP ME{/if}</span>
						{#if !showVideo}<span class="watch" aria-hidden="true"><i><TripIcon name="play" size={12} strokeWidth={3} /></i>Watch the choir</span>{/if}
					</button>
				</div>
				<figcaption><b>NOW PLAYING</b> {HALLELUJAH.title} <small>{HALLELUJAH.artist} · Sten Records Vol. 03</small></figcaption>
			</figure>
			<div class="hero-count">
				<p class="eyebrow">UNTIL WE ARRIVE AT {BOOKING.village.toUpperCase()}</p>
				<Countdown target={BOOKING.arriveAt} now={data.now} label="Time until we arrive" big />
			</div>
			<dl class="facts">
				<div><dt>Where</dt><dd>{BOOKING.village}<small>{BOOKING.place}</small></dd></div>
				<div><dt>When</dt><dd>Fri 19 – Mon 22 March 2027<small>{BOOKING.nights} nights</small></dd></div>
				<div><dt>Who</dt><dd>{ADULTS} adults + {KIDS.join(', ')}<small>3 lodges</small></dd></div>
				<div class:late><dt>Pay by</dt><dd>8 January 2027<small>{late ? 'Overdue' : `${deadlineDays} days left`}</small></dd></div>
			</dl>
		</div>
	</header>

	<div class="strip" aria-hidden="true"><div class="wrap"><span>HALLELUJAH</span><i><TripIcon name="asterisk" size={18} strokeWidth={3} /></i><span>IT’S BOOKED</span><i><TripIcon name="asterisk" size={18} strokeWidth={3} /></i><span>3 LODGES</span><i><TripIcon name="asterisk" size={18} strokeWidth={3} /></i><span>1 HOT TUB FOR EVERYONE</span><i><TripIcon name="asterisk" size={18} strokeWidth={3} /></i><span>{BOOKING.village.toUpperCase()}</span></div></div>

	<main>
		<!-- WHO'S STAYING WHERE -->
		<section class="lodges wrap" id="lodges" aria-labelledby="lodges-title">
			<p class="eyebrow">WHO’S STAYING WHERE</p>
			<h2 id="lodges-title">Three lodges. <span>One base camp.</span></h2>
			<p class="section-intro">House 1 is where we’ll gather: hot tub, sauna and games room, open to all of us all weekend. Sleep wherever you’re booked; hang out at House 1.</p>
			<div class="houses">
				{#each HOUSES as h}
					{@const img = LODGE_IMAGES[h.id]}
					<article class="house {h.id}">
						<div class="house-photo">
							{#if img}<img src={img.src} alt={img.alt} width="900" height="600" loading="lazy" />{:else}<div class="ph" aria-hidden="true"><TripIcon name="trees" size={64} strokeWidth={1.5} /></div>{/if}
							<span class="num">HOUSE {h.number}</span>
							{#if h.id === 'h1'}<span class="hub">BASE CAMP</span>{/if}
						</div>
						<div class="house-body">
							<h3>{h.nickname}</h3>
							<p>{h.blurb}</p>
							{#if h.amenities.length}<ul class="amen">{#each h.amenities as a}<li><TripIcon name={a === 'Hot tub' ? 'bath' : a === 'Sauna' ? 'sauna' : 'dices'} size={14} strokeWidth={2.5} /> {a}</li>{/each}</ul>{/if}
							<ul class="occ" aria-label={`Staying in House ${h.number}`}>
								{#each groupsIn(h.id) as g}<li class:mine={myGroup === g.id}>{g.label}{#if g.twin}<small>twin room</small>{/if}</li>{/each}
							</ul>
							{#if h.note}<p class="hnote">{h.note}</p>{/if}
							{#if showHouseCost(h.id)}<p class="cost">{gbpShort(h.costPence)} <small>for the lodge, 3 nights{h.id === 'h1' && (seeAll || myGroup === 'alex-katie') ? ` · incl. £79 of Alex & Katie’s extras` : ''}</small></p>{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>

		<!-- FACILITIES -->
		<section class="base" aria-labelledby="base-title">
			<div class="wrap base-grid">
				<div>
					<p class="eyebrow">THE FACILITIES</p>
					<h2 id="base-title">Everyone’s <span>welcome</span> at House 1.</h2>
					<p>Whichever lodge you sleep in, House 1’s fun stuff is for all of us. Bring your swimmers.</p>
				</div>
				<ul class="fac">
					<li><b><TripIcon name="bath" size={32} strokeWidth={1.75} /></b><span><strong>Hot tub</strong>Evenings, mornings, whenever.</span></li>
					<li><b><TripIcon name="sauna" size={32} strokeWidth={1.75} /></b><span><strong>Sauna</strong>Warm up after the pool or a cold forest walk.</span></li>
					<li><b><TripIcon name="dices" size={32} strokeWidth={1.75} /></b><span><strong>Games room</strong>Where friendships go to be tested.</span></li>
				</ul>
			</div>
		</section>

		<!-- THE WEEKEND -->
		<section class="weekend wrap" aria-labelledby="wk-title">
			<p class="eyebrow">THE WEEKEND</p>
			<h2 id="wk-title">Friday <span>to</span> Monday.</h2>
			<ol class="days">
				{#each ITINERARY as d, i}
					<li><span class="dn">{String(i + 1).padStart(2, '0')}</span><p class="dd">{d.day}<small>{d.date}</small></p><h3>{d.title}</h3><p>{d.text}</p></li>
				{/each}
			</ol>
			<p class="fine">Nothing’s booked beyond the lodges yet. Activities and meals out are below, once we know what people fancy.</p>
		</section>

		<!-- ORIGINAL COSTS -->
		<section class="costs wrap" id="costs" aria-labelledby="costs-title">
			<p class="eyebrow">THE ORIGINAL COSTS</p>
			<h2 id="costs-title">Who pays <span>what.</span></h2>
			{#if seeAll}
				<p class="section-intro">The booking came to <strong>{gbp(BOOKING.totalPence)}</strong>. Everyone pays for their own lodge. House 1 is £310 a head; Oli & Phoebe have moved to House 3, so Alex & Katie pick up their two places, plus {gbpShort(BIG_HOUSE_TAX_TOTAL)} of <strong>Big House Tax</strong> so Kie & Elisa pay a round £550 and Mule pays £300.</p>
				<p class="org-note">Organiser view: you’re seeing everyone’s numbers. Everyone else only sees their own.</p>
				<div class="receipts">
					{#each ORIGINAL.lines as l}{@render receipt(l)}{/each}
					<article class="rc rc-sum" aria-label="Grand total">
						<p class="rc-h">All three lodges</p>
						<h3>The whole booking</h3>
						<dl>
							{#each HOUSES as h}<div><dt>House {h.number}</dt><dd>{gbp(h.costPence)}</dd></div>{/each}
						</dl>
						<p class="rc-total"><span>Total</span><b>{gbp(ORIGINAL.total)}</b></p>
					</article>
				</div>
				<p class="fine">The empty House 1 places, the Big House Tax, the gym pass and bike hire, and the gifts are all Alex & Katie’s, and none of it is part of any sharing idea. Everything adds up to exactly {gbp(ORIGINAL.total)}.</p>
			{:else if myGroup && myLine}
				<p class="section-intro">Everyone pays for their own lodge. Here’s exactly how yours adds up.</p>
				<div class="receipts solo">
					{@render receipt(myLine)}
					<article class="rc-story">
						<p class="rc-h">How it’s worked out</p>
						<p>{shareStory(myGroup)}</p>
						<p class="rc-story-total">Your share: <b>{gbp(myLine.total)}</b></p>
						<a class="text-btn" href="#pay">How to pay it ↓</a>
					</article>
				</div>
			{:else}
				{@render pickToSee('what you owe')}
			{/if}
		</section>

		<FancyHouseTax status={trip.status} agreed={trip.agreed} consents={trip.consents} {myGroup} {organiser} {act} onPickName={() => (picking = true)} />

		<PayUp ledger={trip.ledger} agreed={trip.agreed} paymentDetails={trip.notes.payment} {myGroup} {organiser} {now} {act} onPickName={() => (picking = true)} />

		<ThingsToDo interest={trip.interest} {me} {act} onPickName={() => (picking = true)} />

		<!-- PACK -->
		<section class="pack" id="pack" aria-labelledby="pack-title">
			<div class="wrap">
				<p class="eyebrow">WHAT TO BRING</p>
				<h2 id="pack-title">Pack <span>like a pro.</span></h2>

				<aside class="twins" aria-labelledby="twins-title">
					<p class="eyebrow">TWIN ROOM CREW · {twinCrew.map((g) => g.label.toUpperCase()).join(' · ')}</p>
					<h3 id="twins-title">The twin beds push together to become a double!!!</h3>
					<p>You’re in twin rooms. Push the two singles together, stretch a <strong>double fitted sheet</strong> over both, and you’ve got yourself a double. That’s the only extra you need: everyone else just brings pillows. Mule, you can starfish across both.</p>
				</aside>

				<p class="pack-progress" aria-live="polite">{packDone} of {packCount} packed <span class="fine">· ticks save on this phone only</span></p>
				<div class="pack-grid">
					{#each PACK as s}
						<div class="pk">
							<h3>{s.title}</h3>
							{#if s.note}<p class="pk-note">{s.note}</p>{/if}
							<ul>
								{#each s.items as item}
									{@const key = `${s.id}:${item}`}
									<li><label><input type="checkbox" checked={!!ticked[key]} onchange={() => tick(key)} /><span>{item}</span></label></li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
				{#if FACTS.provided.length}
					<div class="provided"><h3>Already in the lodges</h3>{#each FACTS.provided as f}<p>{f}</p>{/each}</div>
				{/if}

				<h3 class="sub" id="shop">The shopping list</h3>
				<p class="section-intro">Ideas for the big shop. Who buys what isn’t sorted yet — see “Shared shopping” below.</p>
				<div class="shop">
					{#each SHOPPING as s}<div><h4>{s.title}</h4><ul>{#each s.items as i}<li>{i}</li>{/each}</ul></div>{/each}
				</div>
			</div>
		</section>

		<!-- USEFUL INFO -->
		<section class="info wrap" id="info" aria-labelledby="info-title">
			<p class="eyebrow">USEFUL INFO</p>
			<h2 id="info-title">The <span>small print.</span></h2>
			<div class="info-grid">
				{#each INFO as s}
					{@const note = s.key === 'contact' ? '' : trip.notes[s.key]}
					<article>
						<h3>{s.title}</h3>
						{#each s.facts as f}<p>{f}</p>{/each}
						{#if s.fixed}
							<!-- facts only -->
						{:else if note}
							<p class="note">{note}</p>
						{:else}
							<p class="tbc"><span>TBC</span> {s.facts.length ? 'Our own plan for this isn’t agreed yet.' : 'Not agreed yet. Alex will update this.'}</p>
						{/if}
						{#if organiser && !s.fixed}
							{#if editing === s.key}
								<textarea rows="4" maxlength="2000" bind:value={draft} aria-label={`${s.title} notes`}></textarea>
								<div class="row"><button class="btn primary" type="button" onclick={() => saveNote(s.key)}>Save</button><button class="btn" type="button" onclick={() => (editing = null)}>Cancel</button></div>
								{#if noteErr}<p class="bad">{noteErr}</p>{/if}
							{:else}
								<button class="text-btn" type="button" onclick={() => { editing = s.key; draft = note; }}>Edit</button>
							{/if}
						{/if}
					</article>
				{/each}
			</div>
		</section>

		{#if GALLERY.length > 1}
			<div class="gallery wrap" aria-label="Whinfell Forest">{#each GALLERY.slice(1, 5) as g}<img src={g.src} alt={g.alt} width="900" height="600" loading="lazy" />{/each}</div>
		{/if}

		<footer class="wrap">
			<span>STEN RECORDS © 2027<br /><small>NO FLOOR PLANS WERE HARMED IN THE MAKING OF THIS WEEKEND.</small></span>
			<span class="fine">Activity and village details from centerparcs.co.uk, checked 10 November 2026. Images © Center Parcs.</span>
			<span class="arch"><a href="/stendo/archive/center-parcs">Vol. 02: the pitch ↗</a><a href="/stendo/archive">Vol. 01: the house hunt ↗</a></span>
		</footer>
	</main>

	<nav class="tabbar" aria-label="Sections" style:--i={activeIndex}>
		<span class="tab-ink" aria-hidden="true"></span>
		{#each TABS as t}
			<a href={`#${t.target}`} class:on={activeTab === t.id} aria-current={activeTab === t.id ? 'true' : undefined} onclick={(e) => goTo(t.target, e)}>
				<TripIcon name={t.icon} size={21} strokeWidth={activeTab === t.id ? 2.4 : 1.9} />
				<span>{t.label}</span>
			</a>
		{/each}
	</nav>

	{#if picking}
		<div class="sheet-back" role="presentation" onclick={() => (picking = false)}></div>
		<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pick-title">
			<h2 id="pick-title">Who are you?</h2>
			<p class="fine">This phone remembers you. No passwords: just pick yourself, not someone else.</p>
			<div class="pick">
				{#each couples as g (g.id)}
					{@render pickCard(g, g.label.replace(' & Theo', ''), g.kids?.length ? `House ${g.house.slice(1)} · plus ${g.kids.join(', ')}` : `House ${g.house.slice(1)}`)}
				{/each}
				{#each solos as g (g.id)}
					{@render pickCard(g, 'Third wheel', `House ${g.house.slice(1)} · flying solo`)}
				{/each}
			</div>
			<div class="row">
				{#if me}<button class="text-btn" type="button" onclick={() => choose(null)}>Forget me on this phone</button>{/if}
				<button class="btn" type="button" onclick={() => (picking = false)}>Close</button>
			</div>
		</div>
	{/if}
</div>

<ChoirPlayer bind:this={player} bind:playing={singing} />

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') picking = false; }} />

<style>
	.trip {
		/* Gospel choir: robe burgundy, cream, gold leaf, a little forest green. */
		--paper: #f7f0e2; --paper-2: #fffaf1; --ink: #2a0b13; --pine: #4a0e1f; --moss: #2f5e3f;
		--ember: #8e1b30; --sun: #d8a849; --gold-ink: #7d5414; --muted: #6f5a56; --line: #e3d2b1;
		--f-display: 'Playfair Display', Georgia, 'Times New Roman', serif; --f-body: 'Figtree', Arial, sans-serif;
		--f-marker: 'Yellowtail', 'Brush Script MT', cursive; --f-label: 'Cinzel', Georgia, serif;
		--ease: cubic-bezier(0.23, 1, 0.32, 1);
		color-scheme: light; background: var(--paper); color: var(--ink); font-family: var(--f-body); font-size: 16px; line-height: 1.55; min-height: 100vh; overflow-x: clip;
		padding-bottom: 116px; /* room for the sing-along dock */
	}
	:global(body:has(.trip)) { background: #f7f0e2; --tabbar-h: 0px; }
	:global(html:has(.trip)) { scroll-behavior: smooth; }
	@media (prefers-reduced-motion: reduce) { :global(html:has(.trip)) { scroll-behavior: auto; } }
	.trip :global(*) { box-sizing: border-box; }
	.trip :global(.wrap) { max-width: 1240px; margin-inline: auto; padding-inline: 40px; }
	:where(.trip) :global(:is(h1, h2, h3, h4, p)) { margin: 0; }
	.trip :global(:is(h1, h2, h3, h4)) { color: inherit; }
	:where(.trip) :global(h2) { font-family: var(--f-display); font-weight: 800; letter-spacing: -.02em; font-size: clamp(38px, 5.4vw, 66px); line-height: 1.04; margin-top: 12px; }
	:where(.trip) :global(h2 span) { color: var(--gold-ink); font-style: italic; font-weight: 600; }
	:where(.trip) :global(h3) { font-size: 18px; font-weight: 800; }
	:where(.trip) :global(a) { color: inherit; text-underline-offset: 4px; }
	/* Zero-specificity reset, so any button's own colour always wins. */
	:where(.trip) :global(:where(button, input, textarea, select)) { font: inherit; color: inherit; }
	.trip :global(button) { cursor: pointer; }
	.trip :global(button:disabled) { cursor: not-allowed; opacity: .5; }
	.trip :global(:focus-visible) { outline: 3px solid #2763c5; outline-offset: 3px; }
	.trip :global(.eyebrow) { display: flex; align-items: center; gap: 12px; font: 600 12px/1.3 var(--f-label); letter-spacing: .24em; color: var(--ember); }
	.trip :global(.eyebrow::before) { content: ''; flex: 0 0 28px; height: 1px; background: currentColor; opacity: .7; }
	.trip :global(.fine) { font-size: 12px; color: var(--muted); line-height: 1.6; margin-top: 10px; }
	.trip :global(.section-intro) { max-width: 720px; color: var(--muted); margin-top: 14px; font-size: 15px; }
	.trip :global(.btn) { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 11px 22px; border: 1px solid var(--ink); border-radius: 999px; background: var(--paper-2); color: var(--ink); font-weight: 800; font-size: 14px; letter-spacing: .02em; text-decoration: none; transition: transform 140ms var(--ease), box-shadow 200ms var(--ease); }
	.trip :global(.btn:active:not(:disabled)) { transform: translateY(2px); }
	.trip :global(.btn.primary) { background: var(--ember); border-color: var(--ember); color: #fff; box-shadow: 0 8px 20px #8e1b3033, inset 0 0 0 1px #d8a84966; }
	.trip :global(.btn.gold) { background: linear-gradient(180deg, #f1d488, var(--sun)); border-color: #b8862c; color: var(--ink); box-shadow: 0 10px 26px #d8a84955; }
	.trip :global(.btn.ghost) { background: transparent; border-color: #f7f0e299; color: #fff; }
	.trip :global(.text-btn) { border: 0; background: none; text-decoration: underline; font-weight: 700; min-height: 44px; padding: 0; color: inherit; }
	.skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
	.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
	.bad { color: #a3361a; font-weight: 700; font-size: 13px; }
	.sub { font: italic 30px var(--f-display) !important; font-weight: 700 !important; margin: 34px 0 12px !important; }

	/* masthead */
	.mast { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
	.brand { text-decoration: none; font-weight: 800; letter-spacing: .12em; font-size: 12px; display: flex; align-items: center; gap: 10px; }
	.brand small { font-size: 9px; letter-spacing: .1em; color: var(--muted); font-weight: 600; }
	.dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--pine); color: var(--sun); font-size: 11px; box-shadow: 0 0 0 1px var(--sun); }
	.brand { font-family: var(--f-label); letter-spacing: .2em; white-space: nowrap; }
	.mast-links button { white-space: nowrap; }
	.mast-links { display: flex; align-items: center; gap: 16px; font-size: 13px; font-weight: 700; }
	.mast-links a { text-decoration: none; padding-block: 12px; }
	.me { border: 1px solid var(--ember); border-radius: 999px; background: var(--ember); color: #fff; padding: 8px 14px; font-weight: 800; font-size: 12px; min-height: 40px; }
	.song-link { border: 1px solid var(--line); border-radius: 999px; background: var(--paper-2); padding: 8px 14px; font-weight: 800; font-size: 12px; min-height: 40px; display: inline-flex; align-items: center; gap: 6px; }

	/* hero: a concert poster in the forest */
	.hero { position: relative; isolation: isolate; min-height: min(96svh, 880px); display: flex; align-items: flex-end; color: #fff; overflow: hidden; }
	.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; z-index: -2; }
	/* Just enough shade to read the text: dark on the left and along the bottom, the forest left alone on the right. */
	.hero-shade { position: absolute; inset: 0; z-index: -1; background:
		linear-gradient(0deg, #1c0409f0 0%, #1c0409a6 22%, transparent 48%),
		linear-gradient(90deg, #1c0409d9 0%, #2a07119e 38%, #2a071226 68%, transparent 100%); }
	.hero-copy { width: 100%; padding-block: 104px 44px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 540px); grid-template-areas: 'title sleeve' 'count sleeve' 'facts facts'; column-gap: 48px; align-items: end; }
	.hero-title { grid-area: title; }
	.hero-count { grid-area: count; }
	.facts { grid-area: facts; }
	.presents { font: 600 13px/1.3 var(--f-label); letter-spacing: .32em; color: var(--sun); display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
	.presents i { font: 26px/1 var(--f-marker); letter-spacing: 0; color: #f3d58f; text-transform: none; }
	.booked { display: inline-flex; align-items: center; gap: 10px; margin-top: 18px !important; border: 1px solid #d8a849aa; border-radius: 999px; color: #f3d58f; padding: 5px 14px 5px 5px; font: 600 11px/1 var(--f-label); letter-spacing: .2em; }
	.booked span { background: var(--sun); color: var(--ink); padding: 5px 10px; border-radius: 999px; }
	h1 { color: #fff; font-family: var(--f-display); font-weight: 900; font-size: clamp(54px, 9.4vw, 136px); line-height: .92; margin-top: 14px !important; letter-spacing: -.03em; text-wrap: balance; }
	h1 span { display: block; font-style: italic; font-weight: 800; background: linear-gradient(180deg, #fbe7ae 10%, #e2b558 55%, #b8862c 90%); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .08em; }
	.hero-sub { max-width: 560px; font: italic 400 clamp(18px, 2vw, 22px)/1.45 var(--f-display); margin-top: 16px !important; color: #f2e6d0; }
	.hero-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 26px; }
	/* your next step: the one obvious action */
	.next { display: flex; align-items: center; gap: 16px; min-height: 64px; padding: 12px 12px 12px 20px; border-radius: 16px; text-decoration: none; color: #fff; background: linear-gradient(180deg, #a3253b, var(--ember)); border: 1px solid #d8a849aa; box-shadow: 0 14px 34px #1c040999, inset 0 1px 0 #ffffff26; transition: transform 160ms var(--ease), box-shadow 200ms var(--ease); }
	.next:hover { transform: translateY(-1px); box-shadow: 0 18px 40px #1c0409bb, inset 0 1px 0 #ffffff26; }
	.next:active { transform: scale(.98); }
	.next-text { display: grid; gap: 1px; min-width: 0; }
	.next-k { font: 600 10px var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: #f3d58f; }
	.next b { font: 800 19px/1.2 var(--f-display); }
	.next small { font-size: 13px; color: #f2dcd2; }
	.next-go { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; margin-left: auto; border-radius: 50%; background: var(--sun); color: var(--ink); }
	.sing { min-height: 52px; }

	/* the phone-only chrome, hidden on bigger screens */
	.bar-title, .me-short, .tabbar { display: none; }

	/* "you're here": a short cue on the heading you just jumped to */
	.trip :global(.arrive h2) { animation: arrive 900ms var(--ease) both; }
	.trip :global(.arrive h2 span) { animation: arrive-glow 1300ms var(--ease) both; }
	@keyframes arrive { from { opacity: .25; transform: translateY(14px); } }
	@keyframes arrive-glow { 0%, 30% { text-shadow: 0 0 0 transparent; } 55% { text-shadow: 0 0 22px #d8a84999; } 100% { text-shadow: 0 0 0 transparent; } }
	.hero-count { margin-top: 30px; max-width: 640px; }

	/* the album sleeve: the cover, with the record peeking out. Tap to watch the choir. */
	.sleeve { grid-area: sleeve; margin: 0 0 0 8px; align-self: center; }
	.sleeve-art { position: relative; width: 86%; margin: 0 0 30px; }
	.vinyl { position: absolute; z-index: 0; width: 96%; aspect-ratio: 1; right: -24%; top: 4%; border-radius: 50%; background: repeating-radial-gradient(circle, #1d1517 0 2px, #2f2427 3px 4px); display: grid; place-items: center; border: 3px solid #140d0f; box-shadow: 4px 10px 26px #0009; transition: transform 700ms var(--ease); }
	.vinyl::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 20deg, #ffffff1a 0 7%, transparent 16% 50%, #ffffff14 57% 64%, transparent 74%); }
	.vinyl > span { position: relative; z-index: 1; width: 32%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, var(--ink) 0 6%, var(--ember) 7%); color: #f3d58f; display: grid; place-content: center; text-align: center; font: 600 9px/1.25 var(--f-label); letter-spacing: .14em; box-shadow: inset 0 0 0 2px var(--sun); }
	.vinyl.spin { transform: translateX(10%); }
	.vinyl.spin > span { animation: turn 3.2s linear infinite; }
	@keyframes turn { to { transform: rotate(360deg); } }
	.sleeve:hover .vinyl:not(.spin) { transform: translateX(8%) rotate(30deg); }
	.album-cover { position: relative; z-index: 1; display: block; width: 100%; padding: 0; border: 1px solid #f3d58f88; background: #1c0409; transform: rotate(-4deg); box-shadow: 0 24px 50px #000a, 0 0 0 6px #1c0409, 0 0 0 7px #d8a84966; cursor: pointer; transition: transform 300ms var(--ease); }
	.album-cover:hover { transform: rotate(-3deg) scale(1.01); }
	.album-cover img, .album-cover video { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; }
	.album-cover video { will-change: transform; background: #1c0409; }
	.cover-sticker { position: absolute; top: -30px; right: -26px; z-index: 2; display: grid; gap: 1px; justify-items: center; padding: 10px 10px 9px; background: radial-gradient(circle at 30% 25%, #fbe7ae, var(--sun) 60%, #b8862c); color: var(--ink); border-radius: 50%; width: 92px; aspect-ratio: 1; place-content: center; text-align: center; transform: rotate(10deg); box-shadow: 0 8px 18px #0007; font: 600 9px/1.2 var(--f-label); letter-spacing: .12em; }
	.cover-sticker b { font: italic 800 15px/1 var(--f-display); letter-spacing: 0; }
	.watch { position: absolute; left: 12px; bottom: 12px; display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 8px; border-radius: 999px; background: #1c0409d9; color: #f7f0e2; font: 700 12px var(--f-body); border: 1px solid #d8a84988; }
	.watch i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--sun); color: var(--ink); }
	.sleeve figcaption { margin-top: 6px; font-size: 13px; font-weight: 700; color: #f2e6d0; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
	.sleeve figcaption b { background: var(--sun); color: var(--ink); padding: 3px 8px; font: 600 10px var(--f-label); letter-spacing: .18em; border-radius: 999px; }
	.sleeve figcaption small { width: 100%; font-weight: 500; color: #d9c9b0; }
	@media (prefers-reduced-motion: reduce) { .vinyl, .album-cover { transition: none; } .vinyl.spin > span { animation: none; } }
	.hero-count .eyebrow { color: var(--sun); margin-bottom: 8px; }
	.facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 30px 0 0; background: #d8a84955; border-block: 1px solid #d8a84988; }
	.facts > div { background: #1c0409cc; padding: 14px 16px; }
	.facts dt { font: 600 10px var(--f-label); letter-spacing: .22em; text-transform: uppercase; color: var(--sun); }
	.facts dd { margin: 4px 0 0; font: 700 18px/1.2 var(--f-display); }
	.facts small { display: block; font: 500 12px var(--f-body); color: #d9c9b0; margin-top: 2px; }
	.facts .late small { color: #ffb4a0; font-weight: 800; }
	.strip { background: linear-gradient(90deg, #3a0a16, var(--pine), #3a0a16); color: #f3d58f; border-block: 1px solid #d8a84966; }
	.strip .wrap { display: flex; justify-content: space-between; align-items: center; gap: 14px; min-height: 54px; font: 600 13px var(--f-label); letter-spacing: .22em; flex-wrap: wrap; }
	.strip i { display: flex; color: var(--sun); opacity: .8; }

	/* lodges */
	.lodges { padding-block: 72px 56px; scroll-margin-top: 10px; }
	.houses { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 16px; margin-top: 28px; align-items: start; }
	.house { background: var(--paper-2); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 10px 30px #2a0b130d; }
	.house.h1 { border: 1px solid var(--sun); box-shadow: 0 0 0 4px var(--paper), 0 0 0 5px var(--sun), 0 18px 40px #8e1b3022; }
	.house-photo { position: relative; aspect-ratio: 3 / 2; background: #e3d2b1; overflow: hidden; }
	.house-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.ph { display: grid; place-items: center; height: 100%; color: var(--sun); background: linear-gradient(135deg, #6b1426, #2a0711); }
	.num { position: absolute; left: 12px; top: 12px; background: var(--paper); color: var(--ink); padding: 5px 10px; border-radius: 999px; font: 600 11px var(--f-label); letter-spacing: .18em; }
	.hub { position: absolute; right: 12px; top: 12px; background: var(--sun); color: var(--ink); padding: 5px 10px; border-radius: 999px; font: 600 11px var(--f-label); letter-spacing: .18em; }
	.house-body { padding: 18px; display: grid; gap: 10px; }
	.house-body h3 { font: italic 800 30px/1.05 var(--f-display); }
	.house-body > p { font-size: 14px; color: var(--muted); }
	.amen { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
	.amen li { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800; padding: 5px 11px; border-radius: 999px; background: var(--ember); color: #fff; }
	.occ { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
	.occ li { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; padding: 9px 12px; background: var(--paper); border-left: 2px solid var(--sun); border-radius: 0 4px 4px 0; font-weight: 800; font-size: 15px; }
	.occ li.mine { border-left-color: var(--ember); background: #f6e3e0; }
	.occ small { font: 600 9px var(--f-label); color: var(--gold-ink); text-transform: uppercase; letter-spacing: .18em; }
	.hnote { font-size: 13px !important; border-left: 2px solid var(--sun); padding-left: 10px; color: var(--ink) !important; }
	.cost { font: 800 28px var(--f-display); color: var(--ember); border-top: 1px solid var(--line); padding-top: 10px; }
	.cost small { font: 12px var(--f-body); color: var(--muted); }

	/* base camp */
	.base { background: radial-gradient(ellipse 60% 90% at 85% 0%, #6b142655, transparent 70%), var(--ink); color: var(--paper); padding-block: 64px; }
	.base .eyebrow, .base :global(h2 span) { color: var(--sun); }
	.base-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
	.base-grid > div > p:last-child { margin-top: 14px; color: #d9c9b0; }
	.fac { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
	.fac li { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: center; padding: 16px; background: #ffffff0a; border: 1px solid #d8a84944; border-radius: 6px; }
	.fac b { display: flex; justify-content: center; color: var(--sun); }
	.fac strong { display: block; font: italic 700 24px var(--f-display); color: #f3d58f; }
	.fac span { font-size: 14px; color: #d9c9b0; }

	/* weekend */
	.weekend { padding-block: 64px; }
	.days { list-style: none; padding: 0; margin: 26px 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
	.days li { background: var(--paper-2); border: 1px solid var(--line); border-top: 3px solid var(--sun); border-radius: 6px; padding: 20px; display: grid; gap: 6px; align-content: start; }
	.days li:first-child, .days li:last-child { border-top-color: var(--ember); }
	.dn { font: italic 800 46px/1 var(--f-display); color: var(--line); }
	.dd { font: 600 12px var(--f-label); letter-spacing: .18em; text-transform: uppercase; color: var(--ember); }
	.dd small { display: block; letter-spacing: 0; text-transform: none; font: 600 13px var(--f-body); color: var(--muted); }
	.days h3 { font: 800 24px/1.15 var(--f-display); }
	.days li > p:last-child { font-size: 14px; color: var(--muted); }

	/* costs */
	.costs { padding-block: 16px 72px; scroll-margin-top: 10px; }
	.receipts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px; } /* 7 groups + the total = 8 */
	.rc { background: var(--paper-2); border: 1px solid var(--line); padding: 16px; display: grid; gap: 8px; align-content: start; background-image: radial-gradient(circle at 50% 0, var(--paper) 6px, transparent 7px); background-size: 18px 12px; background-repeat: repeat-x; padding-top: 22px; }
	.rc.mine { box-shadow: 0 0 0 3px var(--ember); }
	.rc-h { font: 600 10px var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: var(--gold-ink); }
	.rc h3 { font: 800 19px/1.2 var(--f-display); }
	.rc dl { margin: 0; display: grid; gap: 2px; }
	.rc dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; padding: 4px 0; border-top: 1px dotted var(--line); }
	.rc dd { margin: 0; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
	.rc .gift dd, .rc .gift dt { color: var(--moss); font-weight: 800; }
	.rc .tax dd, .rc .tax dt { color: var(--ember); font-weight: 800; }
	.receipts.solo { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 860px; }
	.rc-story { background: var(--ink); color: var(--paper); border-radius: 6px; padding: 22px; display: grid; gap: 12px; align-content: start; font-size: 15px; }
	.rc-story .rc-h { color: var(--sun); }
	.rc-story-total { border-top: 1px solid #d8a84966; padding-top: 12px; font-weight: 700; }
	.rc-story-total b { font: 800 28px var(--f-display); color: var(--sun); margin-left: 6px; }
	.rc-story .text-btn { color: var(--sun); justify-self: start; }
	.org-note { margin-top: 10px; font: 600 11px var(--f-label); letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); }
	.trip :global(.gate) { margin-top: 24px; padding: 22px; border: 1px dashed var(--sun); border-radius: 8px; background: var(--paper-2); display: flex; flex-wrap: wrap; gap: 14px 20px; align-items: center; justify-content: space-between; max-width: 860px; }
	.trip :global(.gate p) { font-size: 15px; max-width: 520px; }
	.rc-sum { background-color: var(--ink); color: var(--paper); background-image: radial-gradient(circle at 50% 0, var(--paper) 6px, transparent 7px); }
	.rc-sum .rc-h { color: var(--sun); }
	.rc-sum dl div { border-top-color: #ffffff30; }
	.rc-sum .rc-total { border-top-color: var(--paper); }
	.rc-sum .rc-total b { color: var(--sun); }
	.rc-total { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--ink); padding-top: 8px; }
	.rc-total span { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.rc-total b { font: 800 26px var(--f-display); color: var(--ember); font-variant-numeric: lining-nums tabular-nums; }

	/* pack */
	.pack { background: var(--paper-2); border-block: 1px solid var(--line); padding-block: 72px; scroll-margin-top: 10px; }
	.twins { margin-top: 24px; padding: 28px; background: radial-gradient(ellipse 50% 120% at 100% 0%, #d8a84933, transparent 70%), var(--ember); color: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #d8a84988 inset, 0 18px 40px #8e1b3033; }
	.twins .eyebrow { color: #f3d58f; }
	.twins h3 { font: italic 800 clamp(28px, 4vw, 42px)/1.08 var(--f-display); margin: 10px 0 10px; }
	.twins p:last-child { font-size: 15px; max-width: 720px; }
	.pack-progress { margin-top: 28px; font: 800 18px var(--f-display); }
	.pack-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; } /* 8 sections */
	.pk { background: var(--paper); border: 1px solid var(--line); border-radius: 6px; padding: 18px; }
	.pk h3 { font: 800 21px var(--f-display); }
	.pk-note { font-size: 13px; color: var(--muted); margin-top: 4px !important; }
	.pk ul { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 2px; }
	.pk label { display: flex; gap: 10px; align-items: center; min-height: 40px; font-size: 14px; cursor: pointer; }
	.pk input { width: 20px; height: 20px; accent-color: var(--ember); flex-shrink: 0; }
	.pk input:checked + span { text-decoration: line-through; color: var(--muted); }
	.provided { margin-top: 14px; padding: 18px 20px; border-left: 2px solid var(--sun); border-radius: 6px; background: var(--paper); display: grid; gap: 6px; font-size: 14px; }
	.provided h3 { font: 800 18px var(--f-display); }
	.shop { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; }
	.shop > div { background: var(--paper); padding: 18px; border-top: 3px solid var(--sun); border-radius: 6px; }
	.shop h4 { font: 800 17px var(--f-display); }
	.shop ul { margin: 8px 0 0; padding-left: 18px; font-size: 14px; display: grid; gap: 3px; }

	/* info */
	.info { padding-block: 72px; scroll-margin-top: 10px; }
	.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; } /* 6 cards */
	.info-grid article { background: var(--paper-2); border: 1px solid var(--line); border-radius: 6px; padding: 20px; display: grid; gap: 8px; align-content: start; font-size: 14px; }
	.info-grid h3 { font: 800 22px var(--f-display); }
	.note { white-space: pre-line; border-left: 2px solid var(--sun); padding-left: 12px; font-weight: 600; }
	.tbc { color: var(--muted); font-style: italic; }
	.tbc span { font: normal 600 9px var(--f-label); letter-spacing: .18em; background: var(--line); color: var(--ink); padding: 3px 8px; border-radius: 999px; margin-right: 6px; }
	.info textarea { width: 100%; border: 1px solid var(--line); background: var(--paper); padding: 10px 12px; border-radius: 6px; }

	.gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding-bottom: 40px; }
	.gallery img { width: 100%; height: 200px; object-fit: cover; display: block; background: #e3d2b1; border-radius: 6px; }

	footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; padding-block: 34px 50px; border-top: 1px solid var(--sun); font: 600 11px/1.6 var(--f-label); letter-spacing: .14em; }
	footer small { font-weight: 500; color: var(--muted); }
	footer .fine { font-weight: 500; max-width: 420px; margin: 0; }
	.arch { display: grid; gap: 4px; }

	/* who are you */
	.sheet-back { position: fixed; inset: 0; background: #1c0409b3; z-index: 40; }
	.sheet { position: fixed; z-index: 41; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(640px, calc(100vw - 32px)); max-height: calc(100svh - 32px); overflow: auto; background: var(--paper); border: 1px solid var(--sun); border-radius: 10px; box-shadow: 0 30px 80px #1c040988; padding: 24px; display: grid; gap: 14px; }
	.sheet h2 { margin: 0 !important; font-size: 40px !important; }
	.pick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } /* 6 couples (3 × 2) + the third wheel across the bottom */
	.pick-card { display: grid; gap: 2px; padding: 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-2); transition: border-color 160ms var(--ease), box-shadow 160ms var(--ease); }
	.pick-card.chosen { border-color: var(--sun); box-shadow: 0 0 0 1px var(--sun); }
	.pick-card.solo { grid-column: 1 / -1; background: #f1e8d6; border-style: dashed; }
	.pick-title { font: 800 19px/1.2 var(--f-display); }
	.pick-card.solo .pick-title { font-style: italic; color: var(--ember); }
	.pick-sub { font-size: 12px; color: var(--muted); }
	.pick-people { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
	.pick-people button { flex: 1 1 0; min-height: 44px; min-width: 0; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); padding: 8px 12px; font-weight: 800; transition: background 160ms var(--ease), color 160ms var(--ease); }
	.pick-card.solo .pick-people button { flex: 0 1 160px; }
	.pick-people button[aria-pressed=true] { background: var(--ember); border-color: var(--ember); color: #fff; }
	@media (max-width: 480px) { .pick { grid-template-columns: 1fr; } .pick-card { padding: 12px 14px; } }

	@media (max-width: 1080px) { .brand small { display: none; } }
	@media (max-width: 960px) {
		.hero-shade { background: linear-gradient(0deg, #1c0409f5 0%, #1c0409c4 45%, #2a07118c 100%); }
		.houses { grid-template-columns: 1fr 1fr; }
		.house.h1 { grid-column: 1 / -1; }
		.base-grid { grid-template-columns: 1fr; gap: 24px; }
		.days { grid-template-columns: 1fr 1fr; }
		.shop { grid-template-columns: 1fr 1fr; }
		.facts { grid-template-columns: 1fr 1fr; }
		.hero-copy { grid-template-columns: 1fr; grid-template-areas: 'title' 'sleeve' 'count' 'facts'; }
		.sleeve { width: min(88%, 500px); margin: 34px 0 0 14px; justify-self: start; }
		.receipts, .pack-grid, .info-grid { grid-template-columns: 1fr 1fr; }
	}
	@media (max-width: 720px) {
		:global(body:has(.trip)) { --tabbar-h: 64px; }
		.trip { padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 96px); }
		.trip :global(.wrap) { padding-inline: 16px; }
		.trip :global(section[id]), .trip :global(header[id]) { scroll-margin-top: 58px; }

		/* app bar: brand mark, the section you're in, and you */
		.mast { position: sticky; top: 0; z-index: 25; min-height: 56px; gap: 10px; background: #f7f0e2eb; backdrop-filter: blur(12px) saturate(1.4); -webkit-backdrop-filter: blur(12px) saturate(1.4); border-bottom: 1px solid #e3d2b1aa; }
		.brand-name, .brand small, .mast-links a, .song-link, .me-full { display: none; }
		.bar-title { display: block; flex: 1; min-width: 0; position: relative; height: 24px; overflow: hidden; font: 800 17px/24px var(--f-display); white-space: nowrap; }
		.bar-title span { position: absolute; inset: 0; overflow: hidden; text-overflow: ellipsis; }
		.me { display: grid; place-items: center; width: 40px; height: 40px; min-height: 40px; padding: 0; border-radius: 50%; font: 800 16px var(--f-display); }
		.me-short { display: inline; }

		/* bottom tab bar */
		.tabbar { display: grid; grid-template-columns: repeat(5, 1fr); position: fixed; z-index: 31; left: 0; right: 0; bottom: 0; height: calc(var(--tabbar-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: #2a0b13f7; border-top: 1px solid #d8a84955; box-shadow: 0 -10px 30px #1c040933; }
		.tabbar a { position: relative; z-index: 1; display: grid; place-items: center; align-content: center; gap: 3px; text-decoration: none; color: #d9c9b0; font-size: 11px; font-weight: 700; -webkit-tap-highlight-color: transparent; transition: color 200ms var(--ease); }
		.tabbar a.on { color: #fff; }
		.tabbar a.on :global(svg) { color: var(--sun); }
		.tabbar a:active { transform: scale(.94); }
		.tab-ink { position: absolute; top: 0; left: 0; width: 20%; height: 3px; display: grid; place-items: center; transform: translateX(calc(var(--i, 0) * 100%)); transition: transform 360ms var(--ease); }
		.tab-ink::after { content: ''; width: 34px; height: 3px; border-radius: 0 0 3px 3px; background: var(--sun); box-shadow: 0 0 12px #d8a849aa; }

		.hero-copy { padding-block: 48px 28px; }
		.hero-cta { flex-direction: column; align-items: stretch; }
		.next { width: 100%; }
		.sing { width: 100%; }
		.lodges, .weekend, .pack, .info { padding-block: 52px; }
		.costs { padding-bottom: 52px; }
		.gallery { grid-template-columns: 1fr 1fr; }
		.gallery img { height: 130px; }
		.strip .wrap { justify-content: center; gap: 4px 18px; min-height: 0; padding-block: 12px; font-size: 11px; line-height: 1.5; letter-spacing: .18em; }
		.strip i { display: none; }
		.twins { padding: 20px; }

		/* album sleeve: the record rises out of the top, so the cover can use the full width */
		.sleeve { width: 100%; margin: 26px 0 0; justify-self: stretch; }
		.sleeve-art { width: 100%; margin: 28% 0 22px; }
		.vinyl { width: 82%; right: auto; left: 50%; top: -26%; transform: translate(-50%, 0); }
		.vinyl.spin { transform: translate(-50%, -5%); }
		.sleeve:hover .vinyl:not(.spin) { transform: translate(-50%, -3%) rotate(30deg); }
		.album-cover { transform: rotate(-2deg); }
		.album-cover:hover { transform: rotate(-2deg); }
		.cover-sticker { top: -18px; right: -6px; width: 84px; }

		/* swipeable rows instead of long stacks */
		.houses, .days, .info-grid { display: grid; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 84%; gap: 12px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scroll-padding-inline: 16px; margin-inline: -16px; padding: 4px 16px 14px; scrollbar-width: none; align-items: stretch; }
		.houses::-webkit-scrollbar, .days::-webkit-scrollbar, .info-grid::-webkit-scrollbar { display: none; }
		.houses > *, .days > *, .info-grid > * { scroll-snap-align: start; }
		.house.h1 { grid-column: auto; box-shadow: 0 0 0 3px var(--paper), 0 0 0 4px var(--sun); }
		.days { grid-auto-columns: 72%; }

		/* thumb-sized, full-width actions */
		.trip :global(.btn) { min-height: 52px; }
		.trip :global(.gate .btn), .trip :global(.row .btn), .trip :global(.mine-box .btn) { flex: 1 1 100%; }
		.trip :global(.gate) { flex-direction: column; align-items: stretch; }

		/* the name picker becomes a bottom sheet */
		.sheet { left: 0; right: 0; top: auto; bottom: 0; width: 100%; max-height: 88svh; transform: none; border-radius: 22px 22px 0 0; border-width: 1px 0 0; padding: 14px 18px calc(18px + env(safe-area-inset-bottom)); animation: sheet-up 380ms var(--ease); }
		.sheet::before { content: ''; justify-self: center; width: 40px; height: 4px; border-radius: 999px; background: var(--line); }
		.sheet h2 { font-size: 32px !important; }
		.sheet-back { animation: fade-in 260ms ease both; }
	}
	@keyframes sheet-up { from { transform: translateY(100%); } }
	@keyframes fade-in { from { opacity: 0; } }
	@media (max-width: 720px) and (prefers-reduced-motion: reduce) { .sheet, .sheet-back, .tab-ink { animation: none; transition: none; } }
	@media (max-width: 560px) { .receipts, .receipts.solo, .pack-grid { grid-template-columns: 1fr; } }
	@media (max-width: 420px) { .shop { grid-template-columns: 1fr; } }
	@media (prefers-reduced-motion: reduce) { .trip :global(.btn) { transition: none; } }
</style>

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import StenPlayer from '$lib/components/StenPlayer.svelte';
	import SwitzerlandWildcard from '$lib/components/SwitzerlandWildcard.svelte';
	import type { PageData } from './$types';
	import type { House, Lead, Extra } from '$lib/sten-do';
	import { cleanName, nameKey, money, ROUND } from '$lib/sten-do';
	import { WEDDING } from '$lib/wedding-info';

	let { data }: { data: PageData } = $props();

	type Picks = Record<string, number>;

	// User-supplied sleeve artwork.
	const ALBUM_COVER = '/images/sten-do/stendo-album-cover.png';
	const BASE = '/stendo/archive';
	const NAME_KEY = `stendo.name.${ROUND}`;

	// Static SSR content — read once; `data` doesn't change over the page's life.
	// svelte-ignore state_referenced_locally
	const houses = data.houses as House[];
	// svelte-ignore state_referenced_locally
	const leads = data.leads as Lead[];
	// svelte-ignore state_referenced_locally
	const extras = data.extras as Extra[];
	// svelte-ignore state_referenced_locally
	const VOTES_TOTAL = data.votesTotal;

	const sum = (p: Picks) => {
		let s = 0;
		for (const k in p) s += p[k] || 0;
		return s;
	};
	const store = {
		get(k: string) {
			try {
				return localStorage.getItem(k);
			} catch {
				return null;
			}
		},
		set(k: string, v: string) {
			try {
				localStorage.setItem(k, v);
			} catch {
				/* private mode — preference just won't persist */
			}
		}
	};

	// ---- voting state ----
	// Seed once from the SSR payload. After first paint, state moves only via the
	// voter's own taps and the polling loop — never a `data` change — so capturing
	// the initial value here is deliberate.
	// svelte-ignore state_referenced_locally
	let myName = $state(data.myName ?? '');
	// The name the server has this browser's ballot under — myName is just the input.
	// svelte-ignore state_referenced_locally
	let committedName = $state(data.myName ?? '');
	// Everyone's contestant names, for the "pick your name" list.
	// svelte-ignore state_referenced_locally
	let names = $state<string[]>(data.names ?? []);
	// svelte-ignore state_referenced_locally
	let myPicks = $state<Picks>({ ...data.mine }); // this viewer's optimistic ballot
	// svelte-ignore state_referenced_locally
	let serverTotals = $state<Picks>({ ...data.totals }); // aggregate as the server last told us
	// svelte-ignore state_referenced_locally
	let serverMine = $state<Picks>({ ...data.mine }); // my ballot as the server last stored it
	// svelte-ignore state_referenced_locally
	let serverVoterCount = $state<number>(data.voterCount);
	let sortMode = $state<'top' | 'price' | 'wish'>('wish');
	let photos = $state<Record<string, number>>({});
	let onlyBudget = $state(false);
	let onlyMine = $state(false);

	const spent = $derived(sum(myPicks));

	// Displayed totals: the server aggregate with my last-saved ballot swapped out
	// for my current optimistic one, so my own taps register instantly while other
	// people's votes still flow in from polling.
	const totals = $derived.by<Picks>(() => {
		const t: Picks = { ...serverTotals };
		for (const k in serverMine) t[k] = (t[k] || 0) - (serverMine[k] || 0);
		for (const k in myPicks) t[k] = (t[k] || 0) + (myPicks[k] || 0);
		return t;
	});

	const voterCount = $derived.by<number>(() => {
		const wasVoter = sum(serverMine) > 0;
		const isVoter = spent > 0;
		return serverVoterCount - (wasVoter ? 1 : 0) + (isVoter ? 1 : 0);
	});

	// Equal-sized result rows; tied houses keep their original shortlist order.
	const results = $derived(houses.map(h => ({ h, t: totals[h.id] || 0 })).sort((a, b) => b.t - a.t || a.h.n - b.h.n));
	const totalVotes = $derived(results.reduce((sum, item) => sum + item.t, 0));
	const leaders = $derived(results.filter(item => item.t > 0 && item.t === results[0]?.t));
	const annotations = ['Count the chairs.', 'Inspect the throne room.', 'Imagine the midnight snacks.'];
	const hotTub = (h: House) => h.amen.find(a => /hot tub/i.test(a[0]))?.[0] ?? 'Not verified';
	const pool = (h: House) => h.id === 'chyandour' ? 'Shared indoor pool' : h.id === 'walton-castle' ? 'Private indoor pool' : 'Not verified';
	let stamped = $state('');
	let stampTimer: ReturnType<typeof setTimeout> | undefined;
	function reviewChoices() {
		onlyMine = !onlyMine;
		document.getElementById('houses')?.scrollIntoView({ behavior: 'instant' });
	}

	const maxTotal = $derived(Math.max(1, ...houses.map((h) => totals[h.id] || 0)));

	const ordered = $derived.by<House[]>(() => {
		const a = houses.filter(h => (!onlyBudget || (h.total !== null && h.priceKind !== 'guide' && h.total <= 4000)) && (!onlyMine || (myPicks[h.id] || 0) > 0));
		if (sortMode === 'top')
			a.sort(
				(x, y) =>
					(totals[y.id] || 0) - (totals[x.id] || 0) ||
					x.n - y.n
			);
		else if (sortMode === 'price') a.sort((x, y) => (x.total ?? Infinity) - (y.total ?? Infinity));
		else a.sort((x, y) => x.n - y.n);
		return a;
	});

	let carousel: HTMLDivElement;
	let activeHouse = $state(houses[0]?.id ?? '');
	const activeIndex = $derived(Math.max(0, ordered.findIndex(h => h.id === activeHouse)));

	function goToHouse(index: number) {
		const card = carousel?.children[Math.max(0, Math.min(index, ordered.length - 1))] as HTMLElement;
		if (!card) return;
		activeHouse = card.dataset.id ?? '';
		carousel.scrollTo({ left: card.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
	}

	function trackHouse() {
		if (!carousel || !ordered.length) return;
		const cards = [...carousel.children] as HTMLElement[];
		const nearest = cards.reduce((a, b) => Math.abs(b.offsetLeft - carousel.scrollLeft) < Math.abs(a.offsetLeft - carousel.scrollLeft) ? b : a);
		activeHouse = nearest.dataset.id ?? '';
	}

	function carouselKey(event: KeyboardEvent) {
		if (event.target !== carousel) return;
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		goToHouse(event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
	}

	// Preserve the current house when voting changes the sort order.
	$effect(() => {
		const ids = ordered.map(h => h.id).join(',');
		if (!ids) return;
		tick().then(() => {
			if (!carousel) return;
			const index = Math.max(0, ordered.findIndex(h => h.id === activeHouse));
			const card = carousel.children[index] as HTMLElement;
			if (card) carousel.scrollTo({ left: card.offsetLeft, behavior: 'instant' });
			trackHouse();
		});
	});

	const fmtBaths = (b: number | null) =>
		b == null ? '?' : Number.isInteger(b) ? String(b) : b.toFixed(1);

	// ---- actions ----
	function addVote(id: string) {
		if (!myName.trim()) {
			openIntro();
			return;
		}
		const cur = spent;
		if (cur >= VOTES_TOTAL) return;
		myPicks = { ...myPicks, [id]: (myPicks[id] || 0) + 1 };
		stamped = id;
		clearTimeout(stampTimer);
		stampTimer = setTimeout(() => stamped = '', 380);
		scheduleSave();
		if (cur + 1 === VOTES_TOTAL) celebrate();
	}
	function removeVote(id: string) {
		if (!myPicks[id]) return;
		const next = { ...myPicks };
		next[id] -= 1;
		if (next[id] <= 0) delete next[id];
		myPicks = next;
		scheduleSave();
	}
	function clearMine() {
		if (!Object.keys(myPicks).length) return;
		myPicks = {};
		scheduleSave();
	}
	function commitName() {
		const n = cleanName(myName);
		if (!n) {
			myName = committedName; // a blank name can't hold a ballot — put the old one back
			return;
		}
		myName = n;
		store.set(NAME_KEY, n);
		if (n !== committedName) claimName(n);
	}

	// Attach this browser to the ballot for `n`. If that name has voted before
	// (another phone, cleared cookies) the server hands back their picks and
	// they carry on editing that ballot rather than starting a second one.
	let claiming = $state(false);
	async function claimName(n: string) {
		clearTimeout(saveTimer);
		claiming = true;
		try {
			const res = await fetch(`${BASE}/name`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: n })
			});
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const d = await res.json();
			// Only apply if they haven't typed a different name meanwhile.
			if (cleanName(myName) === n) {
				myName = committedName = d.name;
				store.set(NAME_KEY, d.name);
				myPicks = { ...(d.mine ?? {}) };
				serverMine = { ...(d.mine ?? {}) };
				if (d.claimed)
					showToast(
						sum(myPicks)
							? `Welcome back, ${d.name} — your votes are loaded`
							: `Welcome back, ${d.name}`
					);
			}
			serverTotals = d.totals ?? {};
			serverVoterCount = d.voterCount ?? 0;
			names = d.names ?? names;
			dirty = false; // the server's copy of this ballot is now the truth
			setOffline(false);
		} catch {
			// Offline: votes still go out under the typed name and the server
			// resolves it to the right ballot when they land.
			setOffline(true);
		} finally {
			claiming = false;
			// A tap that arrived mid-claim (or a claim that failed) still needs saving.
			if (dirty) {
				dirty = false;
				scheduleSave();
			}
		}
	}

	// ---- persistence ----
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let writing = false;
	let dirty = false;

	function scheduleSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(saveVote, 320);
	}
	async function saveVote() {
		if (!cleanName(myName)) return; // nameless votes have no ballot to land on
		if (writing || claiming) {
			dirty = true;
			return;
		}
		writing = true;
		const sentName = cleanName(myName);
		try {
			const res = await fetch(`${BASE}/vote`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: sentName, picks: myPicks, round: ROUND })
			});
			if (res.status === 409) { showToast('The shortlist changed. Reload to vote.'); return; }
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const d = await res.json();
			serverTotals = d.totals ?? {};
			serverMine = d.mine ?? {};
			serverVoterCount = d.voterCount ?? 0;
			// Normally a no-op; matters when an offline name change landed via this vote.
			if (d.name && nameKey(d.name) === nameKey(sentName)) committedName = d.name;
			setOffline(false);
		} catch {
			dirty = true;
			setOffline(true);
		} finally {
			writing = false;
		}
		if (dirty) {
			dirty = false;
			setTimeout(saveVote, 2000); // back off instead of hammering a dead network
		}
	}

	async function refresh() {
		if (typeof document !== 'undefined' && document.hidden) return;
		if (writing || dirty || claiming) return; // don't let a poll clobber an in-flight ballot
		try {
			const res = await fetch(`${BASE}/feed`, { cache: 'no-store' });
			if (!res.ok) return;
			const d = await res.json();
			serverTotals = d.totals ?? {};
			serverVoterCount = d.voterCount ?? 0;
			serverMine = d.mine ?? {};
			names = d.names ?? names;
			setOffline(false);
		} catch {
			setOffline(true);
		}
	}

	// ---- banner / toast ----
	let bannerMsg = $state('');
	function setOffline(off: boolean) {
		bannerMsg = off ? "Can't reach the live tally right now — your votes will sync when you're back." : '';
	}

	let toastMsg = $state('');
	let toastOn = $state(false);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function showToast(m: string) {
		toastMsg = m;
		toastOn = true;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastOn = false), 3600);
	}

	// ---- intro modal ----
	let showIntro = $state(false);
	let introName = $state('');
	let introInput = $state<HTMLInputElement>();
	let dialogEl = $state<HTMLDivElement>();
	let lastFocus: Element | null = null;

	async function openIntro() {
		lastFocus = document.activeElement;
		introName = myName;
		showIntro = true;
		await tick();
		// Keep the keyboard closed on touch devices until the guest taps the field.
		if (window.matchMedia('(pointer: fine)').matches) introInput?.focus();
		else dialogEl?.focus();
	}
	function closeIntro() {
		const n = cleanName(introName);
		if (n) {
			myName = n;
			commitName();
		}
		showIntro = false;
		if (lastFocus instanceof HTMLElement) lastFocus.focus();
	}
	function pickName(n: string) {
		introName = n;
		closeIntro();
	}
	function dialogKeys(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeIntro();
			return;
		}
		if (e.key !== 'Tab' || !dialogEl) return;
		const f = dialogEl.querySelectorAll<HTMLElement>('button, input, a[href]');
		if (!f.length) return;
		const first = f[0];
		const last = f[f.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (!showIntro) return;
		const html = document.documentElement;
		const prev = html.style.overflow;
		html.style.overflow = 'hidden';
		return () => {
			html.style.overflow = prev;
		};
	});

	function celebrate() {
		showToast('All 3 votes allocated. Your bonus track unlocks once they’re saved.');
	}

	onMount(() => {
		// No ballot on this browser yet but they've played here before: reattach
		// to their name so their earlier votes come back instead of starting over.
		if (!myName) {
			const saved = cleanName(store.get(NAME_KEY));
			if (saved) {
				myName = saved;
				claimName(saved);
			}
		}

		// Archived: no auto-opening ballot modal. The name dialog still opens on demand.

		const poll = setInterval(refresh, 4000);
		return () => {
			clearInterval(poll);
			clearTimeout(saveTimer);
			clearTimeout(toastTimer);
			clearTimeout(stampTimer);
		};
	});
</script>

<svelte:head>
    <title>THE STENDO (archive) · {WEDDING.coupleName}</title>
    <meta name="robots" content="noindex" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Figtree:wght@400;500;600;700;800&family=Permanent+Marker&display=swap" />
</svelte:head>

<div class="stendo">
    <a class="skip-link" href="#houses">Skip to the houses</a>
    <aside class="archive-banner" aria-label="Archived page"><span>ARCHIVED · VOL. 01</span><p>This was the house hunt. It didn’t stick. <a href="/stendo/archive/center-parcs">Vol. 02 was the Center Parcs pitch</a>, and <a href="/stendo">we’ve booked it →</a></p></aside>
    <header class="hero">
        <nav class="masthead wrap" aria-label="Page navigation">
            <a class="brand" href="#top"><span class="record-mark" aria-hidden="true">●</span> STEN RECORDS<span class="edition">INDEPENDENT HOLIDAY DECISIONS</span></a>
            <div class="mast-links"><a href="#houses">The houses ↘</a><a href="#results">The live chart ↗</a></div>
        </nav>
        <SwitzerlandWildcard />
        <div class="hero-body wrap" id="top">
            <div class="hero-heading">
                <p class="eyebrow">KATIE & ALEX PRESENT <span>THE WEEKEND LP / VOL. 01</span></p>
                <h1><span>THE</span> <span>STENDO</span></h1>
            </div>
            <div class="record-feature">
                <div class="sleeve-art" aria-label="The weekend record sleeve: 12 guests, 19–21 March 2027">
                    <div class="vinyl" aria-hidden="true"><span>STEN<br />SIDE A</span></div>
                    <div class="album-cover" class:has-artwork={ALBUM_COVER !== null}>
                        {#if ALBUM_COVER}
                            <img class="supplied-cover" src={ALBUM_COVER} alt="STENDO — Floor Plan Review album cover" width="800" height="800" />
                        {:else}
                            <div class="album-meta"><span>STEN—001</span><span>EST. 2027</span></div>
                            <p class="album-title">STRAIGHT<br />OUTTA<br /><em>OFFICE.</em></p>
                            <div class="collage" aria-hidden="true"><img class="collage-main" src={houses[2].images[0]} alt="" width="640" height="430" /><img class="collage-small" src={houses[1].images[1]} alt="" width="300" height="200" /></div>
                            <span class="cover-sticker">12 GUESTS<br /><b>NO BUNKS.</b></span>
                            <div class="album-footer"><span>19—21 MARCH 2027</span><span>FLOOR-PLAN REVIEW</span></div>
                        {/if}
                    </div>
                </div>
                <div class="sleeve-trip">
                <p class="hero-description">Six couples. One glorious weekend. And a website considerably more elaborate than the situation required.</p>
                <div class="weekend-ticket"><span class="ticket-side">ADMIT 12</span><div><span class="eyebrow">THE STEN WEEKENDER</span><b>19—21 MARCH ’27</b><span>Six couples · one entire house</span></div><span class="ticket-star" aria-hidden="true">✳</span></div>
                </div>
            </div>
            <div class="hero-copy">
                <p class="hero-tag">Six loos. One do.</p>
                
                <div class="hero-actions"><a class="button primary" href="#houses">Scope the houses <span aria-hidden="true">↓</span></a><button class="text-button" type="button" onclick={openIntro}>How voting works ↗</button></div>
                <div class="hero-status"><span><i aria-hidden="true"></i> Voting open · Deadline not set</span><span><b>{VOTES_TOTAL - spent} / {VOTES_TOTAL}</b> votes remaining</span></div>
                <StenPlayer bonusUnlocked={spent === VOTES_TOTAL && sum(serverMine) === VOTES_TOTAL && !claiming} />
            </div>
        </div>
        <div class="manifesto"><div class="wrap"><span>6 COUPLES</span><span aria-hidden="true">✳</span><span>6 DOUBLE ROOMS MIN.</span><span aria-hidden="true">✳</span><span>6 BATHROOMS MIN.</span><span aria-hidden="true">✳</span><span>ZERO BUNK-BED POLITICS</span></div></div>
    </header>

    <main>
        <section id="houses" class="shortlist wrap" aria-labelledby="houses-title">
            <div class="section-heading"><div><p class="eyebrow">SIDE A / THE SHORTLIST</p><h2 id="houses-title">THE HEAVY<br /><span>ROTATION.</span></h2></div><p class="section-note">Check the beds.<br />Count the loos. <span aria-hidden="true">↙</span></p></div>
            <p class="section-intro">{houses.length} houses. Six couples. Three votes each. Quoted prices cover the whole stay for 12 adults, split six ways. Guide prices, missing quotes and conditional room layouts are marked.</p>
            <div class="collection-tools">
                <div class="sort-control"><label for="sort">Sort by</label><select id="sort" bind:value={sortMode}><option value="wish">Shortlist order</option><option value="price">Lowest price</option><option value="top">Most votes</option></select></div>
                <div class="filters" role="group" aria-label="Filter houses"><button type="button" aria-pressed={onlyBudget} onclick={() => onlyBudget = !onlyBudget}>£4,000 or less</button><button type="button" aria-pressed={onlyMine} onclick={() => onlyMine = !onlyMine}>My choices{spent ? ` (${spent} votes)` : ''}</button></div>
                <span class="collection-count">{ordered.length} / {houses.length} houses</span>
            </div>
            {#if bannerMsg}<div class="banner" role="status">{bannerMsg}</div>{/if}
            <div class="carousel-nav">
                <span class="catalogue">FLIP THROUGH THE CRATE <span aria-live="polite">/ {ordered.length ? String(activeIndex + 1).padStart(2, '0') : '00'} — {String(ordered.length).padStart(2, '0')}</span></span>
                <div><span class="swipe-hint">Swipe or use the arrows</span><button type="button" aria-label="Previous property" aria-controls="house-carousel" disabled={activeIndex <= 0 || !ordered.length} onclick={() => goToHouse(activeIndex - 1)}>←</button><button type="button" aria-label="Next property" aria-controls="house-carousel" disabled={activeIndex >= ordered.length - 1 || !ordered.length} onclick={() => goToHouse(activeIndex + 1)}>→</button></div>
            </div>
            <!-- Keyboard navigation is provided on the focusable carousel region. -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
            <div class="house-carousel" id="house-carousel" bind:this={carousel} role="region" aria-roledescription="carousel" aria-label="Weekend properties" tabindex="0" onkeydown={carouselKey} onscroll={trackHouse}>
                {#each ordered as h, index (h.id)}
                    {@const mine = myPicks[h.id] || 0}
                    <article class="card" class:picked={mine > 0} class:featured={h.featured} data-id={h.id} aria-label={`${index + 1} of ${ordered.length}: ${h.name}`}>
                        <div class="sleeve-visual">
                            <div class="sleeve-topline"><span>STEN / {String(h.n).padStart(2, '0')}</span><span>{h.loc.split(' · ').at(-1)}</span></div>
                            <div class="house-photo"><img src={h.images[photos[h.id] || 0]} alt={`${h.name} — property photo ${(photos[h.id] || 0) + 1} of ${h.images.length}`} width="720" height="480" loading={h.n === 1 ? 'eager' : 'lazy'} decoding="async" />
                                {#if mine > 0}<div class="selection-stamp" class:stamp={stamped === h.id}>ON MY LIST <span>✓ {mine} {mine === 1 ? 'VOTE' : 'VOTES'}</span></div>{/if}
                                {#if h.images.length > 1}<div class="photo-controls"><button type="button" aria-label={`Previous photo of ${h.name}`} onclick={() => photos[h.id] = ((photos[h.id] || 0) + h.images.length - 1) % h.images.length}>←</button><span>{(photos[h.id] || 0) + 1} / {h.images.length}</span><button type="button" aria-label={`Next photo of ${h.name}`} onclick={() => photos[h.id] = ((photos[h.id] || 0) + 1) % h.images.length}>→</button></div>{/if}
                            </div>
                            <div class="photo-foot"><span class="hand-note">{annotations[(h.n - 1) % annotations.length]}</span><span class="barcode" aria-hidden="true"></span></div>
                        </div>
                        <div class="sleeve-info">
                            {#if h.featured}<p class="featured-label">★ HOSTS’ PICK · THE NICEST OF THE LOT</p>{/if}
                            <p class="c-loc">{h.loc}</p><h3>{h.name}</h3><p class="caption">{h.caption}</p>
                            <div class="price-row"><div class="couple-price"><strong>{h.total === null ? 'Quote needed' : `${h.priceKind === 'guide' ? 'From ' : ''}${money(h.total / 6)}`}</strong><span>{h.total === null ? 'Price unconfirmed' : h.priceKind === 'guide' ? 'per couple · guide only' : h.priceKind === 'contribution' ? 'per couple · your contribution' : 'per couple'}</span></div><div class="whole-price"><b>{h.total === null ? 'Ask owner for price' : `${h.priceKind === 'guide' ? 'From ' : ''}${money(h.total)} ${h.priceKind === 'contribution' ? 'group contribution' : 'total'}`}</b><span>{h.nights ?? 2} nights · whole house</span><span>{h.nights === 3 ? '19–22' : '19–21'} March 2027</span></div></div>
                            {#if h.priceKind === 'contribution'}<p class="third-night-note"><strong>We’ll cover the third night.</strong> £640 per couple · 3-night minimum · 19–22 March.</p>{/if}
                            <dl class="room-stats"><div><dt>Bedrooms</dt><dd>{h.beds ?? '?'}</dd></div><div><dt>Double rooms</dt><dd>{h.doubles}{#if h.id === 'fogga-croft'}<small style="display:block;font:11px/1.4 var(--f-body)">confirmed</small>{/if}</dd></div><div><dt>Bath / shower</dt><dd>{fmtBaths(h.baths)}</dd></div><div><dt>En-suites</dt><dd>{h.ensuites ?? "Unconfirmed"}</dd></div></dl>
                            <dl class="amenity-facts"><div><dt>Dining seats</dt><dd>{h.dining ?? (h.id === 'pasture-house' ? '16' : h.id === 'fogga-croft' ? '12' : 'Not yet verified')}</dd></div><div><dt>Hot tub</dt><dd>{hotTub(h)}</dd></div><div><dt>Swimming pool</dt><dd>{pool(h)}</dd></div><div><dt>Stay requirement</dt><dd>{h.nights === 3 ? '3-night minimum' : h.priceKind === 'pending' || h.priceKind === 'guide' ? 'Confirm exact weekend' : '2-night price checked'}</dd></div></dl>
                            <div class="stamps" aria-label="Verified features"><span>SLEEPS {h.sleeps}</span>{#if (h.ensuites ?? 0) >= 6}<span>{h.ensuites} EN-SUITES</span>{/if}{#if h.id === 'chyandour'}<span>SHARED INDOOR POOL</span>{/if}{#each h.amen.filter(a => !/en-suite|hot tub|pool & gym|double|super-king/i.test(a[0])).slice(0, 2) as a}<span>{a[0]}</span>{/each}</div>
                            <p class="house-caution"><b>Before you vote</b>{h.caution}</p>
                            <div class="card-actions"><a class="button listing-link" href={h.url} target="_blank" rel="noopener">View the house ↗</a><div class="vote-control" role="group" aria-label={`Your votes for ${h.name}`}><button class="minus" type="button" aria-label={`Remove a vote from ${h.name}`} disabled={mine <= 0 || claiming} onclick={() => removeVote(h.id)}>−</button><span class="my-votes" aria-label={`Your votes on ${h.name}`}>{mine}</span><button class="vote-button" type="button" aria-label={`Vote for ${h.name}`} disabled={spent >= VOTES_TOTAL || claiming} onclick={() => addVote(h.id)}>{mine ? '+ Add vote' : '+ Vote'}</button></div></div>
                            <div class="card-meta"><span>{totals[h.id] || 0} total {(totals[h.id] || 0) === 1 ? 'vote' : 'votes'}</span><span>{mine ? '✓ On your ballot' : 'Not on your ballot'}</span></div>
                            <details class="house-details"><summary>Room arrangements, price & access notes</summary><p>{h.roomNote}</p><p>{h.priceNote}</p><p>{@html h.nearby}</p><p>Step-free access has not been verified. Confirm access needs and any unverified dining capacity with the host.</p><a href={h.evidence} target="_blank" rel="noopener">Check the source ↗</a></details>
                        </div>
                    </article>
                {:else}<div class="empty-state"><h3>No sleeves in this crate.</h3><p>{onlyMine ? 'Your ballot is empty. Browse the houses to add your first vote.' : 'No houses match these filters.'}</p><button class="button" type="button" onclick={() => { onlyMine = false; onlyBudget = false; }}>Show all houses</button></div>{/each}
            </div>
            <div class="carousel-nav bottom-nav" aria-label="Browse more houses"><span class="catalogue">{ordered.length ? `${activeIndex + 1} OF ${ordered.length} HOUSES` : 'NO HOUSES'}</span><div><button type="button" aria-label="Previous property below cards" disabled={activeIndex <= 0 || !ordered.length} onclick={() => goToHouse(activeIndex - 1)}>←</button><button type="button" aria-label="Next property below cards" disabled={activeIndex >= ordered.length - 1 || !ordered.length} onclick={() => goToHouse(activeIndex + 1)}>→</button></div></div>
            <p class="research-note">Rooms & prices checked 6 Nov 2026. Quotes are not held. Per-couple figures are rounded. Link beds must be requested as doubles. A pool table is, tragically, not a swimming pool.</p>
        </section>

        <section id="results" class="results-section" aria-labelledby="results-title"><div class="wrap results-layout">
            <div class="results-intro"><p class="eyebrow">SIDE B / THE LIVE CHART</p><h2 id="results-title">THE PEOPLE<br />HAVE <span>SPOKEN.</span><small>(Some of them.)</small></h2><p>{voterCount} {voterCount === 1 ? 'person has' : 'people have'} voted. {totalVotes} votes on the board. Every house, the same rules. No record-label interference.</p><p class="chart-caption" aria-live="polite">{leaders.length === 0 ? 'No votes yet. A suspiciously quiet debut.' : leaders.length === 1 ? `${leaders[0].h.name} is currently leading with ${leaders[0].t} ${leaders[0].t === 1 ? 'vote' : 'votes'}.` : `Joint lead: ${leaders.map(x => x.h.name).join(', ')} — ${leaders[0].t} votes each.`}</p></div>
            <ol class="chart" aria-label="House rankings">{#each results as item (item.h.id)}<li><div class="chart-label"><span>{item.h.name}</span><b>{item.t}<span class="sr-only"> {item.t === 1 ? 'vote' : 'votes'}</span></b></div><div class="chart-track" aria-hidden="true"><div class="chart-bar" style:transform={`scaleX(${item.t / maxTotal})`}></div></div></li>{/each}</ol>
        </div></section>


        <section class="liner-notes wrap" aria-labelledby="notes-title"><p class="eyebrow">THE LINER NOTES</p><h2 id="notes-title">READ BEFORE THE REUNION TOUR.</h2><div class="notes-grid"><details><summary>How voting works</summary><p>Enter your name. You get {VOTES_TOTAL} votes: stack them on one favourite or spread them around. One ballot per name, with automatic saving. You can change your choices any time. No voting deadline has been set.</p><button class="text-button" type="button" onclick={openIntro}>Enter or change your name ↗</button></details><details><summary>The shortlist checks</summary>{#each leads as l}<p><b>{l.h}</b> {l.p} {l.mini}</p>{/each}</details><details><summary>The weekend & booking notes</summary><p>19–21 March 2027, 12 adults. Some houses require longer bookings; those prices include the longer stay. All prices are observations, not reservations.</p><p>Confirm celebration policies with every host. Foldyard prohibits stag parties and requires explicit approval for a mixed sten group. Warren Hill’s total includes £100 hot-tub hire. Dining seats and step-free access still need checking.</p></details><details><summary>Bonus tracks: things to do</summary><p>Ideas from the earlier search. Indicative prices; check availability and current rates.</p>{#each extras as x}<div class="extra"><h3>{x.t}</h3><p>{x.what}</p><p>{@html x.cost}</p><div>{#each x.links as link}<a href={link[1]} target="_blank" rel="noopener">{link[0]} ↗</a>{/each}</div></div>{/each}</details></div></section>
        <footer class="wrap"><span>STEN RECORDS © 2027<br /><small>ALL BATHROOMS RESERVED. EVENTUALLY.</small></span><a href="/">Back to the invitation ↗</a></footer>
    </main>

    <div class="ballot-bar" aria-label="Your ballot"><div class="ballot-inner" class:reviewing={onlyMine}><button class="identity" type="button" onclick={openIntro}><span>YOUR BALLOT</span><b>{committedName || 'Enter your name'} <span aria-hidden="true">↗</span></b></button><div class="remaining" aria-live="polite"><b>{VOTES_TOTAL - spent}<span> / {VOTES_TOTAL}</span></b><span>votes left</span></div><button class="review-button" type="button" aria-pressed={onlyMine} onclick={reviewChoices}>{onlyMine ? 'All houses' : 'Review choices'} <span aria-hidden="true">↗</span></button><button class="clear-button" type="button" disabled={!spent} onclick={clearMine}>Clear votes</button></div></div>

    {#if showIntro}
        <div class="scrim" role="presentation" onclick={closeIntro}>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title" tabindex="-1" bind:this={dialogEl} onclick={e => e.stopPropagation()} onkeydown={dialogKeys}>
                <button class="close-dialog" type="button" aria-label="Close voting instructions" onclick={closeIntro}>×</button><p class="eyebrow">YOUR VOTE. YOUR FUTURE BATHROOM.</p><h2 id="intro-title">MAKE IT <br />COUNT.</h2><p>Six couples. One house. A highly democratic use of everyone’s Friday evening.</p>
                <ol class="steps"><li><b>Enter your name.</b> Your ballot follows your name across devices.</li><li><b>Spend {VOTES_TOTAL} votes.</b> All on one house, or spread them around.</li><li><b>Change your mind.</b> Remove a vote with −, then put it somewhere else. Votes save automatically.</li><li><b>Unlock the bonus track.</b> Use all {VOTES_TOTAL} votes to hear “Grown Folk Business” with follow-along lyrics. Removing a vote locks it again until your ballot is full.</li></ol>
                <form onsubmit={e => { e.preventDefault(); closeIntro(); }}>
                    {#if names.length}<div class="d-names"><p id="names-label">Choose your name to start or continue.</p><select class="mobile-name-picker" aria-label="Choose your name" value="" onchange={e => { if (e.currentTarget.value) pickName(e.currentTarget.value); }}><option value="" disabled>Select your name…</option>{#each names as n}<option value={n}>{n}</option>{/each}</select><div class="name-chips" role="group" aria-labelledby="names-label">{#each names as n}<button type="button" aria-pressed={n === committedName} onclick={() => pickName(n)}>{n}</button>{/each}</div></div>{/if}
                    <label for="intro-name">Your name</label><input id="intro-name" type="text" placeholder="e.g. Greg" autocomplete="given-name" maxlength="24" bind:value={introName} bind:this={introInput} /><button class="button primary" type="submit">Save name & browse →</button>
                </form><button class="text-button browse-first" type="button" onclick={() => { introName = ''; closeIntro(); }}>Just browsing for now</button><p class="d-note">Voting open · No deadline set. Use the player at the top to pause, mute or sing along.</p>
            </div>
        </div>
    {/if}
    <div class="toast" class:show={toastOn} role="status" aria-live="polite">{toastMsg}</div>
</div>

<style>
    /* motion-site · profile: playful · archetype: full-landing · patterns: masthead·record-feature·ticket·ink-stamp · critique: P5 T5 C5 R5 A5 V5 */
    .stendo {
        --stage: #f1ede2; --stage-2: #fbf8ef; --ink: #262520; --muted: #625e53;
        --red: #812e33; --gold: #be9b48; --blue: #274da1; --line: #c6c0b1;
        --f-display: 'Anton', Impact, 'Arial Narrow', sans-serif;
        --f-body: 'Figtree', Arial, sans-serif; --f-marker: 'Permanent Marker', cursive;
        --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
        color-scheme: light; background: var(--stage); color: var(--ink); font-family: var(--f-body);
        font-size: 16px; line-height: 1.5; min-height: 100vh; padding-bottom: 112px; overflow-x: clip;
    }
    :global(body:has(.stendo)) { background: #f1ede2; }
    .stendo :global(*) { box-sizing: border-box; }
    .wrap { max-width: 1280px; padding-inline: 48px; margin-inline: auto; }
    h1, h2, h3, p { margin: 0; }
    h1, h2, h3 { color: inherit; font-family: var(--f-display); font-weight: 400; text-transform: uppercase; }
    a { color: inherit; text-underline-offset: 4px; }
    button, input, select { font: inherit; color: inherit; }
    button, .button { cursor: pointer; touch-action: manipulation; transition: transform 140ms var(--ease-out), background-color 140ms var(--ease-out); }
    button:active, .button:active { transform: translateY(2px) scale(.98); }
    button:disabled { cursor: not-allowed; opacity: .4; }
    :focus-visible { outline: 3px solid var(--blue); outline-offset: 4px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 20px; min-height: 50px; padding: 12px 22px; border: 1px solid var(--ink); text-decoration: none; font-size: 14px; font-weight: 800; background: var(--stage-2); }
    .primary { background: var(--red); color: var(--stage-2); border-color: var(--red); box-shadow: 3px 3px 0 var(--ink); }
    .text-button { border: 0; background: none; text-decoration: underline; text-underline-offset: 5px; min-height: 48px; font-weight: 700; padding: 8px 0; }
    .eyebrow { font-size: 11px; letter-spacing: .14em; font-weight: 800; line-height: 1.5; }
    .sr-only, .skip-link:not(:focus) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .skip-link:focus { display: block; padding: 14px; background: var(--stage-2); position: relative; z-index: 50; }
    .hero { position: relative; isolation: isolate; }
    .archive-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px 48px; background: #1f3a2c; color: #f1ede2; font-size: 14px; }
    .archive-banner span { font: 13px var(--f-display); letter-spacing: .08em; border: 1px solid currentColor; padding: 4px 8px; }
    .archive-banner a { color: #f0c36a; font-weight: 800; }
    @media (max-width: 700px) { .archive-banner { padding: 12px 16px; } }
    .masthead { min-height: 80px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--ink); }
    .masthead a { text-decoration: none; font-size: 12px; font-weight: 800; }
    .mast-links a { padding-block: 14px; }
    .brand { display: grid; grid-template-columns: 35px 1fr; align-items: center; column-gap: 10px; letter-spacing: .12em; }
    .record-mark { grid-row: span 2; display: grid; place-items: center; width: 34px; height: 34px; background: var(--ink); color: var(--stage); border-radius: 50%; font-size: 13px; outline: 1px solid var(--ink); outline-offset: 3px; }
    .edition { font-size: 7px; letter-spacing: .11em; font-weight: 500; }
    .mast-links { display: flex; gap: 24px; }
    .hero-body { display: grid; grid-template-columns: 1.1fr 1fr; gap: 34px 80px; align-items: center; padding-top: 32px; padding-bottom: 50px; }
    .hero-heading { grid-column: 1 / -1; }
    .hero-heading .eyebrow { display: flex; justify-content: space-between; gap: 15px; color: var(--muted); }
    h1 { font-size: clamp(80px, 13.6vw, 170px); line-height: 1.02; letter-spacing: -.035em; margin-top: 14px; white-space: nowrap; }
    h1 > span:last-child { color: var(--red); }
    .hero-copy { padding-bottom: 8px; min-width: 0; }
    .sleeve-trip { margin-top: 30px; }
    .sleeve-trip .hero-description { font-size: 14px; max-width: none; }
    .hero-tag { font: 32px/1.2 var(--f-marker); color: var(--blue); transform: rotate(-4deg); margin-bottom: 24px; width: fit-content; }
    .hero-description { font-size: 16px; max-width: 410px; line-height: 1.7; }
    .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-top: 24px; }
    .hero-status { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 7px 18px; font-size: 11px; color: var(--muted); }
    .hero-status i { display: inline-block; width: 6px; height: 6px; background: var(--red); border-radius: 50%; margin-right: 5px; }
    .hero-status b { color: var(--ink); }
    .weekend-ticket { display: flex; align-items: center; gap: 18px; margin-top: 24px; border: 1px solid var(--ink); background: var(--stage-2); }
    .ticket-side { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10px; letter-spacing: .15em; padding: 15px 12px; border-left: 1px dashed var(--ink); align-self: stretch; text-align: center; }
    .weekend-ticket > div { display: grid; gap: 3px; padding-block: 14px; }
    .weekend-ticket b { font: 25px/1.2 var(--f-display); }
    .weekend-ticket > div > span:last-child { font-size: 11px; color: var(--muted); }
    .ticket-star { color: var(--red); font-size: 35px; padding-right: 14px; margin-left: auto; }
    .record-feature { min-width: 0; padding: 8px 0 0 10px; align-self: start; }
    .sleeve-art { position: relative; width: 83%; margin: 8px 0 25px; min-width: 0; }
    .album-cover { position: relative; background: #702a31; color: #eee4cb; padding: 18px; transform: rotate(-5deg); border: 1px solid var(--ink); box-shadow: 4px 6px 0 #26252025; aspect-ratio: 1; display: flex; flex-direction: column; }
    .album-cover.has-artwork { padding: 0; }
    .supplied-cover { width: 100%; height: auto; aspect-ratio: 1; display: block; object-fit: cover; }
    .album-meta, .album-footer { display: flex; justify-content: space-between; font-size: 7px; letter-spacing: .1em; font-weight: 700; }
    .album-title { font: clamp(28px, 3.8vw, 50px)/.98 var(--f-display); letter-spacing: -.02em; margin: 12px 0; }
    .album-title em { font-style: normal; color: #e4bf65; }
    .collage { flex: 1; min-height: 100px; position: relative; margin-bottom: 12px; }
    .collage-main { position: absolute; width: 92%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.15); border: 5px solid #eee4cb; transform: rotate(3deg); }
    .collage-small { position: absolute; bottom: -5px; right: -8px; width: 44%; height: 75%; object-fit: cover; filter: grayscale(1) contrast(1.15); border: 4px solid #eee4cb; transform: rotate(10deg); }
    .cover-sticker { position: absolute; top: 23%; right: -15px; border: 1px solid var(--ink); background: #dfb65a; color: var(--ink); padding: 10px 8px; font-size: 8px; line-height: 1.25; transform: rotate(10deg); }
    .cover-sticker b { font: 16px var(--f-display); }
    .album-footer { font-size: 6px; padding-top: 8px; border-top: 1px solid #f1ead966; gap: 10px; }
    .vinyl { position: absolute; width: 95%; aspect-ratio: 1; right: -26%; top: 5%; border-radius: 50%; background: repeating-radial-gradient(circle, #25231f 0 2px, #36332f 3px 4px); display: grid; place-items: center; border: 3px solid #25231f; box-shadow: 3px 5px 9px #26252020; }
    .vinyl > span { width: 30%; aspect-ratio: 1; border-radius: 50%; background: var(--gold); display: grid; place-content: center; text-align: center; font-size: 12px; font-weight: 800; }
    .manifesto { background: var(--ink); color: var(--stage); border-block: 1px solid var(--ink); }
    .manifesto > div { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 48px; font: 15px var(--f-display); letter-spacing: .025em; }
    .manifesto span[aria-hidden] { color: var(--gold); font-size: 25px; }
    .shortlist { padding-block: 64px 55px; scroll-margin-top: 20px; }
    .section-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
    h2 { font-size: clamp(36px, 5vw, 65px); line-height: 1.05; letter-spacing: -.02em; }
    .section-heading h2 { margin-top: 17px; }
    .section-heading h2 span { color: var(--red); }
    .section-note { font: 24px/1.25 var(--f-marker); color: var(--blue); transform: rotate(6deg); margin-right: 65px; }
    .section-note span { display: block; font-size: 40px; line-height: 1; }
    .section-intro { max-width: 720px; color: var(--muted); margin-top: 20px; font-size: 14px; }
    .collection-tools { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-top: 30px; padding-block: 20px; border-block: 1px solid var(--ink); }
    .sort-control { display: flex; align-items: center; gap: 10px; font-size: 12px; }
    select { border: 1px solid var(--line); background: var(--stage-2); min-height: 44px; padding: 8px 30px 8px 12px; border-radius: 0; font-size: 13px; font-weight: 700; }
    .filters { display: flex; gap: 8px; }
    .filters button, .name-chips button { min-height: 44px; border: 1px solid var(--line); background: transparent; padding: 8px 13px; font-size: 12px; font-weight: 700; }
    .filters button[aria-pressed=true], .name-chips button[aria-pressed=true] { background: var(--ink); color: var(--stage); border-color: var(--ink); }
    .collection-count { margin-left: auto; font-size: 12px; color: var(--muted); }
    .carousel-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 18px; }
    .catalogue { font-size: 11px; font-weight: 800; letter-spacing: .08em; }
    .catalogue > span { color: var(--muted); font-weight: 500; margin-left: 10px; }
    .carousel-nav > div { display: flex; align-items: center; gap: 8px; }
    .swipe-hint { font-size: 11px; color: var(--muted); margin-right: 8px; }
    .carousel-nav button { width: 46px; height: 44px; border: 1px solid var(--ink); background: transparent; font-size: 23px; }
    .house-carousel { position: relative; display: flex; align-items: flex-start; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: var(--red) var(--stage); padding: 4px 0 16px; }
    .card { flex: 0 0 100%; min-width: 0; display: grid; grid-template-columns: 1fr 1fr; align-items: start; scroll-snap-align: start; scroll-snap-stop: always; border: 1px solid var(--line); background: var(--stage-2); box-shadow: inset 0 0 0 0 var(--red); }
    .card.picked { box-shadow: inset 0 0 0 3px var(--red); }
    .card.featured { border-color: var(--gold); box-shadow: inset 0 0 0 2px var(--gold); }
    .featured-label { display: inline-block; background: var(--gold); color: #171714; padding: 9px 12px; font-size: 11px; font-weight: 900; letter-spacing: .06em; margin: 0 0 14px; }
    .third-night-note { padding: 12px 14px; border: 2px solid var(--gold); font-size: 13px; line-height: 1.6; margin-top: 14px; }
    .third-night-note strong { display: block; font-size: 16px; }
    .sleeve-visual { min-width: 0; padding: 22px 0 20px 22px; }
    .sleeve-topline { display: flex; justify-content: space-between; gap: 12px; text-transform: uppercase; font-size: 9px; font-weight: 800; letter-spacing: .12em; padding-bottom: 13px; }
    .house-photo { position: relative; aspect-ratio: 1; background: #ddd4c1; }
    .house-photo > img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .photo-controls { position: absolute; bottom: 12px; right: 12px; display: flex; align-items: center; background: var(--stage-2); color: var(--ink); border: 1px solid var(--ink); }
    .photo-controls button { border: 0; background: transparent; width: 44px; height: 44px; font-size: 20px; }
    .photo-controls span { font-size: 11px; padding-inline: 5px; font-variant-numeric: tabular-nums; }
    .selection-stamp { position: absolute; top: 24px; left: 16px; transform: rotate(-9deg); border: 4px double var(--red); padding: 9px 13px; font: 25px/1 var(--f-display); color: var(--red); background: #ece1c8f5; text-align: center; }
    .selection-stamp span { display: block; margin-top: 5px; font: 800 10px var(--f-body); letter-spacing: .12em; }
    .selection-stamp.stamp { animation: stamp-in 300ms var(--ease-out); }
    @keyframes stamp-in { from { transform: rotate(-16deg) scale(1.2); opacity: 0; } to { transform: rotate(-9deg) scale(1); opacity: 1; } }
    .photo-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 22px; }
    .hand-note { font: clamp(15px, 1.6vw, 21px)/1.35 var(--f-marker); color: var(--blue); transform: rotate(-3deg); }
    .barcode { display: block; width: 55px; height: 28px; flex-shrink: 0; background: repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 4px,var(--ink) 4px 5px,transparent 5px 8px); }
    .sleeve-info { min-width: 0; padding: 24px 27px; }
    .c-loc { color: var(--muted); font-size: 13px; margin-bottom: 7px; }
    .sleeve-info h3 { font-size: clamp(29px, 3vw, 42px); line-height: 1.1; }
    .caption { color: var(--muted); font-size: 13px; margin-top: 8px; }
    .price-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-block: 18px; margin-top: 6px; }
    .couple-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
    .couple-price strong { font: 46px/1 var(--f-display); letter-spacing: -.03em; color: var(--red); }
    .couple-price > span { font-size: 12px; }
    .whole-price { display: grid; text-align: right; font-size: 11px; color: var(--muted); }
    .whole-price b { color: var(--ink); font-size: 13px; }
    dl { margin: 0; }
    dd { margin: 0; }
    .room-stats { display: grid; grid-template-columns: repeat(4, 1fr); border-block: 1px solid var(--ink); padding-block: 13px; }
    .room-stats > div { display: flex; flex-direction: column-reverse; text-align: center; border-left: 1px solid var(--line); }
    .room-stats > div:first-child { border: 0; }
    .room-stats dt { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .room-stats dd { font: 26px/1 var(--f-display); }
    .amenity-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin-top: 17px; }
    .amenity-facts dt { font-size: 11px; color: var(--muted); }
    .amenity-facts dd { font-size: 12px; font-weight: 700; }
    .stamps { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 17px; }
    .stamps span { font-size: 9px; line-height: 1.3; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 4px 6px; border: 1px solid #8b7952; color: #655129; }
    .house-caution { font-size: 12px; border-left: 3px solid var(--gold); padding-left: 10px; margin-top: 17px; line-height: 1.5; }
    .house-caution b { display: block; margin-bottom: 2px; }
    .card-actions { display: flex; flex-wrap: wrap; align-items: stretch; justify-content: space-between; gap: 10px; margin-top: 20px; }
    .listing-link { flex: 1; font-size: 12px; padding-inline: 13px; white-space: nowrap; }
    .vote-control { display: flex; align-items: stretch; min-height: 50px; border: 1px solid var(--red); }
    .vote-control button { border: 0; }
    .minus { background: transparent; width: 44px; font-size: 24px; }
    .my-votes { display: grid; place-items: center; min-width: 23px; font-size: 14px; font-weight: 800; }
    .vote-button { background: var(--red); color: var(--stage-2); padding-inline: 15px; font-size: 13px; font-weight: 800; min-width: 80px; }
    .card-meta { display: flex; justify-content: space-between; gap: 10px; font-size: 10px; color: var(--muted); padding-block: 10px 16px; }
    .picked .card-meta > span:last-child { color: var(--red); font-weight: 800; }
    .house-details { border-top: 1px solid var(--line); font-size: 12px; }
    summary { cursor: pointer; min-height: 48px; padding-block: 14px; font-weight: 700; }
    details p { margin-bottom: 12px; }
    .house-details > a { display: inline-block; padding-block: 10px; }
    .empty-state { width: 100%; padding: 42px 25px; border: 1px dashed var(--line); }
    .empty-state h3 { font-size: 30px; }
    .empty-state p { margin: 10px 0 20px; }
    .research-note { max-width: 850px; font-size: 11px; line-height: 1.6; color: var(--muted); margin-top: 12px; }
    .results-section { background: var(--ink); color: var(--stage); padding-block: 60px; scroll-margin-top: 20px; }
    .results-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 90px; }
    .results-intro h2 { margin-top: 20px; font-size: clamp(35px, 4.2vw, 56px); }
    .results-intro h2 > span { color: var(--gold); }
    .results-intro h2 small { display: block; font: 19px var(--f-marker); text-transform: none; transform: rotate(-5deg); margin-top: 10px; }
    .results-intro > p:not(.eyebrow) { font-size: 13px; line-height: 1.65; margin-top: 28px; max-width: 340px; }
    .chart-caption { border-top: 1px solid #736c5e; padding-top: 20px; color: var(--gold); }
    .chart { list-style: none; padding: 0; margin: 0; display: grid; gap: 18px; }
    .chart-label { display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 13px; margin-bottom: 7px; }
    .chart-label b { font-size: 16px; font-variant-numeric: tabular-nums; }
    .chart-track { height: 9px; background: #4c473e; }
    .chart-bar { height: 100%; width: 100%; background: var(--gold); transform-origin: left center; transition: transform 240ms var(--ease-out); }
    .liner-notes { padding-block: 48px; }
    .liner-notes h2 { font-size: 31px; margin: 12px 0 24px; }
    .notes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; align-items: start; }
    .notes-grid > details { border-top: 1px solid var(--line); font-size: 13px; }
    .notes-grid summary { font-size: 14px; padding-block: 18px; }
    .extra { border-top: 1px dotted var(--line); padding-block: 14px; }
    .extra h3 { font-size: 20px; margin-bottom: 8px; }
    .extra > div { display: flex; flex-wrap: wrap; gap: 12px; }
    .extra a { display: inline-block; padding-block: 8px; }
    footer { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-block: 25px; border-top: 2px solid var(--ink); font-size: 11px; font-weight: 800; }
    footer small { font-size: 8px; font-weight: 500; letter-spacing: .08em; }
    footer a { padding-block: 14px; }
    .ballot-bar { position: fixed; bottom: 12px; inset-inline: 20px; max-width: 1080px; margin-inline: auto; z-index: 20; background: var(--stage-2); color: var(--ink); border: 1px solid var(--ink); box-shadow: 4px 4px 0 #26252025; padding-bottom: env(safe-area-inset-bottom, 0px); }
    .ballot-inner { max-width: 1184px; padding: 12px 22px; margin-inline: auto; display: flex; align-items: center; gap: 25px; }
    .identity { background: none; border: 0; text-align: left; padding: 0 16px 0 0; min-height: 46px; max-width: 260px; }
    .identity > span { display: block; font-size: 9px; letter-spacing: .12em; }
    .identity b { font-size: 13px; display: block; overflow-wrap: anywhere; }
    .remaining { display: flex; align-items: center; gap: 10px; border-left: 1px solid var(--line); padding-left: 25px; }
    .remaining > b { font: 32px/1 var(--f-display); color: var(--red); }
    .remaining b span { font: 16px var(--f-body); color: var(--muted); }
    .remaining > span { font-size: 12px; }
    .review-button { background: var(--ink); color: var(--stage); border: 1px solid var(--ink); min-height: 46px; padding: 10px 20px; margin-left: auto; font-size: 13px; font-weight: 800; }
    .clear-button { background: transparent; border: 0; font-size: 11px; text-decoration: underline; min-height: 46px; }
    .banner { background: #f4dfb1; border: 1px solid #8b7952; padding: 14px; font-size: 13px; margin-top: 16px; }
    .scrim { position: fixed; inset: 0; z-index: 40; background: #25231fbb; display: flex; justify-content: center; align-items: center; padding: 20px; overflow-y: auto; }
    .dialog { background: var(--stage-2); color: var(--ink); position: relative; width: 100%; max-width: 500px; max-height: calc(100dvh - 40px); overflow-y: auto; padding: 36px; border: 2px solid var(--ink); box-shadow: 7px 7px 0 var(--red); }
    .close-dialog { position: absolute; top: 5px; right: 5px; width: 44px; height: 44px; background: transparent; border: 0; font-size: 28px; }
    .dialog .eyebrow { padding-right: 20px; font-size: 9px; }
    .dialog h2 { color: var(--red); margin-block: 17px; font-size: 58px; }
    .dialog > p:not(.eyebrow) { font-size: 13px; }
    .steps { padding-left: 20px; margin-block: 24px; display: grid; gap: 13px; font-size: 13px; }
    .dialog form { border-top: 1px solid var(--line); padding-top: 20px; }
    .dialog label { display: block; font-size: 12px; font-weight: 800; margin-bottom: 8px; }
    .dialog input { min-height: 48px; width: 100%; background: var(--stage); border: 1px solid var(--ink); padding: 10px 12px; font-size: 16px; border-radius: 0; }
    .dialog form > .button { width: 100%; margin-top: 12px; }
    .browse-first { width: 100%; font-size: 12px; margin-top: 12px; }
    .d-note { color: var(--muted); font-size: 11px !important; margin-top: 10px; }
    .mobile-name-picker { display: none; }
    .hero-copy :global(.music-deck) { margin-top: 24px; }
    .d-names { margin-bottom: 18px; font-size: 12px; }
    .name-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .toast { position: fixed; bottom: calc(100px + env(safe-area-inset-bottom, 0px)); left: 50%; z-index: 50; width: max-content; max-width: calc(100% - 32px); padding: 14px 20px; background: var(--ink); color: var(--stage); font-size: 13px; border: 1px solid var(--gold); pointer-events: none; opacity: 0; transform: translate(-50%, 10px); transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out); }
    .toast.show { opacity: 1; transform: translate(-50%, 0); }
    @media (hover: hover) and (pointer: fine) {
        .button:hover, .carousel-nav button:not(:disabled):hover { background: var(--gold); color: var(--ink); }
        .vote-button:not(:disabled):hover, .review-button:hover { background: #95343a; color: var(--stage-2); }
        .album-cover:hover { transform: rotate(-3deg) translateY(-3px); }
        .album-cover { transition: transform 240ms var(--ease-out); }
    }
    @media (max-width: 1100px) {
        .wrap { padding-inline: 32px; } .ballot-inner { padding-inline: 32px; }
        .hero-body { gap: 35px; } .sleeve-info { padding: 22px; }
        .card-actions { flex-direction: column; } .vote-control { justify-content: space-between; }
        .vote-button { flex: 1; margin-left: 12px; } .results-layout { gap: 45px; }
        .hero-actions { gap: 14px; } .hero-actions .text-button { font-size: 12px; }
    }
    @media (max-width: 760px) {
        .wrap { padding-inline: 22px; } .masthead { min-height: 76px; } .mast-links { gap: 12px; } .mast-links a { font-size: 10px; } .edition { display: none; } .brand { font-size: 10px !important; letter-spacing: .06em; }
        .hero-body { grid-template-columns: 1fr; gap: 28px; padding-top: 24px; padding-bottom: 32px; }
        .hero-heading .eyebrow { font-size: 8px; letter-spacing: .08em; }
        h1 { font-size: clamp(65px, 17vw, 105px); margin-top: 14px; white-space: normal; }
        h1 > span { display: block; }
        .record-feature { width: 100%; max-width: 380px; justify-self: center; padding: 0 10px; }
        .sleeve-art { width: 76%; margin: 5px 0 20px 10px; }
        .album-cover { padding: 12px; }
        .album-title { font-size: 30px; margin: 10px 0; }
        .collage { min-height: 80px; }
        .album-meta { font-size: 6px; } .album-footer { font-size: 5px; padding-top: 6px; }
        .cover-sticker { font-size: 7px; padding: 8px 6px; } .cover-sticker b { font-size: 14px; }
        .hero-tag { font-size: 26px; margin-bottom: 18px; }
        .hero-description { max-width: none; font-size: 14px; }
        .hero-status { font-size: 10px; gap: 7px 14px; }
        .weekend-ticket { margin-top: 20px; }
        .weekend-ticket b { font-size: 24px; }
        .hero-actions { margin-top: 20px; }
        .ballot-bar { bottom: 6px; inset-inline: 6px; }
        .manifesto > div { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; padding-block: 14px; font-size: 13px; text-align: center; }
        .manifesto span[aria-hidden] { display: none; }
        .shortlist { padding-block: 42px 36px; }
        .section-heading { gap: 15px; } .section-heading h2 { font-size: 43px; }
        .section-note { font-size: 15px; margin-right: 4px; max-width: 130px; }
        .section-note span { font-size: 28px; }
        .section-intro { font-size: 13px; margin-top: 16px; }
        .collection-tools { gap: 12px; padding-block: 15px; margin-top: 22px; }
        .collection-count { font-size: 10px; order: 2; } .sort-control { order: 1; }
        .filters { order: 3; flex-basis: 100%; } .filters button { flex: 1; }
        .catalogue { font-size: 9px; letter-spacing: .04em; } .catalogue > span { margin-left: 4px; }
        .swipe-hint { display: none; } .carousel-nav { padding-block: 14px; }
        .card { grid-template-columns: 1fr; }
        .sleeve-visual { padding: 14px 14px 0; }
        .sleeve-topline { font-size: 8px; padding-bottom: 10px; }
        .house-photo { aspect-ratio: 4 / 3; } .photo-foot { padding-top: 14px; }
        .hand-note { font-size: 17px; } .barcode { height: 20px; width: 42px; }
        .sleeve-info { padding: 22px 18px 12px; }
        .sleeve-info h3 { font-size: 34px; } .caption { font-size: 12px; }
        .price-row { padding-block: 16px; } .couple-price strong { font-size: 43px; }
        .couple-price { gap: 5px; } .couple-price > span { font-size: 11px; }
        .card-actions { flex-direction: row; } .listing-link { flex-basis: 100%; }
        .vote-control { width: 100%; } .vote-button { font-size: 14px; }
        .my-votes { width: 40px; font-size: 17px; } .minus { width: 50px; }
        .room-stats dt { font-size: 10px; } .room-stats dd { font-size: 27px; }
        .amenity-facts dd { font-size: 12px; } .house-caution { font-size: 12px; }
        .selection-stamp { font-size: 23px; top: 15px; }
        .results-section { padding-block: 40px; } .results-layout { grid-template-columns: 1fr; gap: 30px; }
        .results-intro h2 { font-size: 44px; } .results-intro > p:not(.eyebrow) { max-width: 100%; margin-top: 22px; }
        .chart { gap: 18px; } .chart-track { height: 10px; }
        .liner-notes { padding-block: 35px; } .liner-notes h2 { font-size: 26px; }
        .notes-grid { grid-template-columns: 1fr; }
        footer { align-items: start; font-size: 10px; } footer small { font-size: 7px; }
        .ballot-inner { padding: 10px 16px; gap: 12px; flex-wrap: wrap; }
        .identity { max-width: 32%; padding: 0; flex: 1; } .identity > span { font-size: 8px; }
        .identity b { font-size: 11px; } .remaining { padding-left: 12px; gap: 4px; flex-direction: column; align-items: flex-start; }
        .remaining > b { font-size: 25px; } .remaining b span { font-size: 12px; } .remaining > span { font-size: 9px; }
        .review-button { padding-inline: 12px; font-size: 11px; min-height: 46px; }
        .clear-button { flex-basis: 100%; min-height: 44px; padding: 0; font-size: 10px; }
        .ballot-inner { row-gap: 0; } .stendo { padding-bottom: calc(141px + env(safe-area-inset-bottom, 0px)); }
        .toast { bottom: calc(132px + env(safe-area-inset-bottom, 0px)); }
        .dialog { padding: 28px 22px; } .dialog h2 { font-size: 48px; }
    }
    @media (max-width: 760px) {
        .hero-body { gap: 22px; padding-top: 18px; }
        h1 { font-size: clamp(44px, 14vw, 90px); white-space: nowrap; }
        h1 > span { display: inline; }
        .record-feature { max-width: 310px; }
        .sleeve-art { width: 76%; margin-bottom: 18px; }
        .sleeve-trip { margin-top: 20px; }
        .sleeve-trip .hero-description { line-height: 1.5; }
        .weekend-ticket { margin-top: 14px; }
        .hero-tag { margin-bottom: 8px; }
        .hero-actions { margin-top: 12px; gap: 12px; }
        .hero-actions > .button { flex: 1; text-align: center; }
        .hero-status { font-size: 12px; margin-top: 14px; }
        .mast-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 11px; }
        .sort-control select { font-size: 16px; max-width: 195px; }
        .swipe-hint { display: block; font-size: 11px; }
        .catalogue > span { display: none; }
        .sleeve-info { padding-top: 18px; }
        .caption, .house-caution, .amenity-facts dd { font-size: 13px; }
        .room-stats dt { font-size: 11px; }
        .ballot-bar { bottom: 0; inset-inline: 0; padding-bottom: env(safe-area-inset-bottom, 0px); }
        .ballot-inner { display: grid; grid-template-columns: minmax(0, 1fr) 62px auto; gap: 8px; padding: 10px 14px; }
        .identity { max-width: none; min-width: 0; }
        .identity b { font-size: 12px; line-height: 1.3; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
        .remaining { padding-left: 10px; }
        .review-button { margin: 0; font-size: 12px; padding-inline: 10px; }
        .clear-button { display: none; }
        .reviewing .clear-button { display: block; grid-column: 1 / -1; }
        .stendo { padding-bottom: calc(125px + env(safe-area-inset-bottom, 0px)); }
        .toast { bottom: calc(125px + env(safe-area-inset-bottom, 0px)); }
        .scrim { padding: 8px; align-items: flex-end; }
        .dialog { padding: 22px 20px; max-height: calc(100dvh - 16px); box-shadow: none; overscroll-behavior: contain; padding-bottom: calc(22px + env(safe-area-inset-bottom, 0px)); }
        .dialog h2 { font-size: 34px; line-height: 1.1; margin-block: 12px; }
        .dialog h2 br { display: none; }
        .steps { margin-block: 16px; gap: 10px; line-height: 1.5; }
        .dialog form { padding-top: 16px; }
        .name-chips { display: none; }
        .mobile-name-picker { display: block; width: 100%; min-height: 48px; padding: 10px; border: 1px solid var(--ink); background: var(--stage); color: var(--ink); font-size: 16px; margin-top: 8px; }
        .d-names { margin-bottom: 14px; }
    }
    @media (max-width: 360px) {
        .wrap { padding-inline: 16px; } .section-heading h2 { font-size: 36px; }
        .section-note { font-size: 13px; } .hero-actions { gap: 10px; } .hero-actions .button { padding-inline: 13px; }
        .hero-actions .text-button { font-size: 11px; } .whole-price { font-size: 10px; }
        .couple-price { flex-direction: column; gap: 1px; } .sleeve-info { padding-inline: 14px; }
        .ballot-inner { padding-inline: 10px; gap: 8px; row-gap: 0; } .review-button { padding-inline: 9px; font-size: 10px; }
        .ticket-star { display: none; } .weekend-ticket { gap: 12px; } .weekend-ticket b { font-size: 21px; }
        .remaining { padding-left: 8px; } .mast-links a { font-size: 9px; } .mast-links { gap: 9px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .stendo :global(*), .stendo :global(*::before), .stendo :global(*::after) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        .album-cover:hover, button:active, .button:active { transform: none; }
    }
</style>

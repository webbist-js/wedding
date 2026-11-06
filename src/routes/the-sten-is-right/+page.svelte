<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';
	import type { House, Lead, Extra } from '$lib/sten-do';
	import { WEDDING } from '$lib/wedding-info';

	let { data }: { data: PageData } = $props();

	type Picks = Record<string, number>;

	const TRACK = '/audio/the-sten-is-right.mp3';
	const BASE = '/the-sten-is-right';
	const NAME_KEY = 'stendo.name';
	const INTRO_KEY = 'stendo.introSeen';
	const MUTE_KEY = 'stendo.muted';

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
	// svelte-ignore state_referenced_locally
	let myPicks = $state<Picks>({ ...data.mine }); // this viewer's optimistic ballot
	// svelte-ignore state_referenced_locally
	let serverTotals = $state<Picks>({ ...data.totals }); // aggregate as the server last told us
	// svelte-ignore state_referenced_locally
	let serverMine = $state<Picks>({ ...data.mine }); // my ballot as the server last stored it
	// svelte-ignore state_referenced_locally
	let serverVoterCount = $state<number>(data.voterCount);
	let sortMode = $state<'top' | 'baths' | 'wish'>('top');

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

	// Houses with at least one vote, best first — drives medals, the lead card and the ticker.
	const standings = $derived(
		houses
			.map((h) => ({ h, t: totals[h.id] || 0 }))
			.filter((x) => x.t > 0)
			.sort((a, b) => b.t - a.t)
	);
	const ranks = $derived.by<Record<string, number>>(() => {
		const r: Record<string, number> = {};
		standings.forEach((x, i) => (r[x.h.id] = i));
		return r;
	});

	const maxTotal = $derived(Math.max(1, ...houses.map((h) => totals[h.id] || 0)));

	const ordered = $derived.by<House[]>(() => {
		const a = [...houses];
		if (sortMode === 'top')
			a.sort(
				(x, y) =>
					(totals[y.id] || 0) - (totals[x.id] || 0) ||
					(y.baths ?? -1) - (x.baths ?? -1) ||
					x.n - y.n
			);
		else if (sortMode === 'baths') a.sort((x, y) => (y.baths ?? -1) - (x.baths ?? -1) || y.sleeps - x.sleeps);
		else a.sort((x, y) => (y.wish ? 1 : 0) - (x.wish ? 1 : 0) || (y.baths ?? -1) - (x.baths ?? -1));
		return a;
	});

	const ORD = ['Now leading', 'In second', 'In third'];
	const tickerItems = $derived(
		standings.length
			? standings
					.slice(0, 3)
					.map((x, i) => `${ORD[i]}: ${x.h.name} — ${x.t} vote${x.t === 1 ? '' : 's'}`)
			: ['The doors are open', 'Be the first contestant on the board', 'Three votes each — spend them wisely']
	);

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
		myName = myName.trim();
		store.set(NAME_KEY, myName);
		if (myName && Object.keys(myPicks).length) scheduleSave();
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
		if (writing) {
			dirty = true;
			return;
		}
		writing = true;
		try {
			const res = await fetch(`${BASE}/vote`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: myName.trim(), picks: myPicks })
			});
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const d = await res.json();
			serverTotals = d.totals ?? {};
			serverMine = d.mine ?? {};
			serverVoterCount = d.voterCount ?? 0;
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
		if (writing || dirty) return; // don't let a poll clobber an in-flight ballot
		try {
			const res = await fetch(`${BASE}/feed`, { cache: 'no-store' });
			if (!res.ok) return;
			const d = await res.json();
			serverTotals = d.totals ?? {};
			serverVoterCount = d.voterCount ?? 0;
			serverMine = d.mine ?? {};
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

	// ---- theme music ----
	// Browsers only allow sound after the visitor interacts with the page, so we
	// try to start straight away and, if that's refused, start on the first tap or
	// key press (the intro modal's button is the usual one).
	let audio: HTMLAudioElement | undefined;
	let playing = $state(false);
	let muted = $state(false);
	let gestureArmed = false;

	function startMusic() {
		if (!audio || muted || playing) return;
		audio.volume = 0.5;
		audio.play().then(disarmGesture, armGesture);
	}
	function onGesture() {
		disarmGesture();
		startMusic();
	}
	function armGesture() {
		if (gestureArmed) return;
		gestureArmed = true;
		window.addEventListener('pointerdown', onGesture, true);
		window.addEventListener('keydown', onGesture, true);
	}
	function disarmGesture() {
		if (!gestureArmed) return;
		gestureArmed = false;
		window.removeEventListener('pointerdown', onGesture, true);
		window.removeEventListener('keydown', onGesture, true);
	}
	function toggleSound() {
		if (playing) {
			muted = true;
			audio?.pause();
		} else {
			muted = false;
			startMusic();
		}
		store.set(MUTE_KEY, muted ? '1' : '0');
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
		const n = introName.trim();
		if (n) {
			myName = n;
			commitName();
		}
		showIntro = false;
		store.set(INTRO_KEY, '1');
		startMusic();
		if (lastFocus instanceof HTMLElement) lastFocus.focus();
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

	// ---- confetti ----
	let canvas: HTMLCanvasElement | undefined;
	type Confetto = { x: number; y: number; vx: number; vy: number; g: number; s: number; rot: number; vr: number; c: string; life: number };
	let parts: Confetto[] = [];
	let raf = 0;
	function sizeCanvas() {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	function celebrate() {
		showToast('🎉 All 3 votes cast!');
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
		if (!canvas) return;
		const cols = ['#ffd23f', '#ff2e88', '#30e0e0', '#48e08a', '#f59f00'];
		parts = [];
		for (let i = 0; i < 160; i++)
			parts.push({
				x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
				y: window.innerHeight * 0.3,
				vx: (Math.random() - 0.5) * 10,
				vy: Math.random() * -11 - 4,
				g: 0.32 + Math.random() * 0.15,
				s: 5 + Math.random() * 7,
				rot: Math.random() * 6.28,
				vr: (Math.random() - 0.5) * 0.5,
				c: cols[i % cols.length],
				life: 90 + Math.random() * 40
			});
		if (!raf) frame();
	}
	function frame() {
		const cx = canvas?.getContext('2d');
		if (!canvas || !cx) {
			raf = 0;
			return;
		}
		cx.clearRect(0, 0, canvas.width, canvas.height);
		let alive = false;
		for (const p of parts) {
			if (p.life <= 0) continue;
			alive = true;
			p.life--;
			p.vy += p.g;
			p.x += p.vx;
			p.y += p.vy;
			p.rot += p.vr;
			cx.save();
			cx.translate(p.x, p.y);
			cx.rotate(p.rot);
			cx.fillStyle = p.c;
			cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
			cx.restore();
		}
		if (alive) raf = requestAnimationFrame(frame);
		else {
			raf = 0;
			cx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	onMount(() => {
		if (!myName) myName = store.get(NAME_KEY) ?? '';
		muted = store.get(MUTE_KEY) === '1';
		if (!store.get(INTRO_KEY)) openIntro();
		startMusic();

		sizeCanvas();
		window.addEventListener('resize', sizeCanvas);
		const poll = setInterval(refresh, 4000);
		return () => {
			clearInterval(poll);
			disarmGesture();
			audio?.pause();
			window.removeEventListener('resize', sizeCanvas);
			clearTimeout(saveTimer);
			clearTimeout(toastTimer);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

<svelte:head>
	<title>The Sten Is Right · {WEDDING.coupleName}</title>
	<meta name="robots" content="noindex" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Anton&family=Fredoka:wght@400;500;600&family=Figtree:wght@400;500;600&display=swap"
	/>
</svelte:head>

<audio
	bind:this={audio}
	src={TRACK}
	loop
	preload="auto"
	onplay={() => (playing = true)}
	onpause={() => (playing = false)}
></audio>

<div class="stendo">
	<!-- ---------- HERO ---------- -->
	<header class="hero">
		<div class="spots" aria-hidden="true"><span class="spot l"></span><span class="spot r"></span></div>
		<div class="wrap">
			<div class="marquee">
				<span class="bulbs"></span><span class="frame"></span>
				<span class="burst" aria-hidden="true"><span>Come on<br />down!</span></span>
				<div class="kicker">Live from God's own county — it's</div>
				<h1><span class="t1">The Sten</span><span class="t2">Is Right</span></h1>
				<p class="host-line">Six couples. Twelve contestants. One <b>winning</b> weekend.</p>
				<div class="facts">
					<span class="fact"><b>12</b> guests</span>
					<span class="fact"><b>6</b> couples</span>
					<span class="fact"><b>19–21 Mar</b> ’27</span>
					<span class="fact"><b>£2k–£4k</b></span>
					<span class="fact"><b>3</b> votes each</span>
				</div>
			</div>
		</div>
		<div class="ticker" aria-label="Current leaders">
			<div class="ticker-track">
				{#each [0, 1] as copy (copy)}
					<span class="ticker-run" aria-hidden={copy === 1}>
						{#each tickerItems as item, i (i)}<span class="tick-item">{item}</span><span class="tick-star">★</span>{/each}
					</span>
				{/each}
			</div>
		</div>
	</header>

	<!-- ---------- VOTER BAR ---------- -->
	<div class="controls">
		<div class="wrap">
			<div class="namebox">
				<label for="name">Contestant</label>
				<input
					id="name"
					type="text"
					placeholder="your name"
					autocomplete="name"
					maxlength="24"
					bind:value={myName}
					onchange={commitName}
				/>
				<button class="ok" type="button" aria-label="Save name" onclick={commitName}>✓</button>
			</div>
			<span class="pill tix">🎟️ <b>{VOTES_TOTAL - spent}</b>&nbsp;of {VOTES_TOTAL} left</span>
			<span class="pill">👥 <b>{voterCount}</b>&nbsp;voted</span>
			<button
				class="pill sound"
				class:on={playing}
				type="button"
				aria-pressed={playing}
				aria-label={playing ? 'Mute the theme tune' : 'Play the theme tune'}
				onclick={toggleSound}
			>
				<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
				{playing ? 'Sound on' : 'Sound off'}
			</button>
			<button class="pill help" type="button" aria-label="How to play" onclick={openIntro}>?</button>
			<div class="seg" role="group" aria-label="Sort houses">
				<button aria-pressed={sortMode === 'top'} type="button" onclick={() => (sortMode = 'top')}>Top voted</button>
				<button aria-pressed={sortMode === 'baths'} type="button" onclick={() => (sortMode = 'baths')}>Most baths</button>
				<button aria-pressed={sortMode === 'wish'} type="button" onclick={() => (sortMode = 'wish')}>Our picks</button>
			</div>
			<button class="clearv" type="button" onclick={clearMine}>Clear my votes</button>
		</div>
	</div>

	<main>
		<section>
			<div class="wrap">
				<div class="sec-head">
					<h2>Today's Showcase</h2>
					<span class="tag">{houses.length} contestants</span>
					<p>
						Every house sleeps the whole crew of 12 with a hot tub (or two). Spend your 3 votes —
						stack them on one favourite or spread them around. The board updates live for everyone
						on the link.
					</p>
				</div>
				{#if bannerMsg}<div class="banner warn" role="status">{bannerMsg}</div>{/if}
				<div class="grid">
					{#each ordered as h (h.id)}
						{@const rank = ranks[h.id]}
						{@const t = totals[h.id] || 0}
						{@const mine = myPicks[h.id] || 0}
						<article class="card" class:lead={rank === 0} class:picked={mine > 0} data-id={h.id}>
							{#if rank === 0}<span class="medal" aria-hidden="true">🥇</span>
							{:else if rank === 1}<span class="medal" aria-hidden="true">🥈</span>
							{:else if rank === 2}<span class="medal" aria-hidden="true">🥉</span>
							{:else}<span class="num">{String(h.n).padStart(2, '0')}</span>{/if}
							{#if rank === 0}<span class="ribbon leader">★ Top bid</span>
							{:else if h.wish}<span class="ribbon wish">★ Our wishlist</span>{/if}
							<h3 class="c-name">{h.name}</h3>
							<div class="c-loc">{h.loc}</div>
							<div class="stats">
								<div class="stat"><div class="v">{h.sleeps}</div><div class="l">Sleeps</div></div>
								<div class="stat"><div class="v">{h.beds ?? '?'}</div><div class="l">Bedrooms</div></div>
								<div class="stat"><div class="v">{fmtBaths(h.baths)}</div><div class="l">Bathrooms</div></div>
							</div>
							{#if h.baths == null}
								<span class="couple ok">Bathrooms on enquiry</span>
							{:else if h.baths >= 6}
								<span class="couple good">🏆 A bathroom per couple</span>
							{:else if h.baths >= 5}
								<span class="couple ok">Nearly one each — {fmtBaths(h.baths)} baths</span>
							{:else}
								<span class="couple ok">{fmtBaths(h.baths)} baths to share</span>
							{/if}
							<div class="amen">
								{#each h.amen as a (a[0])}
									<span class:hi={!!a[1]}>{a[0]}</span>
								{/each}
							</div>
							<div class="nearby">{@html h.nearby}</div>
							<div class="foot">
								{#if h.rate}
									<div class="price tag-shape">{h.rate}<small>{h.rateNote}</small></div>
								{:else}
									<div class="price tag-shape"><span class="q">POA</span><small>{h.rateNote}</small></div>
								{/if}
								<a class="book" href={h.url} target="_blank" rel="noopener"
									>View listing<span class="src">on {h.src}</span></a
								>
							</div>
							<div class="vote">
								<div class="tally">
									<div class="track"><div class="bar" style:width="{(t / maxTotal) * 100}%"></div></div>
									<div class="tnum">
										{#key t}<span class="bignum">{t}</span>{/key}<small>{t === 1 ? 'vote' : 'votes'}</small>
									</div>
								</div>
								<div class="vc">
									<button
										class="step"
										type="button"
										aria-label="Remove a vote from {h.name}"
										disabled={mine <= 0}
										onclick={() => removeVote(h.id)}>−</button
									>
									<span class="mine" aria-label="Your votes on {h.name}">{mine}</span>
									<button
										class="plus"
										type="button"
										aria-label="Vote for {h.name}"
										disabled={spent >= VOTES_TOTAL}
										onclick={() => addVote(h.id)}>{mine > 0 ? '＋ Another' : '＋ Vote'}</button
									>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</div>
		</section>

		<section>
			<div class="wrap">
				<div class="sec-head">
					<h2>Also In The Running</h2><span class="tag">wider search</span>
					<p>Strong matches from the wider hunt — no deep link captured yet, so search the named site for your exact dates.</p>
				</div>
				<div class="leads">
					{#each leads as l (l.h)}
						<div class="lead-card"><h4>{l.h}</h4><p>{l.p}</p><div class="mini">{l.mini}</div></div>
					{/each}
				</div>
			</div>
		</section>

		<section>
			<div class="wrap">
				<div class="sec-head">
					<h2>The Bonus Round</h2><span class="tag">book-in extras</span>
					<p>Bring the entertainment to the house. Indicative prices — all come to your accommodation, and book well ahead for a March weekend.</p>
				</div>
				<div class="extras">
					{#each extras as x (x.t)}
						<div class="extra">
							<h3>{x.t}</h3>
							<div class="what">{x.what}</div>
							<div class="cost">{@html x.cost}</div>
							<div class="links">
								{#each x.links as l (l[1])}<a href={l[1]} target="_blank" rel="noopener">{l[0]}</a>{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<footer>
			<div class="wrap">
				<div class="rules">
					<h3>House rules (the small print)</h3>
					<ul>
						<li><b>Enter your name, then tap Vote.</b> Everyone gets 3 votes — stack them on one favourite or spread them around. The board updates live for everyone with the link.</li>
						<li><b>One ballot per device.</b> Change your mind any time — your votes save automatically and re-tally for everyone.</li>
						<li><b>Dates assumed 2027</b> (19–21 March is a Fri–Sun). <b>Prices are indicative</b> — confirm the actual weekend figure when you enquire; a 2-night stay for 12–14 typically lands inside £2k–£4k.</li>
						<li><b>Three wishlist houses</b> are the two links we shared plus the cover property; the rest are matched finds. Data pulled 5 Nov 2026 from each listing — double-check bathrooms, hot-tub status and any stag policy with the host.</li>
					</ul>
					<p class="backlink"><a href="/">← Back to the invitation</a></p>
				</div>
			</div>
		</footer>
	</main>

	<!-- ---------- INTRO MODAL ---------- -->
	{#if showIntro}
		<div class="scrim" role="presentation" onclick={closeIntro}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="intro-title"
				tabindex="-1"
				bind:this={dialogEl}
				onclick={(e) => e.stopPropagation()}
				onkeydown={dialogKeys}
			>
				<span class="bulbs"></span>
				<p class="kicker">{WEDDING.coupleName} present</p>
				<h2 id="intro-title" class="d-title">The Sten Is Right</h2>
				<p class="d-lede">
					A <b>sten do</b> is a stag and a hen rolled into one: all six couples, one big house, one
					weekend — <b>19–21 March 2027</b>. We've shortlisted the houses. You pick the winner.
				</p>
				<ol class="steps">
					<li><span class="n">1</span><span><b>Tell us who you are</b> so the board knows who's playing.</span></li>
					<li><span class="n">2</span><span><b>Spend 3 votes</b> — all on one house, or spread them around.</span></li>
					<li><span class="n">3</span><span><b>Watch the board.</b> Totals update live; change your mind any time.</span></li>
				</ol>
				<form
					class="d-form"
					onsubmit={(e) => {
						e.preventDefault();
						closeIntro();
					}}
				>
					<label for="intro-name">Contestant name</label>
					<input
						id="intro-name"
						type="text"
						placeholder="e.g. Greg"
						autocomplete="name"
						maxlength="24"
						bind:value={introName}
						bind:this={introInput}
					/>
					<button class="cta" type="submit">Come on down! ▶</button>
				</form>
				<p class="d-note">🔊 There's a theme tune. Mute it any time from the bar.</p>
			</div>
		</div>
	{/if}

	<canvas id="confetti" bind:this={canvas}></canvas>
	<div class="toast" class:show={toastOn} role="status" aria-live="polite">{toastMsg}</div>
</div>

<style>
	/* A neon gameshow leaderboard — spotlit dark stage, gold marquee, a grid of house
	   "contestants" the crew votes on live. Self-contained dark theme; variables are
	   scoped to .stendo so they don't leak into the (light, editorial) wedding site. */
	.stendo {
		color-scheme: dark;
		--stage: #160a22;
		--stage-2: #1f0f31;
		--stage-3: #2a1642;
		--ink: #fff5e9;
		--muted: #c7b2dd;
		--gold: #ffd23f;
		--gold-deep: #f59f00;
		--pink: #ff2e88;
		--cyan: #30e0e0;
		--green: #48e08a;
		--line: rgba(255, 210, 63, 0.22);
		--shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
		--maxw: 1180px;
		--f-display: 'Anton', 'Arial Narrow', system-ui, sans-serif;
		--f-pop: 'Fredoka', system-ui, sans-serif;
		--f-body: 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif;
		position: relative;
		min-height: 100vh;
		background:
			radial-gradient(1100px 560px at 50% -6%, rgba(255, 46, 136, 0.18), transparent 62%),
			radial-gradient(820px 520px at 85% 2%, rgba(48, 224, 224, 0.12), transparent 58%),
			radial-gradient(680px 480px at 10% 14%, rgba(255, 210, 63, 0.1), transparent 58%),
			var(--stage);
		color: var(--ink);
		font-family: var(--f-body);
		font-size: 16px;
		line-height: 1.5;
		overflow-x: hidden;
	}
	/* Dark overscroll / safe-area backdrop, only while this page is mounted. */
	:global(body:has(.stendo)) {
		background: #160a22;
	}
	.stendo::before {
		content: '';
		position: fixed;
		inset: 0 0 auto;
		height: env(safe-area-inset-top, 0px);
		background: var(--stage);
		z-index: 60;
	}
	.wrap {
		max-width: var(--maxw);
		margin: 0 auto;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	/* Base element styles stay unprefixed (Svelte scopes them) so class rules like
	   .book / .c-name keep winning on specificity. */
	a {
		color: var(--cyan);
	}
	h1,
	h2,
	h3 {
		text-wrap: balance;
		margin: 0;
	}
	button {
		font-family: var(--f-pop);
		cursor: pointer;
		touch-action: manipulation;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}
	:focus-visible {
		outline: 3px solid var(--cyan);
		outline-offset: 2px;
		border-radius: 6px;
	}

	/* ---------- HERO ---------- */
	.hero {
		position: relative;
		padding-block: 42px 0;
		text-align: center;
		isolation: isolate;
	}
	.spots {
		position: absolute;
		inset: -40px 0 0;
		z-index: -1;
		pointer-events: none;
		overflow: hidden;
	}
	.spot {
		position: absolute;
		top: -60px;
		width: 70vmax;
		height: 90vmax;
		max-width: 900px;
		opacity: 0.55;
		filter: blur(6px);
		transform-origin: 50% 0;
		background: conic-gradient(from 168deg at 50% 0, transparent 0deg, rgba(255, 245, 233, 0.16) 12deg, transparent 24deg);
	}
	.spot.l {
		left: -12%;
		animation: sweepL 7s ease-in-out infinite alternate;
	}
	.spot.r {
		right: -12%;
		background: conic-gradient(from 168deg at 50% 0, transparent 0deg, rgba(48, 224, 224, 0.14) 12deg, transparent 24deg);
		animation: sweepR 8.5s ease-in-out infinite alternate;
	}
	@keyframes sweepL {
		from {
			transform: rotate(-28deg);
		}
		to {
			transform: rotate(10deg);
		}
	}
	@keyframes sweepR {
		from {
			transform: rotate(26deg);
		}
		to {
			transform: rotate(-12deg);
		}
	}
	.marquee {
		position: relative;
		display: inline-block;
		max-width: 100%;
		border: 3px solid var(--gold-deep);
		border-radius: 18px;
		padding: 34px clamp(22px, 5vw, 64px) 30px;
		background: linear-gradient(180deg, rgba(42, 22, 66, 0.92), rgba(22, 10, 34, 0.92));
		box-shadow: var(--shadow), inset 0 0 0 7px rgba(255, 210, 63, 0.07), 0 0 60px rgba(255, 46, 136, 0.18);
	}
	.bulbs {
		position: absolute;
		inset: 6px;
		border-radius: 13px;
		pointer-events: none;
		padding: 9px;
		background: radial-gradient(circle, var(--gold) 0 2px, transparent 2.7px) 0 0 / 19px 19px;
		-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		opacity: 0.85;
		filter: drop-shadow(0 0 3px rgba(255, 210, 63, 0.7));
		animation: twinkle 1s steps(2) infinite;
	}
	@keyframes twinkle {
		to {
			background-position: 9.5px 0;
		}
	}
	.frame {
		position: absolute;
		inset: 16px;
		border-radius: 12px;
		pointer-events: none;
		box-shadow: inset 0 0 26px rgba(255, 46, 136, 0.16);
	}
	.burst {
		position: absolute;
		top: -26px;
		right: -22px;
		width: 104px;
		height: 104px;
		display: grid;
		place-items: center;
		background: var(--pink);
		clip-path: polygon(50% 0%, 61% 18%, 82% 9%, 80% 31%, 100% 38%, 86% 55%, 98% 75%, 76% 78%, 70% 100%, 52% 86%, 33% 100%, 26% 79%, 3% 77%, 14% 57%, 0% 39%, 20% 31%, 17% 9%, 39% 18%);
		animation: wobble 2.4s ease-in-out infinite;
		z-index: 2;
	}
	.burst span {
		font-family: var(--f-display);
		text-transform: uppercase;
		font-size: 0.92rem;
		line-height: 0.95;
		color: #fff;
		transform: rotate(-12deg);
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
	}
	@keyframes wobble {
		0%,
		100% {
			transform: rotate(-8deg) scale(1);
		}
		50% {
			transform: rotate(6deg) scale(1.08);
		}
	}
	.kicker {
		font-family: var(--f-pop);
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--cyan);
		font-size: clamp(0.6rem, 2.4vw, 0.78rem);
		margin: 0 0 10px;
	}
	.hero h1 {
		font-family: var(--f-display);
		font-weight: 400;
		line-height: 0.88;
		letter-spacing: 0.012em;
		text-transform: uppercase;
		display: grid;
		gap: 0.04em;
	}
	.hero h1 .t1,
	.hero h1 .t2 {
		display: block;
		font-size: clamp(2.6rem, 10vw, 5.6rem);
		color: var(--gold);
		text-shadow: 0 3px 0 var(--gold-deep), 0 0 24px rgba(255, 210, 63, 0.45), 0 0 52px rgba(255, 46, 136, 0.3);
	}
	.hero h1 .t2 {
		color: transparent;
		background: linear-gradient(100deg, var(--gold) 0%, #fff6c8 45%, var(--gold) 55%, var(--gold-deep) 100%) 0 0 / 250% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		text-shadow: none;
		filter: drop-shadow(0 3px 0 var(--gold-deep)) drop-shadow(0 0 22px rgba(255, 210, 63, 0.4));
		animation: shine 4.5s ease-in-out infinite;
	}
	@keyframes shine {
		0%,
		60% {
			background-position: 100% 0;
		}
		100% {
			background-position: -50% 0;
		}
	}
	.host-line {
		font-family: var(--f-pop);
		font-weight: 500;
		color: var(--ink);
		font-size: clamp(0.98rem, 3.3vw, 1.3rem);
		margin: 14px 0 0;
	}
	.host-line b {
		color: var(--pink);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}
	.fact {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.84rem;
		background: var(--stage-3);
		border: 1px solid var(--line);
		color: var(--ink);
		padding: 6px 13px;
		border-radius: 999px;
	}
	.fact b {
		color: var(--gold);
	}

	/* scrolling leaderboard ticker */
	.ticker {
		margin-top: 30px;
		overflow: hidden;
		background: linear-gradient(90deg, var(--pink), #c81a6d 50%, var(--pink));
		border-block: 2px solid var(--gold);
		box-shadow: 0 0 30px rgba(255, 46, 136, 0.35);
		-webkit-mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
		mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
	}
	.ticker-track {
		display: flex;
		width: max-content;
		animation: scroll 32s linear infinite;
	}
	.ticker-run {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	.tick-item,
	.tick-star {
		font-family: var(--f-display);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 1.05rem;
		color: #fff;
		white-space: nowrap;
		padding: 8px 0;
	}
	.tick-star {
		color: var(--gold);
		padding-inline: 22px;
	}
	@keyframes scroll {
		to {
			transform: translateX(-50%);
		}
	}

	/* ---------- VOTER BAR ---------- */
	.controls {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 40;
		background: linear-gradient(180deg, rgba(22, 10, 34, 0.97), rgba(22, 10, 34, 0.86));
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--line);
	}
	.controls .wrap {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding-block: 11px;
	}
	.namebox {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--stage-2);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px 4px 4px 14px;
	}
	.namebox label {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.74rem;
		color: var(--muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.namebox input {
		font-family: var(--f-body);
		font-size: 1rem;
		color: var(--ink);
		background: transparent;
		border: none;
		outline: none;
		width: min(34vw, 150px);
	}
	.namebox input::placeholder {
		color: var(--muted);
	}
	.namebox .ok {
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 50%;
		font-size: 0.95rem;
		color: #1a0b12;
		background: linear-gradient(180deg, var(--cyan), #17b9b9);
	}
	.pill {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.82rem;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--stage-3);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 7px 13px;
		color: var(--ink);
	}
	.pill b {
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	.pill.tix b {
		color: var(--pink);
	}
	.pill.sound {
		color: var(--muted);
	}
	.pill.sound.on {
		color: var(--ink);
		border-color: rgba(48, 224, 224, 0.5);
	}
	.pill.help {
		width: 44px;
		height: 44px;
		padding: 0;
		justify-content: center;
		color: var(--gold);
	}
	.eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 13px;
	}
	.eq i {
		width: 3px;
		height: 4px;
		border-radius: 1px;
		background: currentColor;
	}
	.sound.on .eq i {
		background: var(--cyan);
		animation: eq 0.9s ease-in-out infinite;
	}
	.sound.on .eq i:nth-child(2) {
		animation-delay: -0.3s;
	}
	.sound.on .eq i:nth-child(3) {
		animation-delay: -0.6s;
	}
	.sound.on .eq i:nth-child(4) {
		animation-delay: -0.15s;
	}
	@keyframes eq {
		0%,
		100% {
			height: 3px;
		}
		50% {
			height: 13px;
		}
	}
	.seg {
		display: flex;
		gap: 4px;
		background: var(--stage-2);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px;
		margin-left: auto;
	}
	.seg button {
		font-weight: 600;
		font-size: 0.78rem;
		color: var(--muted);
		background: transparent;
		border: none;
		border-radius: 999px;
		padding: 7px 12px;
		letter-spacing: 0.02em;
	}
	.seg button[aria-pressed='true'] {
		color: #1a0b12;
		background: linear-gradient(180deg, var(--cyan), #18b8b8);
	}
	.clearv {
		font-weight: 600;
		font-size: 0.78rem;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 7px 12px;
	}
	.clearv:hover {
		color: var(--ink);
		border-color: var(--pink);
	}

	.banner {
		margin: 0 0 16px;
		border-radius: 12px;
		padding: 11px 15px;
		font-size: 0.88rem;
		font-family: var(--f-pop);
		font-weight: 500;
		line-height: 1.4;
	}
	.banner.warn {
		background: rgba(255, 210, 63, 0.1);
		border: 1px solid rgba(255, 210, 63, 0.4);
		color: var(--ink);
	}

	/* ---------- SECTIONS ---------- */
	section {
		padding-block: 30px;
	}
	.sec-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}
	.sec-head h2 {
		font-family: var(--f-display);
		font-weight: 400;
		text-transform: uppercase;
		font-size: clamp(1.5rem, 5vw, 2.2rem);
		color: var(--ink);
		letter-spacing: 0.02em;
	}
	.sec-head .tag {
		font-family: var(--f-pop);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: var(--gold-deep);
		background: rgba(255, 210, 63, 0.12);
		border: 1px solid var(--line);
		padding: 4px 10px;
		border-radius: 999px;
	}
	.sec-head p {
		color: var(--muted);
		font-size: 0.92rem;
		margin: 0;
		flex-basis: 100%;
		max-width: 72ch;
	}

	/* ---------- GRID / CARDS ---------- */
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
		gap: 22px 18px;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 11px;
		background: linear-gradient(180deg, var(--stage-2), rgba(31, 15, 49, 0.72));
		border: 1px solid var(--line);
		border-radius: 18px;
		padding: 18px;
		box-shadow: var(--shadow);
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s;
	}
	.card:hover {
		transform: translateY(-3px);
		border-color: rgba(255, 210, 63, 0.4);
	}
	.card.picked {
		border-color: rgba(48, 224, 224, 0.45);
	}
	.card.lead {
		border-color: var(--gold);
		animation: leadglow 2.2s ease-in-out infinite;
	}
	@keyframes leadglow {
		0%,
		100% {
			box-shadow: var(--shadow), 0 0 0 2px rgba(255, 210, 63, 0.5), 0 0 22px rgba(255, 210, 63, 0.15);
		}
		50% {
			box-shadow: var(--shadow), 0 0 0 2px rgba(255, 210, 63, 0.85), 0 0 40px rgba(255, 210, 63, 0.35);
		}
	}
	.num {
		position: absolute;
		top: -14px;
		left: 16px;
		font-family: var(--f-display);
		font-size: 1.4rem;
		color: #1a0b12;
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		box-shadow: 0 5px 0 #b9770a;
	}
	.medal {
		position: absolute;
		top: -16px;
		left: 14px;
		font-size: 1.7rem;
		filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.4));
		z-index: 2;
	}
	.ribbon {
		position: absolute;
		top: 14px;
		right: 14px;
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.66rem;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #1a0b12;
		padding: 4px 9px;
		border-radius: 999px;
	}
	.ribbon.wish {
		background: linear-gradient(180deg, var(--pink), #d61e6f);
		color: #fff;
	}
	.ribbon.leader {
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
	}
	.c-name {
		font-family: var(--f-display);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.015em;
		font-size: 1.38rem;
		line-height: 1;
		color: var(--gold);
		margin-top: 10px;
		padding-right: 96px;
	}
	.c-loc {
		font-family: var(--f-pop);
		font-weight: 500;
		color: var(--muted);
		font-size: 0.84rem;
		margin-top: -3px;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.stat {
		background: var(--stage-3);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 8px 6px;
		text-align: center;
	}
	.stat .v {
		font-family: var(--f-display);
		font-size: 1.35rem;
		color: var(--ink);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.stat .l {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.58rem;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--muted);
		margin-top: 4px;
	}
	.couple {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.72rem;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 999px;
		align-self: flex-start;
	}
	.couple.good {
		color: #0c2417;
		background: rgba(72, 224, 138, 0.9);
	}
	.couple.ok {
		color: var(--ink);
		background: var(--stage-3);
		border: 1px solid var(--line);
	}
	.amen {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.amen span {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.66rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink);
		background: var(--stage-3);
		border: 1px solid var(--line);
		padding: 4px 9px;
		border-radius: 7px;
	}
	.amen span.hi {
		background: rgba(255, 210, 63, 0.16);
		border-color: rgba(255, 210, 63, 0.4);
		color: var(--gold);
	}
	.nearby {
		font-size: 0.79rem;
		color: var(--muted);
		line-height: 1.45;
	}
	.nearby :global(b) {
		color: var(--cyan);
		font-weight: 600;
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.price {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.86rem;
		color: var(--ink);
	}
	/* price-tag shape — a nod to the show */
	.tag-shape {
		position: relative;
		background: var(--stage-3);
		border: 1px solid var(--line);
		border-radius: 4px 10px 10px 4px;
		padding: 6px 12px 6px 22px;
	}
	.tag-shape::before {
		content: '';
		position: absolute;
		left: 8px;
		top: 50%;
		width: 6px;
		height: 6px;
		margin-top: -3px;
		border-radius: 50%;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.price .q {
		color: var(--gold);
	}
	.price small {
		display: block;
		font-weight: 500;
		font-size: 0.64rem;
		color: var(--muted);
	}
	.book {
		text-decoration: none;
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.78rem;
		color: var(--ink);
		background: var(--stage-3);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 8px 12px;
	}
	.book:hover {
		border-color: var(--cyan);
	}
	.book .src {
		display: block;
		font-weight: 500;
		font-size: 0.58rem;
		color: var(--muted);
	}

	/* vote block */
	.vote {
		margin-top: auto;
		border-top: 1px dashed var(--line);
		padding-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.tally {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.track {
		flex: 1;
		height: 12px;
		border-radius: 999px;
		background: var(--stage-3);
		border: 1px solid var(--line);
		overflow: hidden;
	}
	.bar {
		height: 100%;
		width: 0;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--gold-deep), var(--gold));
		transition: width 0.5s cubic-bezier(0.2, 0.8, 0.3, 1);
	}
	.card.lead .bar {
		background: linear-gradient(90deg, var(--pink), var(--gold));
	}
	.tnum {
		font-family: var(--f-display);
		font-size: 1.1rem;
		color: var(--ink);
		min-width: 2.4ch;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.bignum {
		display: inline-block;
		animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1);
	}
	@keyframes pop {
		from {
			transform: scale(1.6);
			color: var(--gold);
		}
	}
	.tnum small {
		font-family: var(--f-pop);
		font-size: 0.58rem;
		color: var(--muted);
		font-weight: 600;
		display: block;
		line-height: 1;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.vc {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.step {
		width: 40px;
		height: 40px;
		border-radius: 11px;
		border: 1px solid var(--line);
		background: var(--stage-3);
		color: var(--ink);
		font-size: 1.3rem;
		font-weight: 600;
		display: grid;
		place-items: center;
		line-height: 1;
	}
	.step:hover:not(:disabled) {
		border-color: var(--gold);
	}
	.plus {
		flex: 1;
		height: 40px;
		border-radius: 11px;
		border: none;
		color: #1a0b12;
		font-size: 0.92rem;
		font-weight: 600;
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
		box-shadow: 0 4px 0 #b9770a;
		transition: transform 0.08s, box-shadow 0.08s;
	}
	.plus:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #b9770a;
	}
	.mine {
		min-width: 1.6ch;
		text-align: center;
		font-family: var(--f-display);
		font-size: 1.4rem;
		color: var(--gold);
	}

	/* ---------- LEADS + EXTRAS (static) ---------- */
	.leads {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 14px;
	}
	.lead-card {
		background: var(--stage-2);
		border: 1px dashed var(--line);
		border-radius: 14px;
		padding: 15px;
	}
	.lead-card h4 {
		font-family: var(--f-pop);
		font-weight: 600;
		color: var(--ink);
		margin: 0 0 4px;
		font-size: 1rem;
	}
	.lead-card p {
		margin: 0;
		color: var(--muted);
		font-size: 0.82rem;
	}
	.lead-card .mini {
		font-family: var(--f-pop);
		font-weight: 600;
		color: var(--cyan);
		font-size: 0.76rem;
		margin-top: 6px;
	}
	.extras {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
		gap: 16px;
	}
	.extra {
		background: linear-gradient(180deg, var(--stage-2), rgba(31, 15, 49, 0.7));
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.extra h3 {
		font-family: var(--f-pop);
		font-weight: 600;
		color: var(--gold);
		font-size: 1.05rem;
	}
	.extra .what {
		color: var(--ink);
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.extra .cost {
		font-family: var(--f-pop);
		font-weight: 600;
		color: var(--cyan);
		font-size: 0.82rem;
	}
	.extra .cost :global(small) {
		color: var(--muted);
		font-weight: 500;
	}
	.extra .links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: auto;
	}
	.extra .links a {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.74rem;
		text-decoration: none;
		color: var(--ink);
		background: var(--stage-3);
		border: 1px solid var(--line);
		padding: 5px 10px;
		border-radius: 8px;
	}
	.extra .links a:hover {
		border-color: var(--cyan);
	}

	footer {
		padding-block: 26px 48px;
	}
	.rules {
		background: var(--stage-2);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 18px 20px;
	}
	.rules h3 {
		font-family: var(--f-pop);
		font-weight: 600;
		color: var(--gold);
		font-size: 1rem;
		margin-bottom: 8px;
	}
	.rules ul {
		margin: 0;
		padding-left: 18px;
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.6;
	}
	.rules b {
		color: var(--ink);
	}
	.backlink {
		margin: 14px 0 0;
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.82rem;
	}
	.backlink a {
		text-decoration: none;
	}

	/* ---------- INTRO MODAL ---------- */
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: grid;
		place-items: center;
		padding: 16px;
		background: radial-gradient(circle at 50% 30%, rgba(255, 46, 136, 0.18), rgba(10, 4, 16, 0.86) 70%);
		backdrop-filter: blur(6px);
		animation: fade 0.25s ease;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.dialog {
		position: relative;
		width: min(520px, 100%);
		text-align: center;
		border: 3px solid var(--gold-deep);
		border-radius: 20px;
		padding: 34px clamp(20px, 5vw, 38px) 26px;
		background: linear-gradient(180deg, #2c1646, #170a24);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6), 0 0 70px rgba(255, 210, 63, 0.18);
		animation: rise 0.45s cubic-bezier(0.2, 1.3, 0.4, 1);
		outline: none;
	}
	.dialog .kicker {
		margin-bottom: 6px;
	}
	.d-title {
		font-family: var(--f-display);
		font-weight: 400;
		text-transform: uppercase;
		font-size: clamp(2.1rem, 9vw, 3.1rem);
		line-height: 0.95;
		color: var(--gold);
		text-shadow: 0 3px 0 var(--gold-deep), 0 0 26px rgba(255, 210, 63, 0.4);
	}
	.d-lede {
		margin: 14px 0 0;
		color: var(--ink);
		font-size: 0.95rem;
		line-height: 1.55;
	}
	.d-lede b {
		color: var(--gold);
	}
	.steps {
		list-style: none;
		margin: 18px 0 0;
		padding: 0;
		display: grid;
		gap: 8px;
		text-align: left;
	}
	.steps li {
		display: flex;
		gap: 12px;
		align-items: center;
		background: rgba(42, 22, 66, 0.8);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 9px 12px;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.steps b {
		color: var(--ink);
	}
	.steps .n {
		flex: none;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border-radius: 9px;
		font-family: var(--f-display);
		font-size: 1.1rem;
		color: #1a0b12;
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
		box-shadow: 0 3px 0 #b9770a;
	}
	.d-form {
		margin-top: 18px;
		display: grid;
		gap: 10px;
		text-align: left;
	}
	.d-form label {
		font-family: var(--f-pop);
		font-weight: 600;
		font-size: 0.74rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.d-form input {
		font: 500 1rem var(--f-body);
		color: var(--ink);
		background: var(--stage);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 12px 14px;
	}
	.d-form input:focus {
		border-color: var(--cyan);
		outline: none;
	}
	.cta {
		height: 52px;
		border: none;
		border-radius: 14px;
		font-family: var(--f-display);
		font-size: 1.35rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #1a0b12;
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
		box-shadow: 0 5px 0 #b9770a, 0 0 30px rgba(255, 210, 63, 0.35);
		transition: transform 0.08s, box-shadow 0.08s;
	}
	.cta:active {
		transform: translateY(4px);
		box-shadow: 0 1px 0 #b9770a;
	}
	.d-note {
		margin: 14px 0 0;
		font-size: 0.78rem;
		color: var(--muted);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.94);
		}
	}

	#confetti {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 95;
	}
	.toast {
		position: fixed;
		left: 50%;
		top: calc(env(safe-area-inset-top, 0px) + 14px);
		transform: translateX(-50%) translateY(-220%);
		visibility: hidden;
		z-index: 96;
		font-family: var(--f-display);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 1.15rem;
		color: #1a0b12;
		background: linear-gradient(180deg, var(--gold), var(--gold-deep));
		padding: 11px 24px;
		border-radius: 14px;
		box-shadow: var(--shadow);
		transition: transform 0.35s cubic-bezier(0.2, 1.4, 0.4, 1);
		white-space: nowrap;
		max-width: 92vw;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.toast.show {
		transform: translateX(-50%) translateY(0);
		visibility: visible;
	}

	@media (prefers-reduced-motion: reduce) {
		.bulbs,
		.spot,
		.burst,
		.hero h1 .t2,
		.card.lead,
		.bignum,
		.sound.on .eq i,
		.scrim,
		.dialog {
			animation: none;
		}
		.ticker-track {
			animation: none;
			flex-wrap: wrap;
			width: auto;
			justify-content: center;
		}
		.ticker-run[aria-hidden='true'] {
			display: none;
		}
		.bar,
		.toast {
			transition: none;
		}
	}
	@media (max-width: 620px) {
		.dialog {
			padding: 24px 18px 20px;
		}
		.d-lede {
			font-size: 0.9rem;
		}
		.seg button,
		.clearv,
		.pill.sound,
		.plus,
		.step {
			min-height: 44px;
		}
		.step {
			min-width: 44px;
		}

		.seg {
			margin-left: 0;
		}
		.controls .wrap {
			gap: 8px;
		}
		.burst {
			width: 84px;
			height: 84px;
			top: -22px;
			right: -10px;
		}
		.burst span {
			font-size: 0.76rem;
		}
	}
</style>

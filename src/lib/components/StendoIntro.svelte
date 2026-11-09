<script lang="ts">
	// The full-screen opening for /stendo — shown every time the page loads,
	// before the page itself: three snap-scrolling scenes that animate
	// in as they arrive (the comeback, the pivot, the song), with
	// karaoke lyrics timed to the track. Closing it keeps the song going in a
	// mini player so people can sing along while they browse.
	import { onMount, tick } from 'svelte';
	import { SONG, lineAt, lastLineAt } from '$lib/song';
	import { VILLAGES } from '$lib/stendo';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const lines = SONG.lyrics;
	let overlay = $state<HTMLDivElement>();
	let audio = $state<HTMLAudioElement>();
	let listBox = $state<HTMLOListElement>();
	let scene = $state(0);
	let seen = $state<boolean[]>([false, false, false]);
	let playing = $state(false);
	let started = $state(false);
	let failed = $state(false);
	let t = $state(0);
	let duration = $state(SONG.duration);
	let showAll = $state(false);
	let reduced = $state(false);
	let lastFocus: Element | null = null;

	const live = $derived(lineAt(lines, t));
	const shownIdx = $derived(Math.max(0, lastLineAt(lines, t)));
	const cur = $derived(lines[shownIdx]);
	const prev = $derived(lines[shownIdx - 1]);
	const next = $derived(lines[shownIdx + 1]);
	const fill = $derived(live === shownIdx ? Math.min(1, Math.max(0, (t - cur.start) / Math.max(0.3, cur.end - cur.start))) : t >= cur.end ? 1 : 0);
	const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

	// ---- audio ----
	let raf = 0;
	function loop() {
		if (audio) t = audio.currentTime;
		raf = requestAnimationFrame(loop);
	}
	async function play() {
		if (!audio) return;
		try {
			await audio.play();
			started = true;
			failed = false;
		} catch {
			failed = true;
		}
	}
	function toggle() {
		if (!audio) return;
		if (audio.paused) void play();
		else audio.pause();
	}
	function seek(to: number) {
		if (!audio) return;
		audio.currentTime = Math.max(0, Math.min(duration - 0.1, to));
		t = audio.currentTime;
		if (audio.paused) void play();
	}
	function stop() {
		audio?.pause();
		if (audio) audio.currentTime = 0;
		t = 0;
		started = false;
	}
	$effect(() => {
		if (playing) {
			raf = requestAnimationFrame(loop);
			return () => cancelAnimationFrame(raf);
		}
	});
	// Keep the active line in view in the full lyric sheet.
	$effect(() => {
		if (!showAll || !listBox || live < 0) return;
		const el = listBox.children[live] as HTMLElement | undefined;
		el?.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
	});

	// ---- scenes ----
	function go(i: number) {
		const el = overlay?.querySelectorAll<HTMLElement>('.scene')[i];
		el?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
	}
	async function startSong() {
		go(2);
		await play();
	}

	function close() {
		open = false;
		if (lastFocus instanceof HTMLElement) lastFocus.focus();
	}

	function keys(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') { e.preventDefault(); close(); }
		else if ((e.key === 'ArrowDown' || e.key === 'PageDown') && e.target === overlay) { e.preventDefault(); go(Math.min(2, scene + 1)); }
		else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && e.target === overlay) { e.preventDefault(); go(Math.max(0, scene - 1)); }
	}

	$effect(() => {
		if (!open) return;
		lastFocus = document.activeElement;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = 'hidden';
		let io: IntersectionObserver | undefined;
		tick().then(() => {
			if (!overlay) return;
			overlay.focus();
			io = new IntersectionObserver(
				(entries) => {
					for (const en of entries) {
						if (!en.isIntersecting) continue;
						const i = Number((en.target as HTMLElement).dataset.i);
						scene = i;
						if (!seen[i]) seen[i] = true;
					}
				},
				{ root: overlay, threshold: 0.55 }
			);
			overlay.querySelectorAll('.scene').forEach((s) => io!.observe(s));
		});
		return () => {
			html.style.overflow = prevOverflow;
			io?.disconnect();
		};
	});

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		return () => cancelAnimationFrame(raf);
	});

	const sherwood = VILLAGES.sherwood;
</script>

<svelte:window onkeydown={keys} />

<audio bind:this={audio} src={SONG.src} preload="metadata"
	onplay={() => (playing = true)} onpause={() => (playing = false)} onended={() => { playing = false; t = 0; started = false; }}
	onloadedmetadata={() => { if (audio && Number.isFinite(audio.duration)) duration = audio.duration; }}
	onerror={() => { failed = true; playing = false; }}></audio>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="takeover" bind:this={overlay} role="dialog" aria-modal="true" aria-label="Third time lucky: the plan and the song" tabindex="0">
		<header class="bar">
			<span class="brand"><i aria-hidden="true">●</i> THE STENDO · TAKE THREE</span>
			<nav class="dots" aria-label="Scenes">
				{#each ['Hello again', 'The plan', 'The song'] as label, i}
					<button type="button" class:on={scene === i} aria-label={`Go to: ${label}`} aria-current={scene === i ? 'step' : undefined} onclick={() => go(i)}></button>
				{/each}
			</nav>
			<button class="skip" type="button" onclick={close}>Skip <span aria-hidden="true">×</span></button>
		</header>

		<!-- 1 · Hello again -->
		<section class="scene s1" class:in={seen[0]} data-i="0" aria-labelledby="s1-title">
			<div class="inner">
				<p class="kick a" style="--d:0">STEN RECORDS · THIRD PRESSING</p>
				<h2 id="s1-title" class="hello"><span class="a" style="--d:1">Hello</span> <span class="a" style="--d:2">again.</span></h2>
				<p class="lede a" style="--d:3">Yes. It’s us. Third app. Third song.<br />You haven’t finished voting on the last two. We know.</p>
				<ol class="history">
					<li class="a" style="--d:4"><b>App 1</b><s>The house vote</s><em>didn’t stick</em></li>
					<li class="a" style="--d:5"><b>App 2</b><s>Switzerland</s><em>didn’t fly</em></li>
					<li class="a now" style="--d:6"><b>App 3</b><span>Center Parcs</span><em>third time lucky</em></li>
				</ol>
				<button class="cta a" style="--d:7" type="button" onclick={() => go(1)}>So where are we going? <span aria-hidden="true">↓</span></button>
			</div>
			<span class="cue" aria-hidden="true">swipe up</span>
		</section>

		<!-- 2 · The plan -->
		<section class="scene s3" class:in={seen[1]} data-i="1" aria-labelledby="s3-title">
			<img class="bg" src={sherwood.hero} alt="" width="1800" height="900" loading="lazy" />
			<div class="shade" aria-hidden="true"></div>
			<div class="inner">
				<p class="kick a" style="--d:0">THE COUNTER-COUNTER-RECOUNTER-DOUBLE-BACK PITCH</p>
				<h2 id="s3-title" class="big"><span class="a" style="--d:1">No Alps.</span><span class="a" style="--d:2">No passports.</span><span class="a gold" style="--d:3">Center Parcs.</span></h2>
				<p class="why a" style="--d:3">Kiran & Elisa have some happy news (congratulations, you two), so this time it’s a short drive, not a flight.</p>
				<ul class="chips">
					<li class="a" style="--d:4">Fri 19 → Mon 22 March</li>
					<li class="a" style="--d:5">Sherwood or Longleat — you vote</li>
					<li class="a" style="--d:6">Everyone in a real bed</li>
					<li class="a" style="--d:7">Bring your own food & drink</li>
				</ul>
				<p class="whisper a" style="--d:8">(It’s a family break. We’re a family. Twelve of us. Very close.)</p>
				<button class="cta play-cta a" style="--d:9" type="button" onclick={startSong}><span aria-hidden="true">▶</span> Play the song</button>
			</div>
		</section>

		<!-- 3 · The song -->
		<section class="scene s4" class:in={seen[2]} class:playing data-i="2" aria-labelledby="s4-title">
			<div class="inner player">
				<div class="disc-row a" style="--d:0">
					<button class="disc" type="button" onclick={toggle} aria-label={playing ? 'Pause the song' : 'Play the song'} aria-pressed={playing}>
						<span class="label"><b>{playing ? 'Ⅱ' : '▶'}</b></span>
					</button>
					<div>
						<p class="kick">NOW PLAYING · TRACK 3</p>
						<h2 id="s4-title">{SONG.title}</h2>
						<p class="credit">Katie & Alex feat. one very judgemental owl</p>
					</div>
				</div>

				<div class="karaoke a" style="--d:1" aria-live="off">
					<p class="sec">{started ? cur.section : 'Press play and sing along'}</p>
					<button class="ln prev" type="button" disabled={!prev} onclick={() => prev && seek(prev.start)}>{prev?.text ?? ''}</button>
					<p class="ln cur" style:--p={`${fill * 100}%`}>{started ? cur.text : lines[0].text}</p>
					<button class="ln nxt" type="button" disabled={!next} onclick={() => next && seek(next.start)}>{started ? next?.text ?? '' : lines[1].text}</button>
				</div>

				<div class="scrub a" style="--d:2">
					<span>{fmt(t)}</span>
					<input type="range" min="0" max={duration} step="0.1" value={t} aria-label="Song position" oninput={(e) => seek(Number(e.currentTarget.value))} />
					<span>{fmt(duration)}</span>
				</div>
				{#if failed}<p class="warn" role="status">Tap the record to start the song (your browser blocked autoplay).</p>{/if}

				<div class="actions a" style="--d:3">
					<button class="ghost" type="button" aria-expanded={showAll} onclick={() => (showAll = !showAll)}>{showAll ? 'Hide' : 'All'} lyrics</button>
					<button class="cta enter" type="button" onclick={close}>Enter the forest <span aria-hidden="true">→</span></button>
				</div>
				{#if playing}<p class="keep">The song keeps playing while you look around.</p>{/if}

				{#if showAll}
					<ol class="sheet" bind:this={listBox} aria-label="Lyrics">
						{#each lines as l, i}
							<li class:on={i === live}><button type="button" onclick={() => seek(l.start)}><small>{i === 0 || lines[i - 1].section !== l.section ? l.section : ''}</small>{l.text}</button></li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>
	</div>
{/if}

{#if !open && started}
	<div class="mini" role="region" aria-label="Song player">
		<button class="mini-play" type="button" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Ⅱ' : '▶'}</button>
		<button class="mini-text" type="button" onclick={() => (open = true)} aria-label="Open the lyrics">
			<b>{SONG.title}</b><span>{live >= 0 ? lines[live].text : '♪'}</span>
		</button>
		<button class="mini-x" type="button" onclick={stop} aria-label="Stop the song">×</button>
	</div>
{/if}

<style>
	.takeover {
		--pine: #12241a; --ink: #f4efe2; --ember: #e0743a; --gold: #f0b37f; --moss: #7fc29a;
		position: fixed; inset: 0; z-index: 90; overflow-y: auto; overscroll-behavior: contain;
		scroll-snap-type: y mandatory; background: var(--pine); color: var(--ink);
		font-family: 'Figtree', Arial, sans-serif; outline: none; -webkit-overflow-scrolling: touch;
	}
	.takeover :global(*) { box-sizing: border-box; }
	h2, p, figure { margin: 0; }
	h2 { color: inherit; font-family: 'Anton', Impact, sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: -.01em; }
	button { font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
	button:focus-visible, input:focus-visible { outline: 3px solid #7fb3ff; outline-offset: 3px; }

	/* top bar */
	.bar { position: sticky; top: 0; z-index: 5; height: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 0 max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left)); }
	.bar > * { margin-top: calc(env(safe-area-inset-top) + 14px); }
	.brand { font-size: 10px; font-weight: 800; letter-spacing: .16em; opacity: .85; display: flex; gap: 8px; align-items: center; min-height: 40px; }
	.brand i { font-style: normal; color: var(--ember); }
	.dots { display: flex; flex-direction: column; gap: 4px; position: fixed; right: max(10px, env(safe-area-inset-right)); top: 50%; transform: translateY(-50%); margin: 0; }
	.dots button { width: 24px; height: 24px; border: 0; background: transparent; display: grid; place-items: center; padding: 0; }
	.dots button::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #f4efe255; transition: transform 200ms, background 200ms; }
	.dots button.on::after { background: var(--ember); transform: scale(1.5); }
	.skip { min-height: 40px; padding: 8px 14px; border: 1px solid #f4efe266; background: #12241acc; border-radius: 999px; font-size: 13px; font-weight: 800; backdrop-filter: blur(6px); }

	/* scenes */
	.scene { position: relative; min-height: 100dvh; scroll-snap-align: start; scroll-snap-stop: always; display: flex; align-items: center; overflow: hidden; isolation: isolate; padding: calc(env(safe-area-inset-top) + 72px) max(48px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 40px) max(24px, env(safe-area-inset-left)); }
	.inner { width: 100%; max-width: 1060px; margin: 0 auto; }
	.kick { font-size: 11px; font-weight: 800; letter-spacing: .16em; color: var(--gold); }
	.a { opacity: 0; transform: translateY(28px); transition: opacity 700ms cubic-bezier(.2,.8,.2,1), transform 800ms cubic-bezier(.2,.8,.2,1); transition-delay: calc(var(--d, 0) * 110ms); }
	.in .a { opacity: 1; transform: none; }
	.cta { display: inline-flex; align-items: center; gap: 12px; min-height: 54px; margin-top: 28px; padding: 14px 22px; border: 0; background: var(--ember); color: #fff; font-weight: 800; font-size: 16px; box-shadow: 4px 4px 0 #000a; transition: transform 140ms; }
	.cta:active { transform: translateY(2px); }
	.cue { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 14px); left: 50%; transform: translateX(-50%); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; opacity: .6; animation: bob 1.8s ease-in-out infinite; }
	@keyframes bob { 50% { transform: translate(-50%, 6px); } }

	/* 1 */
	.s1 { background: radial-gradient(900px 500px at 80% 10%, #2f6b4555, transparent 60%), var(--pine); }
	.hello { font-size: clamp(84px, 19vw, 220px); line-height: .86; margin-top: 14px; }
	.hello span { display: inline-block; }
	.hello span:last-child { color: var(--gold); }
	.lede { font-size: clamp(17px, 2.2vw, 22px); line-height: 1.5; margin-top: 22px; max-width: 640px; }
	.history { list-style: none; padding: 0; margin: 30px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 760px; }
	.history li { border: 1px solid #f4efe244; padding: 14px; display: grid; gap: 2px; }
	.history b { font-size: 11px; letter-spacing: .14em; color: #f4efe2aa; }
	.history s { font: 22px/1.1 'Anton', Impact, sans-serif; text-transform: uppercase; color: #f4efe288; text-decoration-color: var(--ember); text-decoration-thickness: 3px; }
	.history span { font: 22px/1.1 'Anton', Impact, sans-serif; text-transform: uppercase; color: var(--gold); }
	.history em { font: 15px 'Permanent Marker', cursive; font-style: normal; color: #f4efe2aa; transform: rotate(-3deg); }
	.history .now { border-color: var(--ember); background: #e0743a22; }
	.history .now em { color: var(--moss); }

	/* 2 */
	.s3 .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; transform: scale(1.15); transition: transform 9s ease-out; }
	.s3.in .bg { transform: scale(1); }
	.shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(0deg, #0b1710f2 10%, #0b1710aa 55%, #0b171055); }
	.big { font-size: clamp(56px, 10vw, 140px); line-height: .92; margin-top: 14px; display: grid; }
	.why { margin-top: 20px; max-width: 560px; font-size: clamp(16px, 2vw, 19px); line-height: 1.5; }
	.gold { color: var(--gold); }
	.chips { list-style: none; padding: 0; margin: 26px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
	.chips li { padding: 9px 14px; border: 1px solid #f4efe266; background: #0b171088; backdrop-filter: blur(4px); font-weight: 700; font-size: 14px; }
	.whisper { margin-top: 18px; font-size: 14px; font-style: italic; opacity: .75; }
	.play-cta span { font-size: 14px; }

	/* 3 */
	.s4 { background: radial-gradient(800px 500px at 20% 0%, #e0743a33, transparent 60%), #0e1c14; }
	.player { max-width: 860px; }
	.disc-row { display: flex; align-items: center; gap: 22px; }
	.disc { position: relative; flex-shrink: 0; width: 128px; height: 128px; border-radius: 50%; border: 0; padding: 0; background: repeating-radial-gradient(circle, #1a1a17 0 2px, #2b2a26 3px 4px); box-shadow: 0 12px 30px #0008, inset 0 0 0 2px #000; display: grid; place-items: center; }
	.disc::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, #ffffff1c 0 8%, transparent 18% 50%, #ffffff1c 58% 66%, transparent 76%); animation: spin 2.4s linear infinite; animation-play-state: paused; }
	.playing .disc::before { animation-play-state: running; }
	.disc .label { position: relative; width: 44%; aspect-ratio: 1; border-radius: 50%; background: var(--ember); display: grid; place-items: center; color: #fff; }
	.disc .label b { font-size: 20px; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.s4 h2 { font-size: clamp(40px, 7vw, 76px); line-height: .95; margin-top: 6px; }
	.credit { font-size: 13px; opacity: .7; margin-top: 6px; }
	.karaoke { margin-top: 34px; min-height: 230px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
	.sec { font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--moss); }
	.ln { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 4px 0; font-weight: 700; line-height: 1.25; }
	.prev, .nxt { font-size: clamp(16px, 2.3vw, 21px); color: #f4efe266; min-height: 44px; }
	.prev:disabled, .nxt:disabled { cursor: default; }
	.cur { font: 400 clamp(32px, 5.6vw, 58px)/1.08 'Anton', Impact, sans-serif; text-transform: uppercase; background: linear-gradient(90deg, var(--gold) var(--p, 0%), #f4efe2 var(--p, 0%)); -webkit-background-clip: text; background-clip: text; color: transparent; padding-block: 6px; }
	.scrub { display: flex; align-items: center; gap: 12px; font-size: 12px; font-variant-numeric: tabular-nums; margin-top: 18px; }
	.scrub input { flex: 1; accent-color: var(--ember); height: 32px; }
	.warn { margin-top: 10px; font-size: 13px; color: var(--gold); }
	.actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; }
	.actions .cta { margin-top: 0; }
	.ghost { min-height: 50px; padding: 10px 18px; border: 1px solid #f4efe266; background: transparent; font-weight: 800; }
	.keep { margin-top: 12px; font-size: 13px; opacity: .7; }
	.sheet { list-style: none; padding: 0; margin: 20px 0 0; max-height: 40dvh; overflow-y: auto; border-top: 1px solid #f4efe233; overscroll-behavior: contain; }
	.sheet button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 7px 4px; font-size: 15px; color: #f4efe2aa; min-height: 40px; }
	.sheet small { display: block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--moss); }
	.sheet small:empty { display: none; }
	.sheet .on button { color: var(--gold); font-weight: 800; }

	/* mini player */
	.mini { position: fixed; z-index: 80; left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right)); bottom: calc(env(safe-area-inset-bottom) + 12px); max-width: 460px; display: flex; align-items: center; gap: 4px; padding: 6px; background: #12241af2; color: #f4efe2; border-radius: 999px; box-shadow: 0 10px 30px #0006; backdrop-filter: blur(8px); font-family: 'Figtree', Arial, sans-serif; animation: rise 400ms cubic-bezier(.2,.8,.2,1); }
	@keyframes rise { from { transform: translateY(120%); opacity: 0; } }
	.mini button { border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
	.mini-play { width: 44px; height: 44px; border-radius: 50%; background: #e0743a !important; color: #fff !important; font-size: 15px; flex-shrink: 0; }
	.mini-text { flex: 1; min-width: 0; display: grid; text-align: left; padding: 2px 6px; min-height: 44px; align-content: center; }
	.mini-text b { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #f0b37f; }
	.mini-text span { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.mini-x { width: 44px; height: 44px; font-size: 22px !important; opacity: .8; flex-shrink: 0; }

	@media (max-width: 760px) {
		.scene { padding-left: 20px; padding-right: 40px; padding-top: calc(env(safe-area-inset-top) + 66px); }
		.brand { font-size: 9px; letter-spacing: .12em; }
		.history { grid-template-columns: 1fr; gap: 6px; }
		.history li { grid-template-columns: auto 1fr; align-items: baseline; column-gap: 12px; padding: 10px 12px; }
		.history em { grid-column: 2; }
		.history s, .history span { font-size: 19px; }
		.disc { width: 92px; height: 92px; }
		.disc-row { gap: 16px; }
		.karaoke { min-height: 210px; margin-top: 24px; }
		.cta { width: 100%; justify-content: space-between; }
		.actions { flex-direction: column-reverse; align-items: stretch; }
		.ghost { width: 100%; }
	}
	@media (prefers-reduced-motion: reduce) {
		.a, .s3 .bg { transition: none; transform: none !important; opacity: 1; }
		.disc::before, .cue, .mini { animation: none; }
		.takeover { scroll-behavior: auto; }
	}
</style>

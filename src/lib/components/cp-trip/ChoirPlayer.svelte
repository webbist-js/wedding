<script lang="ts">
	// The Vol. 03 sing-along: "Whinfell Hallelujah" starts as the page opens
	// and its lyrics stay docked at the bottom of the screen, timed to the
	// vocal. Browsers block sound until someone interacts with the page, so if
	// autoplay is refused the song starts on the first tap or key press instead.
	import { onMount } from 'svelte';
	import { HALLELUJAH, VOICE_LABEL, type ChoirLine } from '$lib/whinfell-song';
	import { lineAt, lastLineAt } from '$lib/song';
	import TripIcon from './TripIcon.svelte';

	let { playing = $bindable(false) }: { playing?: boolean } = $props();

	const lines = HALLELUJAH.lines;
	let audio = $state<HTMLAudioElement>();
	let dock = $state<HTMLElement>();
	let sheet = $state<HTMLOListElement>();
	let t = $state(0);
	let duration = $state(HALLELUJAH.duration);
	let waiting = $state(false); // autoplay refused: waiting for a tap
	let failed = $state(false);
	let userPaused = false;
	let ended = $state(false);
	let small = $state(false);
	let showAll = $state(false);
	let muted = $state(false);
	let reduced = false;

	const live = $derived(lineAt(lines, t));
	const shownIdx = $derived(Math.max(0, lastLineAt(lines, t)));
	const cur = $derived(lines[shownIdx]);
	// In a long instrumental gap, show what's coming rather than what's gone.
	const gap = $derived(t < lines[0].start || (live < 0 && !!lines[shownIdx + 1] && lines[shownIdx + 1].start - t < 3.5));
	const show = $derived(gap && t >= lines[0].start ? lines[shownIdx + 1] : t < lines[0].start ? lines[0] : cur);
	const next = $derived(lines[lines.indexOf(show) + 1]);
	const fill = $derived(t >= show.end ? 1 : t <= show.start ? 0 : (t - show.start) / Math.max(0.3, show.end - show.start));
	const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
	const label = (l: ChoirLine) => `${l.part} · ${l.echo ? 'Choir' : VOICE_LABEL[l.voice]}`;

	let raf = 0;
	function loop() {
		if (audio) t = audio.currentTime;
		raf = requestAnimationFrame(loop);
	}
	$effect(() => {
		if (!playing) return;
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	/** Start (or resume) the song. Safe to call from any click handler. */
	export async function play() {
		if (!audio) return;
		userPaused = false;
		if (ended) { audio.currentTime = 0; ended = false; }
		try {
			await audio.play();
			waiting = false;
			failed = false;
			disarm();
		} catch (e) {
			if ((e as DOMException)?.name === 'NotAllowedError') { waiting = true; arm(); }
			else failed = true;
		}
	}
	export function showLyrics() {
		small = false;
		showAll = true;
	}
	function toggle() {
		if (!audio) return;
		if (audio.paused) void play();
		else { userPaused = true; audio.pause(); }
	}
	function seek(to: number) {
		if (!audio) return;
		audio.currentTime = Math.max(0, Math.min(duration - 0.1, to));
		t = audio.currentTime;
		ended = false;
		if (audio.paused) void play();
	}

	// ---- start on the first interaction if autoplay was refused ----
	const GESTURES = ['pointerdown', 'click', 'touchend', 'keydown'] as const;
	function onGesture(e: Event) {
		if (userPaused) return disarm();
		// The dock's own buttons handle themselves.
		if (dock && e.target instanceof Node && dock.contains(e.target)) return;
		void play();
	}
	function arm() { for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true }); }
	function disarm() { for (const g of GESTURES) window.removeEventListener(g, onGesture, { capture: true }); }

	// Keep the live line in view inside the lyric sheet (without moving the page).
	$effect(() => {
		if (!showAll || !sheet || live < 0) return;
		const el = sheet.children[live] as HTMLElement | undefined;
		if (!el) return;
		const top = el.offsetTop - sheet.clientHeight / 2 + el.clientHeight / 2;
		sheet.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
	});

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if ('mediaSession' in navigator) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: HALLELUJAH.title,
				artist: HALLELUJAH.artist,
				album: 'Stendo · Forest Edition',
				artwork: [{ src: '/images/sten-do/forest-edition.jpg', sizes: '1000x1000', type: 'image/jpeg' }]
			});
		}
		void play();
		return () => { disarm(); cancelAnimationFrame(raf); };
	});
</script>

<audio bind:this={audio} src={HALLELUJAH.src} preload="auto" bind:muted
	onplay={() => (playing = true)} onpause={() => (playing = false)}
	onended={() => { playing = false; ended = true; }}
	onloadedmetadata={() => { if (audio && Number.isFinite(audio.duration)) duration = audio.duration; }}
	onerror={() => { failed = true; playing = false; }}></audio>

<section class="dock" class:small class:playing class:open={showAll} bind:this={dock} aria-label="Sing-along: {HALLELUJAH.title}">
	{#if showAll && !small}
		<ol class="sheet" bind:this={sheet} aria-label="All the lyrics">
			{#each lines as l, i}
				<li class:on={i === live} class:echo={l.echo}>
					<button type="button" onclick={() => seek(l.start)}>
						{#if i === 0 || lines[i - 1].part !== l.part}<small>{l.part}</small>{/if}
						{l.text}{#if l.reply}{' '}<em>({l.reply})</em>{/if}
					</button>
				</li>
			{/each}
		</ol>
	{/if}

	<div class="bar">
		<input class="scrub" type="range" min="0" max={duration} step="0.1" value={t} aria-label="Song position, {fmt(t)} of {fmt(duration)}" oninput={(e) => seek(Number(e.currentTarget.value))} style:--p={`${(t / duration) * 100}%`} />
		<button class="disc" class:pulse={waiting} type="button" onclick={toggle} aria-label={playing ? 'Pause the song' : 'Play the song'} aria-pressed={playing}>
			<span><TripIcon name={playing ? 'pause' : 'play'} size={13} strokeWidth={3} class="fillicon" /></span>
		</button>

		<div class="words" aria-live="off">
			{#if waiting && !playing}
				<p class="part">{HALLELUJAH.title} · {HALLELUJAH.artist}</p>
				<p class="line">Tap anywhere to raise the roof</p>
			{:else if failed}
				<p class="part">{HALLELUJAH.title}</p>
				<p class="line">The song won’t load right now.</p>
			{:else if ended}
				<p class="part">{HALLELUJAH.title}</p>
				<p class="line">…Lord have mercy. <button class="again" type="button" onclick={() => play()}>Sing it again</button></p>
			{:else}
				<p class="part">{t < lines[0].start ? 'Intro · Full choir' : label(show)}</p>
				<p class="line" class:echo={show.echo} style:--f={`${fill * 100}%`}>{show.text}{#if show.reply}{' '}<em>({show.reply})</em>{/if}</p>
				{#if !small && next}<p class="next" class:echo={next.echo}>{next.text}{#if next.reply}{` (${next.reply})`}{/if}</p>{/if}
			{/if}
		</div>

		<div class="tools">
			{#if !small}
				<button type="button" class="tool" aria-expanded={showAll} onclick={() => (showAll = !showAll)}><TripIcon name="lyrics" size={15} strokeWidth={2.25} /><span>{showAll ? 'Hide' : 'Lyrics'}</span></button>
				<button type="button" class="tool icon mute" aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => (muted = !muted)}><TripIcon name={muted ? 'mute' : 'volume'} size={17} strokeWidth={2.25} /></button>
			{/if}
			<button type="button" class="tool icon" aria-label={small ? 'Show the lyrics bar' : 'Shrink the lyrics bar'} onclick={() => { small = !small; if (small) showAll = false; }}><TripIcon name={small ? 'chevron-up' : 'chevron-down'} size={18} strokeWidth={2.5} /></button>
		</div>
	</div>
</section>

<style>
	.dock {
		--wine: #3b0a16; --wine-2: #22050c; --gold: #d9ab52; --gold-2: #f3d58f; --cream: #f7efdf;
		position: fixed; z-index: 30; left: 50%; bottom: calc(env(safe-area-inset-bottom) + var(--tabbar-h, 0px) + 12px); transform: translateX(-50%);
		width: min(920px, calc(100vw - 24px)); color: var(--cream);
		background: linear-gradient(180deg, #4a0d1c, #22050c); border: 1px solid #d9ab5288; border-radius: 18px;
		box-shadow: 0 18px 50px #1a0308aa, inset 0 1px 0 #f3d58f33;
		font-family: 'Figtree', Arial, sans-serif; overflow: hidden;
		animation: rise 600ms cubic-bezier(.2, .8, .2, 1);
	}
	@keyframes rise { from { transform: translate(-50%, 130%); } }
	.dock :global(*) { box-sizing: border-box; }
	.dock p { margin: 0; }
	button { font: inherit; color: inherit; cursor: pointer; background: none; border: 0; }
	button:focus-visible, input:focus-visible { outline: 3px solid var(--gold-2); outline-offset: 2px; }

	.bar { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 14px 14px 12px; }
	.scrub { position: absolute; left: 0; right: 0; top: -9px; width: 100%; height: 20px; margin: 0; appearance: none; -webkit-appearance: none; background: transparent; cursor: pointer; }
	.scrub::-webkit-slider-runnable-track { height: 3px; background: linear-gradient(90deg, var(--gold) var(--p), #f7efdf26 var(--p)); }
	.scrub::-moz-range-track { height: 3px; background: linear-gradient(90deg, var(--gold) var(--p), #f7efdf26 var(--p)); }
	.scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4.5px; border-radius: 50%; background: var(--gold-2); opacity: 0; transition: opacity 150ms; }
	.scrub::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: var(--gold-2); }
	.dock:hover .scrub::-webkit-slider-thumb, .scrub:focus-visible::-webkit-slider-thumb { opacity: 1; }

	.disc { position: relative; width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; background: repeating-radial-gradient(circle, #171012 0 2px, #2a2023 3px 4px); box-shadow: 0 0 0 2px var(--gold), 0 6px 16px #0008; }
	.disc::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(#ffffff22 0 8%, transparent 18% 50%, #ffffff22 58% 66%, transparent 76%); animation: spin 2.4s linear infinite paused; }
	.playing .disc::after { animation-play-state: running; }
	.disc span { position: relative; z-index: 1; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--gold); color: var(--wine-2); }
	.disc :global(.fillicon) { fill: currentColor; }
	.disc.pulse { animation: halo 1.6s ease-out infinite; }
	@keyframes halo { 0% { box-shadow: 0 0 0 2px var(--gold), 0 0 0 0 #f3d58faa; } 100% { box-shadow: 0 0 0 2px var(--gold), 0 0 0 16px #f3d58f00; } }
	@keyframes spin { to { transform: rotate(360deg); } }

	.words { min-width: 0; display: grid; gap: 2px; }
	.part { font: 600 10px/1.2 'Cinzel', Georgia, serif; letter-spacing: .2em; text-transform: uppercase; color: var(--gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.line {
		font: italic 700 clamp(18px, 2.6vw, 26px)/1.2 'Playfair Display', Georgia, serif;
		background: linear-gradient(90deg, var(--gold-2) var(--f, 0%), var(--cream) var(--f, 0%)); -webkit-background-clip: text; background-clip: text; color: transparent;
		overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;
	}
	.line em { font-style: italic; font-weight: 400; }
	.line.echo { font-weight: 400; }
	.again { margin-left: 8px; font: 700 13px 'Figtree', Arial, sans-serif; color: var(--gold-2); text-decoration: underline; min-height: 32px; -webkit-text-fill-color: var(--gold-2); }
	.next { font-size: 13px; color: #f7efdf80; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.tools { display: flex; align-items: center; gap: 4px; }
	.tool { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; min-width: 44px; padding: 8px 12px; border-radius: 999px; border: 1px solid #d9ab5255; font-size: 12px; font-weight: 800; letter-spacing: .04em; color: var(--cream); }
	.tool:hover { background: #f7efdf14; }
	.tool.icon { padding: 8px; font-size: 15px; }
	.tool[aria-expanded=true] { background: var(--gold); color: var(--wine-2); border-color: var(--gold); }

	.sheet { list-style: none; margin: 0; padding: 14px 10px 6px; max-height: min(46vh, 420px); overflow-y: auto; overscroll-behavior: contain; border-bottom: 1px solid #d9ab5244; }
	.sheet button { display: block; width: 100%; text-align: left; padding: 6px 8px; border-radius: 8px; font-size: 15px; color: #f7efdfaa; min-height: 36px; }
	.sheet button:hover { background: #f7efdf10; }
	.sheet small { display: block; margin: 10px 0 2px; font: 600 10px 'Cinzel', Georgia, serif; letter-spacing: .2em; text-transform: uppercase; color: var(--gold); }
	.sheet em { color: var(--gold); }
	.sheet .echo button { padding-left: 22px; font-style: italic; color: #e9c98aaa; }
	.sheet .on button { color: var(--gold-2); font-weight: 800; background: #f7efdf12; }

	.small { width: auto; max-width: min(420px, calc(100vw - 24px)); left: auto; right: max(12px, env(safe-area-inset-right)); transform: none; border-radius: 999px; animation: none; }
	.small .bar { padding: 6px 6px 6px 6px; gap: 10px; }
	.small .disc { width: 44px; height: 44px; }
	.small .disc span { width: 22px; height: 22px; }
	.small .part { display: none; }
	.small .line { font-size: 14px; -webkit-line-clamp: 1; line-clamp: 1; display: block; white-space: nowrap; }
	.small .scrub { display: none; }

	@media (max-width: 640px) {
		/* sits just above the tab bar, one line tall */
		.dock { bottom: calc(env(safe-area-inset-bottom) + var(--tabbar-h, 0px) + 8px); }
		.dock:not(.small) { width: calc(100vw - 16px); border-radius: 14px; }
		.bar { gap: 10px; padding: 8px 6px 8px 8px; }
		.disc { width: 42px; height: 42px; }
		.disc span { width: 22px; height: 22px; }
		.part { font-size: 9px; }
		.line { font-size: 16px; -webkit-line-clamp: 1; line-clamp: 1; }
		.tool { min-height: 40px; min-width: 40px; }
		.sheet { max-height: 42svh; }
		.tools .tool:not(.icon) { padding: 8px 10px; font-size: 11px; }
		.tools .mute { display: none; }
		.tools .tool span { display: none; }
		.next { display: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.dock, .disc::after, .disc.pulse { animation: none; }
	}
</style>

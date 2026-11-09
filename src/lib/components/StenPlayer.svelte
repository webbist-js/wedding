<script lang="ts">
    import { onMount, tick } from 'svelte';
    import floorPlanLyrics from '$lib/floor-plan-review-timing.json';
    import grownFolkLyrics from '$lib/grown-folk-business-timing.json';

    let { bonusUnlocked = false }: { bonusUnlocked?: boolean } = $props();

    const tracks = [
        { title: 'Floor-Plan Review', src: '/audio/floor-plan-review.mp3', lyrics: floorPlanLyrics },
        { title: 'Grown Folk Business', src: '/audio/grown-folk-business-v2.mp3', lyrics: grownFolkLyrics }
    ];
    let trackIndex = $state(0);
    const track = $derived(tracks[trackIndex]);
    const lyrics = $derived(track.lyrics);
    let switchVersion = 0;

    async function selectTrack(index: number, play = true) {
        if (index === trackIndex || (index === 1 && !bonusUnlocked)) return;
        const version = ++switchVersion;
        audio.pause();
        trackIndex = index;
        position = 0;
        duration = 0;
        message = '';
        await tick();
        if (version !== switchVersion) return;
        audio.load();
        if (lyricList) lyricList.scrollTop = 0;
        if (!play) return;
        prepareVisual();
        try { await audio.play(); }
        catch { if (version === switchVersion) message = 'Press Play to start this track.'; }
    }

    $effect(() => {
        if (!bonusUnlocked && trackIndex === 1) void selectTrack(0, false);
    });

    let audio: HTMLAudioElement;
    let canvas: HTMLCanvasElement;
    let lyricList: HTMLDivElement;
    let playing = $state(false);
    let position = $state(0);
    let duration = $state(279.92);
    let volume = $state(0.65);
    let muted = $state(false);
    let lyricsOpen = $state(false);
    let follow = $state(true);
    let visualEnabled = $state(true);
    let reducedMotion = $state(false);
    let message = $state('');
    let context: AudioContext | undefined;
    let analyser: AnalyserNode | undefined;
    let source: MediaElementAudioSourceNode | undefined;
    let bins: Uint8Array<ArrayBuffer> | undefined;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let observer: IntersectionObserver | undefined;

    const formatTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const lineIndex = $derived(lyrics.findLastIndex(line => position >= line.start));
    const currentLine = $derived(lineIndex >= 0 && position < lyrics[lineIndex].end ? lyrics[lineIndex] : null);
    const nextLine = $derived(lyrics[lineIndex + 1]);

    function stopVisual() {
        cancelAnimationFrame(raf);
        raf = 0;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#8f8061';
        for (let i = 0; i < 40; i++) ctx.fillRect(i * 12, 57, 6, 3);
    }
    function draw() {
        if (disposed || !playing || !visible || document.hidden || reducedMotion || !visualEnabled || !analyser || !bins) { stopVisual(); return; }
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        analyser.getByteFrequencyData(bins);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 40; i++) {
            const index = Math.floor(Math.pow(i / 39, 1.8) * (bins.length - 1));
            const height = muted ? 3 : Math.max(3, bins[index] / 255 * 56);
            ctx.fillStyle = i > 28 ? '#d59b76' : '#e5c774';
            ctx.fillRect(i * 12, 60 - height, 6, height);
        }
        raf = requestAnimationFrame(draw);
    }
    function startVisual() { if (!raf) draw(); }
    function connectAnalyser() {
        // Never route the element into a suspended context: native playback must stay audible.
        if (disposed || !audio || !context || context.state !== 'running') return;
        if (!source) {
            analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            bins = new Uint8Array(analyser.frequencyBinCount);
            source = context.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(context.destination);
        }
        startVisual();
    }
    function prepareVisual() {
        try {
            context ??= new AudioContext();
            if (context.state === 'running') connectAnalyser();
            else void context.resume().then(connectAnalyser).catch(() => { /* Native playback still works without a visualiser. */ });
        } catch { /* Web Audio is optional; the player still works. */ }
    }
    async function togglePlay() {
        if (!audio) return;
        if (!audio.paused) { audio.pause(); return; }
        prepareVisual();
        try { await audio.play(); message = ''; }
        catch { message = 'Playback could not start. Please try Play again.'; }
    }
    function seek(time: number) {
        if (!audio || !Number.isFinite(time)) return;
        audio.currentTime = Math.max(0, Math.min(duration, time));
        position = audio.currentTime;
    }
    function onPlay() { playing = true; message = ''; prepareVisual(); }
    function onPause() { playing = false; stopVisual(); }
    async function toggleLyrics() {
        lyricsOpen = !lyricsOpen;
        await tick();
        scrollLyrics();
    }
    function scrollLyrics() {
        if (!follow || !lyricsOpen || !lyricList || lineIndex < 0) return;
        const line = lyricList.querySelector<HTMLElement>(`[data-line="${lineIndex}"]`);
        if (line) lyricList.scrollTo({ top: line.offsetTop - lyricList.clientHeight / 3, behavior: reducedMotion ? 'instant' : 'smooth' });
    }
    $effect(() => {
        lineIndex; follow; lyricsOpen;
        void tick().then(scrollLyrics);
    });
    $effect(() => { if (audio) { audio.volume = volume; audio.muted = muted; } });
    $effect(() => { if (visualEnabled && !reducedMotion) startVisual(); else stopVisual(); });

    onMount(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => { reducedMotion = preference.matches; if (reducedMotion) stopVisual(); else startVisual(); };
        updatePreference();
        preference.addEventListener('change', updatePreference);
        const visibility = () => { if (document.hidden) stopVisual(); else startVisual(); };
        document.addEventListener('visibilitychange', visibility);
        observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; if (visible) startVisual(); else stopVisual(); });
        observer.observe(canvas);
        audio.volume = volume;
        // Requested autoplay. Browsers may require the explicit Play control instead.
        void audio.play().catch(() => { if (!disposed) message = 'Your browser needs a tap. Press Play to start the track.'; });
        stopVisual();
        return () => {
            disposed = true;
            audio.pause();
            stopVisual();
            observer?.disconnect();
            preference.removeEventListener('change', updatePreference);
            document.removeEventListener('visibilitychange', visibility);
            source?.disconnect();
            analyser?.disconnect();
            void context?.close();
        };
    });
</script>

<section class="music-deck" id="soundtrack" aria-label="The Stendo music player">
    <audio bind:this={audio} src={track.src} preload="metadata" onplay={onPlay} onpause={onPause} onended={onPause} ontimeupdate={() => position = audio.currentTime} onloadedmetadata={() => { if (Number.isFinite(audio.duration)) duration = audio.duration; }} onerror={() => { message = 'The track could not load. Refresh to try again.'; playing = false; stopVisual(); }}></audio>
    <div class="deck-top"><div><p class="eyebrow">STEN RECORDS / THE ORIGINAL SOUNDTRACK</p><h2>{track.title.toUpperCase()}.</h2><span class="explicit">EXPLICIT LYRICS</span></div><canvas bind:this={canvas} width="480" height="64" aria-hidden="true"></canvas></div>
    <div class="track-list" role="group" aria-label="Choose a song">{#each tracks as song, i}<button type="button" class:selected={trackIndex === i} aria-pressed={trackIndex === i} disabled={i === 1 && !bonusUnlocked} aria-describedby={i === 1 ? 'bonus-status' : undefined} onclick={() => selectTrack(i)}><span>0{i + 1}</span>{song.title}</button>{/each}</div>
    <p id="bonus-status" class="bonus-status" role="status">{bonusUnlocked ? 'Bonus track unlocked. Excellent executive decision.' : 'Use all 3 votes to unlock Grown Folk Business.'}</p>
    <div class="transport"><button class="play" type="button" onclick={togglePlay} aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? 'Pause' : 'Play'}</button><div class="timeline"><label class="sr-only" for="song-position">Track position</label><input id="song-position" type="range" min="0" max={duration} step="0.1" value={position} oninput={e => seek(Number(e.currentTarget.value))} aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`} /><div class="time"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div></div><button class="lyrics-toggle" type="button" aria-expanded={lyricsOpen} aria-controls="song-lyrics" onclick={toggleLyrics}>{lyricsOpen ? 'Hide lyrics' : 'Sing along'} <span aria-hidden="true">{lyricsOpen ? '−' : '+'}</span></button></div>
    <div class="deck-options"><button type="button" onclick={() => muted = !muted} aria-pressed={muted}>{muted ? 'Unmute' : 'Mute'}</button><label for="song-volume">Volume</label><input id="song-volume" type="range" min="0" max="1" step="0.01" bind:value={volume} aria-valuetext={`${Math.round(volume * 100)} percent`} /><button type="button" aria-pressed={visualEnabled} disabled={reducedMotion} onclick={() => visualEnabled = !visualEnabled}>{reducedMotion ? 'Reduced motion' : visualEnabled ? 'Visualiser on' : 'Visualiser off'}</button></div>
    {#if message}<p class="player-message" role="status">{message}</p>{/if}
    <div class="lyric-preview"><p class:lit={currentLine !== null}>{currentLine?.text ?? ''}</p>{#if nextLine}<small>UP NEXT · {nextLine.text}</small>{/if}</div>
    <div id="song-lyrics" hidden={!lyricsOpen} class="lyrics-panel">
        <div class="lyrics-tools"><span>Auto-aligned · tap a line to seek</span><label><input type="checkbox" bind:checked={follow} /> Follow lyrics</label></div>
        <p class="timing-note">Line timings are matched to the recording; fine timing may vary.</p>
        <!-- This scroll region needs keyboard focus for manual lyric browsing. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="lyrics-list" bind:this={lyricList} tabindex="0" role="region" aria-label="Song lyrics">
            {#each lyrics as line, i}
                <button type="button" data-line={i} class:active={i === lineIndex && currentLine !== null} aria-current={i === lineIndex && currentLine !== null ? 'true' : undefined} onclick={() => seek(line.start)}><span class="line-time">{formatTime(line.start)}</span><span>{line.text}</span></button>
            {/each}
        </div>
    </div>
</section>

<style>
    .music-deck { background: #262520; color: #f1ede2; border: 1px solid #262520; padding: 22px; font-family: 'Figtree', Arial, sans-serif; }
    .deck-top { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
    .eyebrow { font-size: 8px; font-weight: 800; letter-spacing: .12em; margin: 0 0 7px; color: #c9bea6; }
    h2 { color: #f1ede2; font: 27px/1.1 'Anton', Impact, sans-serif; margin: 0 0 8px; }
    .explicit { font-size: 7px; letter-spacing: .07em; border: 1px solid #978d77; padding: 2px 4px; }
    canvas { width: 40%; height: 48px; max-width: 230px; }
    button, input { font: inherit; }
    button { cursor: pointer; border: 1px solid #7c7362; background: transparent; color: inherit; min-height: 44px; padding: 8px 12px; font-size: 12px; font-weight: 700; transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1); }
    button:active { transform: scale(.97); }
    button:disabled { cursor: default; opacity: .7; }
    :focus-visible { outline: 3px solid #9cb5f3; outline-offset: 3px; }
    .bonus-status { color: #e5c774; font-size: 11px; line-height: 1.5; margin: 10px 0 0; }
    .track-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
    .track-list button { text-align: left; line-height: 1.4; padding: 10px; }
    .track-list button span { display: block; color: #c9bea6; font-size: 9px; margin-bottom: 3px; }
    .track-list button.selected { border-color: #e5c774; background: #e5c77415; color: #f7da86; }
    .transport { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
    .play { display: flex; align-items: center; justify-content: center; gap: 9px; background: #e5c774; color: #262520; border-color: #e5c774; min-width: 80px; }
    .timeline { flex: 1; min-width: 0; }
    input[type=range] { width: 100%; min-width: 0; height: 24px; margin: 0; accent-color: #e5c774; cursor: pointer; }
    .time { display: flex; justify-content: space-between; font-size: 10px; font-variant-numeric: tabular-nums; color: #d6cbb5; }
    .lyrics-toggle { white-space: nowrap; }
    .deck-options { display: flex; align-items: center; gap: 10px; margin-top: 8px; color: #d6cbb5; }
    .deck-options button { border: 0; padding: 7px 0; font-size: 10px; }
    .deck-options label { font-size: 10px; }
    .deck-options input { width: 65px; }
    .deck-options button:last-child { margin-left: auto; }
    .player-message { font-size: 11px; color: #e5c774; margin: 4px 0 12px; }
    .lyric-preview { border-top: 1px solid #665e50; padding-top: 15px; margin-top: 5px; }
    .lyric-preview p { font-size: 18px; line-height: 1.4; font-weight: 700; margin: 4px 0 9px; min-height: 50px; }
    .lyric-preview p.lit { color: #e5c774; }
    .lyric-preview small { font-size: 10px; line-height: 1.4; color: #c9bea6; display: block; }
    .lyrics-panel { border-top: 1px solid #665e50; margin-top: 18px; padding-top: 12px; }
    .lyrics-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 10px; }
    .lyrics-tools label { display: flex; align-items: center; gap: 6px; min-height: 44px; white-space: nowrap; }
    .lyrics-tools input { accent-color: #e5c774; width: 17px; height: 17px; }
    .timing-note { color: #c9bea6; font-size: 10px; margin: 0 0 10px; }
    .lyrics-list { position: relative; max-height: 320px; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: #e5c774 #262520; }
    .lyrics-list button { display: flex; gap: 10px; width: 100%; text-align: left; border: 0; border-left: 3px solid transparent; font-size: 14px; line-height: 1.5; font-weight: 600; padding: 10px; color: #d6cbb5; }
    .lyrics-list button.active { color: #f7da86; background: #e5c77415; border-left-color: #e5c774; }
    .line-time { font-size: 9px; min-width: 26px; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    @media (max-width: 760px) {
        .music-deck { padding: 16px; }
        .deck-top { gap: 10px; }
        h2 { font-size: 23px; }
        .transport { flex-wrap: wrap; gap: 10px; }
        .lyrics-toggle { width: 100%; min-height: 44px; }
        .deck-options { flex-wrap: wrap; gap: 6px 10px; }
        .deck-options button { min-width: 44px; font-size: 12px; }
        .deck-options label { font-size: 12px; }
        .deck-options input { flex: 1; min-width: 55px; max-width: 90px; }
        input[type=range] { height: 44px; }
        .track-list button { font-size: 13px; min-height: 64px; }
        .time, .bonus-status, .player-message, .lyric-preview small, .lyrics-tools, .timing-note { font-size: 12px; }
        .lyrics-list { max-height: min(340px, 45dvh); }
        .lyrics-list button { font-size: 16px; }
        .explicit { font-size: 9px; }
        .eyebrow { font-size: 9px; }
        canvas { width: 30%; flex-shrink: 0; }
        .lyric-preview p { font-size: 17px; }
        .lyrics-tools { flex-wrap: wrap; gap: 0 10px; }
    }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } button:active { transform: none; } }
</style>

<script lang="ts">
	// What we could do at Whinfell, plus the "who's in?" poll. Interest is not
	// a booking: it just tells us what's worth booking as a group.
	//
	// Every grid holds a count that fills its rows at each breakpoint (12 plans,
	// 6 group picks, 12 other activities, 6 for Theo), so no card sits alone.
	import { person, type Person } from '$lib/cp-trip';
	import { ACTIVITIES, GROUP_PLANS, KIDS, type Activity } from '$lib/cp-whinfell';
	import TripIcon from './TripIcon.svelte';

	type Props = {
		interest: Record<string, string[]>;
		me: Person | null;
		act: (body: Record<string, unknown>) => Promise<string | null>;
		onPickName: () => void;
	};
	let { interest, me, act, onPickName }: Props = $props();

	const GROUP_PICKS = ACTIVITIES.filter((a) => a.group);
	const OTHERS = ACTIVITIES.filter((a) => !a.group);

	let pending = $state<string | null>(null);
	let err = $state('');
	async function toggle(a: Activity) {
		if (!me) { onPickName(); return; }
		pending = a.id;
		const on = !(interest[a.id] ?? []).includes(me.id);
		err = (await act({ action: 'interest', person: me.id, activity: a.id, on })) ?? '';
		pending = null;
	}
	const names = (id: string) => (interest[id] ?? []).map((p) => person(p)?.tag ?? p);
	const votes = (id: string) => (interest[id] ?? []).length;
	const top = $derived(
		[...GROUP_PLANS, ...ACTIVITIES]
			.map((a) => ({ a, n: votes(a.id) }))
			.filter((x) => x.n > 0)
			.sort((x, y) => y.n - x.n)
			.slice(0, 5)
	);
	const groupLeader = $derived(
		GROUP_PICKS.map((a) => ({ a, n: votes(a.id) })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n)[0] ?? null
	);
</script>

{#snippet card(a: Activity)}
	{@const who = names(a.id)}
	{@const mine = !!me && (interest[a.id] ?? []).includes(me.id)}
	<article class="act" class:in={mine} class:pick={!!a.group} class:joke={a.joke}>
		{#if a.image}
			<div class="act-img">
				<img src={a.image} alt="" width="600" height="400" loading="lazy" />
				{#if a.group}<span class="ribbon">GROUP PICK</span>{/if}
			</div>
		{:else if a.icon}
			<p class="icon"><TripIcon name={a.icon} size={30} strokeWidth={1.75} /></p>
		{/if}
		<div class="act-body">
			<h4>{a.name}</h4>
			<p>{a.blurb}</p>
			{#if a.group}<p class="why">{a.group}</p>{/if}
			{#if a.price || a.minAge}<p class="meta">{[a.price, a.minAge].filter(Boolean).join(' · ')}</p>{/if}
			<button class="fancy" type="button" aria-pressed={mine} disabled={pending === a.id} onclick={() => toggle(a)}>
				{mine ? '✓ I’m in' : a.joke ? 'Count me in' : 'I’d be up for this'}
			</button>
			<p class="names">{who.length ? `${who.length} keen: ${who.join(', ')}` : 'Nobody yet'}</p>
		</div>
	</article>
{/snippet}

<section class="todo" id="do" aria-labelledby="do-title">
	<div class="wrap">
		<p class="eyebrow">THINGS TO DO</p>
		<h2 id="do-title">Who’s up <span>for what?</span></h2>
		<p class="section-intro">
			Tap the things you’d fancy doing. It’s not a booking, just a show of hands so we know what to book as a group.
			{#if me}You’re voting as <strong>{me.tag}</strong>.{:else}<button class="text-btn" type="button" onclick={onPickName}>Pick your name first</button>.{/if}
		</p>
		{#if err}<p class="bad" role="alert">{err}</p>{/if}

		{#if top.length}
			<ol class="leader" aria-label="Most popular so far">
				{#each top as t, i}<li><b>{i + 1}</b><span>{t.a.name}</span><em>{t.n}</em></li>{/each}
			</ol>
		{/if}

		<div class="budget">
			<div class="budget-head">
				<p class="eyebrow">ON THE GROUP BUDGET</p>
				<h3>One activity, <span>all of us.</span></h3>
				<p>There’s extra money in the pot for one group session. These six work for all thirteen of us and won’t break the bank. Vote for the ones you’d do, and the favourite gets booked when bookings open around Christmas.</p>
				{#if groupLeader}<p class="lead-now">Leading: <strong>{groupLeader.a.name}</strong> with {groupLeader.n} {groupLeader.n === 1 ? 'vote' : 'votes'}</p>{/if}
			</div>
			<div class="grid g3">{#each GROUP_PICKS as a (a.id)}{@render card(a)}{/each}</div>
		</div>

		<h3 class="sub">Our own plans</h3>
		<p class="sub-intro">Free, or nearly. Some more serious than others.</p>
		<div class="grid g4 plans">{#each GROUP_PLANS as a (a.id)}{@render card(a)}{/each}</div>

		<h3 class="sub">Also bookable at Whinfell</h3>
		<p class="sub-intro">Pay your own way. Most of these take 6–8, so we’d go in teams.</p>
		<div class="grid g4">{#each OTHERS as a (a.id)}{@render card(a)}{/each}</div>

		{#if KIDS.length}
			<div class="theo">
				<p class="eyebrow">FOR THEO</p>
				<h3>Theo’s corner</h3>
				<p>A few things for the smallest member of the group.</p>
				<ul>{#each KIDS as k}<li>{#if k.image}<img src={k.image} alt="" width="160" height="110" loading="lazy" />{/if}<div><b>{k.name}</b><span>{k.blurb}</span>{#if k.price}<em>{k.price}</em>{/if}</div></li>{/each}</ul>
			</div>
		{/if}
	</div>
</section>

<style>
	.todo { padding-block: 72px; background: var(--paper-2); border-block: 1px solid var(--line); scroll-margin-top: 10px; }
	.sub { font: italic 800 30px/1.15 var(--f-display); margin: 44px 0 0; }
	.sub-intro { font-size: 14px; color: var(--muted); margin: 2px 0 12px !important; }

	/* Fixed column counts: every list length divides evenly at each width. */
	.grid { display: grid; gap: 14px; }
	.g4 { grid-template-columns: repeat(4, 1fr); }
	.g3 { grid-template-columns: repeat(3, 1fr); }

	.act { background: var(--paper); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 160ms var(--ease); min-width: 0; }
	.act.in { box-shadow: inset 0 0 0 2px var(--moss); border-color: var(--moss); }
	.act-img { position: relative; }
	.act img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; background: #cfc6b0; }
	.ribbon { position: absolute; left: 10px; top: 10px; background: var(--sun); color: var(--ink); font: 600 10px var(--f-label); letter-spacing: .18em; padding: 5px 10px; border-radius: 999px; box-shadow: 0 4px 10px #0003; }
	.act-body { padding: 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
	.act h4 { margin: 0; font: 800 18px/1.2 var(--f-display); }
	.act p { font-size: 13px; color: var(--muted); }
	.act .meta { font-size: 12px; font-weight: 700; color: var(--moss); }
	.act .why { color: var(--ink); font-weight: 600; border-left: 2px solid var(--sun); padding-left: 10px; }
	.act .icon { display: flex; color: var(--moss); padding: 16px 14px 0; }
	.plans .act.joke .icon { color: var(--ember); }
	.fancy { margin-top: auto; min-height: 44px; border: 1px solid var(--ink); border-radius: 999px; background: var(--paper-2); font-weight: 800; font-size: 14px; }
	.fancy[aria-pressed=true] { background: var(--moss); border-color: var(--moss); color: #fff; }
	.names { font-size: 12px !important; min-height: 18px; }
	.plans .act { border-top: 3px solid var(--sun); }
	.plans .act.joke { border-top-color: var(--ember); background: #f3e9d8; }

	.budget { margin-top: 32px; padding: 28px; border-radius: 10px; background: radial-gradient(ellipse 50% 70% at 100% 0%, #d8a84926, transparent 70%), var(--pine); color: var(--paper); box-shadow: 0 24px 50px #4a0e1f40; }
	.budget-head { max-width: 760px; margin-bottom: 18px; }
	.budget .eyebrow { color: var(--sun); }
	.budget h3 { font: 800 clamp(30px, 4vw, 44px)/1.08 var(--f-display); margin-top: 8px; }
	.budget h3 span { color: var(--sun); font-style: italic; }
	.budget-head > p:not(.eyebrow) { font-size: 15px; color: #e4d6bf; margin-top: 10px; }
	.budget .lead-now { color: var(--paper) !important; }
	.budget .lead-now strong { color: var(--sun); }
	.budget .act { border-color: var(--pine); color: var(--ink); }

	.leader { list-style: none; padding: 0; margin: 20px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
	.leader li { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 14px; border-radius: 999px; background: var(--ink); color: var(--paper); font-size: 13px; font-weight: 700; }
	.leader b { font: italic 800 18px var(--f-display); color: var(--sun); }
	.leader em { font-style: normal; background: var(--sun); color: var(--ink); padding: 1px 8px; border-radius: 999px; font-weight: 800; }

	.theo { margin-top: 44px; padding: 28px; border-radius: 10px; background: #f1e8d6; border: 1px dashed var(--sun); }
	.theo .eyebrow { color: var(--gold-ink); }
	.theo h3 { font: 40px/1.1 var(--f-marker); font-weight: 400; color: var(--ember); margin-top: 6px; }
	.theo > p { font-size: 14px; color: var(--muted); }
	.theo ul { list-style: none; padding: 0; margin: 14px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
	.theo li { display: grid; grid-template-columns: 84px 1fr; gap: 12px; align-items: center; background: var(--paper-2); padding: 10px; border-radius: 6px; }
	.theo li:not(:has(img)) { grid-template-columns: 1fr; }
	.theo img { width: 84px; height: 60px; object-fit: cover; display: block; border-radius: 4px; }
	.theo li div { display: grid; gap: 2px; font-size: 13px; }
	.theo span { color: var(--muted); font-size: 12px; }
	.theo em { font-style: normal; font-size: 12px; font-weight: 700; color: var(--gold-ink); }
	.bad { color: #a3361a; font-weight: 700; margin-top: 8px; }

	@media (max-width: 1000px) {
		.g4 { grid-template-columns: repeat(3, 1fr); }
	}
	@media (max-width: 760px) {
		.todo { padding-block: 52px; }
		.theo ul { grid-template-columns: 1fr 1fr; gap: 10px; }
		.act-body { padding: 12px; }
		.budget { padding: 22px 14px 8px; }
	}
	/* phones: each list is a row you swipe through, like an app shelf */
	@media (max-width: 720px) {
		.grid { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 76%; gap: 12px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scroll-padding-inline: 16px; margin-inline: -16px; padding: 4px 16px 16px; scrollbar-width: none; }
		.grid::-webkit-scrollbar { display: none; }
		.grid > :global(*) { scroll-snap-align: start; }
		.budget .grid { margin-inline: -14px; padding-inline: 14px; scroll-padding-inline: 14px; }
		.plans { grid-auto-columns: 62%; }
		.sub-intro::after { content: ' Swipe for more.'; color: var(--gold-ink); font-weight: 700; }
		.leader { flex-wrap: nowrap; overflow-x: auto; margin-inline: -16px; padding-inline: 16px; scrollbar-width: none; }
		.leader li { flex-shrink: 0; }
	}
	@media (max-width: 420px) { .theo ul { grid-template-columns: 1fr; } }
</style>

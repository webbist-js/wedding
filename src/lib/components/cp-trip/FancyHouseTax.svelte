<script lang="ts">
	// The Great Cost-Sharing Debate. The calculator on the left is a toy: it
	// never touches what anyone owes. The panel on the right is the real thing:
	// pledges from the chipping-in couples, House 1's approvals, and Alex
	// publishing an agreed split.
	import Money from './Money.svelte';
	import {
		GROUPS, CONTRIBUTORS, RELIEF_GROUPS, RELIEF_ADULTS, ORIGINAL, NO_CONTRIBUTIONS, MAX_CONTRIBUTION_PENCE, STEP_PENCE,
		breakdown, deltas, lineFor, group, gbp, gbpShort, poundsToPence, proposalSummary, isContributor, isReliefGroup,
		type Contributions, type ContributorId, type GroupId, type ProposalStatus, type Agreement, type Consent
	} from '$lib/cp-trip';

	type Props = {
		status: ProposalStatus;
		agreed: Agreement;
		consents: Consent[];
		myGroup: GroupId | null;
		organiser: boolean;
		act: (body: Record<string, unknown>) => Promise<string | null>;
		onPickName: () => void;
	};
	let { status, agreed, consents, myGroup, organiser, act, onPickName }: Props = $props();

	// ---- the calculator (local only) ----
	const blank = <T,>(v: T) => Object.fromEntries(CONTRIBUTORS.map((id) => [id, v])) as Record<ContributorId, T>;
	let amounts = $state<Contributions>({ ...NO_CONTRIBUTIONS });
	let typed = $state<Record<ContributorId, string>>(blank(''));
	let typedError = $state<Record<ContributorId, string>>(blank(''));
	const proposed = $derived(breakdown(amounts));
	const change = $derived(deltas(proposed));
	const untouched = $derived(proposed.pot === 0);
	const presets = [0, 1_000, 2_500, 5_000, 7_500];

	const clamp = (p: number) => Math.min(MAX_CONTRIBUTION_PENCE, Math.max(0, p));
	function nudge(id: ContributorId, by: number) {
		amounts[id] = clamp(Math.round((amounts[id] + by) / STEP_PENCE) * STEP_PENCE);
		typed[id] = '';
		typedError[id] = '';
	}
	function setTo(id: ContributorId, pence: number) {
		amounts[id] = pence;
		typed[id] = '';
		typedError[id] = '';
	}
	function applyTyped(id: ContributorId) {
		const raw = typed[id];
		if (!raw.trim()) { typedError[id] = ''; return; }
		const p = poundsToPence(raw);
		if (p === null) typedError[id] = 'Enter an amount like 12 or 12.50. No negatives.';
		else if (p > MAX_CONTRIBUTION_PENCE) typedError[id] = `Let’s keep it under ${gbpShort(MAX_CONTRIBUTION_PENCE)}.`;
		else { amounts[id] = p; typedError[id] = ''; }
	}
	function reset() {
		amounts = { ...NO_CONTRIBUTIONS };
		typed = blank('');
		typedError = blank('');
	}

	// Whose numbers you see: your own, unless you're Alex signed in as organiser.
	const seeAll = $derived(organiser);
	type Role = 'all' | 'none' | 'giver' | 'receiver' | 'out';
	const role = $derived<Role>(seeAll ? 'all' : !myGroup ? 'none' : isContributor(myGroup) ? 'giver' : isReliefGroup(myGroup) ? 'receiver' : 'out');
	const sliderGroups = $derived(role === 'giver' ? CONTRIBUTORS.filter((id) => id === myGroup) : CONTRIBUTORS);
	const tableGroups = $derived(seeAll ? GROUPS : GROUPS.filter((g) => g.id === myGroup));
	const showCalc = $derived(role === 'all' || role === 'giver' || role === 'receiver');
	const needed = CONTRIBUTORS.length + RELIEF_GROUPS.length;
	const answered = $derived(CONTRIBUTORS.filter((id) => status.pledges[id] !== null).length + RELIEF_GROUPS.filter((id) => status.approvals[id] === 'approved').length);

	const changeWords = (id: GroupId, d: number) =>
		d === 0 ? 'No change' : isContributor(id) ? `Chips in ${gbp(d)}` : `Saves ${gbp(-d)}`;

	// ---- sharing ----
	let shareMsg = $state('');
	async function share() {
		const text = proposalSummary(amounts);
		try {
			if (navigator.share) await navigator.share({ title: 'Fancy House Tax idea', text });
			else { await navigator.clipboard.writeText(text); shareMsg = 'Copied. Paste it in the group chat.'; }
		} catch {
			try { await navigator.clipboard.writeText(text); shareMsg = 'Copied. Paste it in the group chat.'; } catch { shareMsg = 'Couldn’t copy on this device.'; }
		}
	}

	// ---- consensus (server) ----
	let busy = $state(false);
	let err = $state('');
	async function run(body: Record<string, unknown>) {
		busy = true;
		err = (await act(body)) ?? '';
		busy = false;
	}
	const mine = $derived(myGroup ? consents.find((c) => c.group === myGroup) ?? null : null);
	const tableAmounts = $derived(status.proposal);
	const myProposedTotal = $derived(myGroup && tableAmounts ? lineFor(breakdown(tableAmounts), myGroup).total : null);
	const agreedIsOriginal = $derived(agreed.version === 0);
	function loadTable() {
		if (!tableAmounts) return;
		amounts = seeAll ? { ...tableAmounts } : { ...NO_CONTRIBUTIONS, [myGroup as ContributorId]: tableAmounts[myGroup as ContributorId] };
		document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<section class="fht" id="debate" aria-labelledby="fht-title">
	<div class="wrap">
		<p class="eyebrow">THE GREAT COST-SHARING DEBATE</p>
		<h2 id="fht-title">Should we share the <span>Fancy House Tax?</span></h2>

		<div class="intro">
			<div class="letter">
				<p class="dear">Dear all,</p>
				<p>House 1 is considerably more expensive because it’s got all the fun stuff, and realistically we’ll probably spend most of our time there.</p>
				<p>Obviously, the other houses were chosen to keep costs down, and everyone’s already paying for their own accommodation. But if the people in House 2 are happy to chip in a little towards the communal facilities, we could bring House 1 down slightly for everyone staying in it. Oli & Phoebe have moved to House 3, but they’re welcome to chip in too if they’d like to.</p>
				<p>Absolutely no pressure — I didn’t want to make that decision for anyone. So let’s see what everyone thinks!</p>
				<p>Chris, Hayley and Theo are completely excluded from this. They’ve got their own family setup to worry about.</p>
				<p class="sig">Alex</p>
			</div>

			<aside class="how" aria-label="How it would work">
				<p class="how-h">How it would work</p>
				<ol class="lanes">
					<li class="lane give" class:me={role === 'giver'}>
						<span class="tag">Chip in</span>
						<span class="names">Chris & Jenn · Adam & Lysanne<br />Oli & Phoebe</span>
						<small>If they’d like to. £0 is fine.</small>
					</li>
					<li class="lane save" class:me={role === 'receiver'}>
						<span class="tag">Save</span>
						<span class="names">Everyone in House 1</span>
						<small>Kie & Elisa, Alex & Katie and Mule, shared per person</small>
					</li>
					<li class="lane same" class:me={role === 'out'}>
						<span class="tag">No change</span>
						<span class="names">Chris & Hayley & Theo</span>
						<small>Shares stay exactly as they are</small>
					</li>
				</ol>
				<div class="yours">
					<p class="how-h">Your part</p>
					{#if role === 'none'}
						<p>Pick your name to see what this means for you.</p>
						<button class="btn gold" type="button" onclick={onPickName}>Who are you?</button>
					{:else if role === 'all'}
						<p>Organiser view: you can see every couple’s numbers below.</p>
					{:else if role === 'giver'}
						<p>Entirely your call. Try amounts in the calculator below, then tell us what you’d be happy with. £0 is a perfectly good answer.</p>
					{:else if role === 'receiver'}
						<p>Once all three chipping-in couples have answered, you’ll see your new share and can say yes to it.</p>
					{:else}
						<p>{group(myGroup as GroupId).house === 'h3' ? 'None of this touches House 3.' : 'This doesn’t change what you pay.'} Your share stays at <strong>{gbp(lineFor(ORIGINAL, myGroup as GroupId).total)}</strong> whatever happens.</p>
					{/if}
				</div>
			</aside>
		</div>

		{#if showCalc}
		<div class="calc" id="calc">
			<p class="stamp" aria-hidden="true">JUST PLAYING</p>
			<div class="calc-head">
				<h3>The “what if” machine</h3>
				<p>Play with the numbers. <strong>This doesn’t change what anyone owes</strong> — it’s a sketch, not a bill. Amounts are per couple, for the whole trip.</p>
			</div>

			<div class="sliders" class:one={sliderGroups.length === 1}>
				{#each sliderGroups as id}
					{@const g = group(id)}
					<div class="slider" class:mine={myGroup === id}>
						<p class="who">{g.label}{#if myGroup === id}<span class="you">you</span>{/if}</p>
						<p class="amt"><Money pence={amounts[id]} /><small>extra, whole trip</small></p>
						<div class="step">
							<button type="button" onclick={() => nudge(id, -STEP_PENCE)} disabled={amounts[id] === 0} aria-label={`£5 less from ${g.label}`}>−£5</button>
							<input
								type="range" min="0" max={20_000} step={STEP_PENCE}
								value={Math.min(amounts[id], 20_000)}
								oninput={(e) => setTo(id, Number(e.currentTarget.value))}
								aria-label={`${g.label}’s extra contribution`}
								aria-valuetext={gbp(amounts[id])}
							/>
							<button type="button" onclick={() => nudge(id, STEP_PENCE)} disabled={amounts[id] >= MAX_CONTRIBUTION_PENCE} aria-label={`£5 more from ${g.label}`}>+£5</button>
						</div>
						<div class="presets" role="group" aria-label={`Quick amounts for ${g.label}`}>
							{#each presets as p}<button type="button" aria-pressed={amounts[id] === p} onclick={() => setTo(id, p)}>{gbpShort(p)}</button>{/each}
						</div>
						<form class="custom" onsubmit={(e) => { e.preventDefault(); applyTyped(id); }}>
							<label for={`custom-${id}`}>Or type an amount</label>
							<div><span>£</span><input id={`custom-${id}`} inputmode="decimal" placeholder="e.g. 32.50" bind:value={typed[id]} onblur={() => applyTyped(id)} /><button type="submit">Set</button></div>
							{#if typedError[id]}<p class="bad" role="alert">{typedError[id]}</p>{/if}
						</form>
					</div>
				{/each}
			</div>

			<div class="flow" class:moving={!untouched} aria-live="polite">
				<div class="end h2"><span>CHIPPING IN</span><b>together <Money pence={proposed.pot} /></b></div>
				<div class="pipe" aria-hidden="true">
					{#each Array(6) as _, i}<i style:animation-delay={`${i * 0.35}s`}>£</i>{/each}
				</div>
				<div class="end h1"><span>HOUSE 1</span><b>saves <Money pence={proposed.pot} /></b></div>
				<p class="per">{untouched ? 'Nothing moving yet. Everyone pays the original costs.' : `That’s about ${gbp(Math.round(proposed.pot / RELIEF_ADULTS))} off per person in House 1.`}</p>
			</div>

			<div class="table-wrap">
				<table>
					<caption class="sr">Original and proposed amount per group</caption>
					<thead><tr><th scope="col">Who</th><th scope="col">Original</th><th scope="col">If we did this</th><th scope="col">Difference</th></tr></thead>
					<tbody>
						{#each tableGroups as g}
							{@const d = change[g.id]}
							<tr class:you={myGroup === g.id} class:locked={g.house === 'h3'}>
								<th scope="row">{g.label}<small>House {g.house.slice(1)}{g.house === 'h3' ? ' · never changes' : ''}</small></th>
								<td>{gbp(lineFor(ORIGINAL, g.id).total)}</td>
								<td><b><Money pence={lineFor(proposed, g.id).total} /></b></td>
								<td class="d" class:up={d > 0} class:down={d < 0}><Money pence={d} sign /><small>{changeWords(g.id, d)}</small></td>
							</tr>
						{/each}
					</tbody>
					{#if seeAll}<tfoot><tr><th scope="row">Everyone</th><td>{gbp(ORIGINAL.total)}</td><td><b>{gbp(proposed.total)}</b></td><td>Still adds up ✓</td></tr></tfoot>{/if}
				</table>
			</div>
			<p class="fine">
				{#if seeAll}
					Everyone in House 1 gets the same slice per person: couples get two, Mule one. The empty places, the Big House Tax, Alex & Katie’s £79 of gym and bikes, and the £100 gifts all stay as they are.
				{:else}
					This only shows your numbers. Any saving is shared per person across everyone in House 1.
				{/if}
				{#if seeAll && proposed.rounding.length}Pennies that don’t split evenly go to {proposed.rounding.map((id) => group(id).label).join(' and ')}, so the total stays exactly {gbp(ORIGINAL.total)}.{/if}
			</p>

			<div class="calc-actions">
				<button class="btn primary" type="button" onclick={reset} disabled={untouched}>↺ Reset to Original Costs</button>
				<button class="btn" type="button" onclick={share}>Share this idea</button>
				{#if shareMsg}<span class="fine" role="status">{shareMsg}</span>{/if}
			</div>
		</div>

		{/if}

		<!-- The real decision -->
		<div class="vote" aria-labelledby="vote-title">
			<div class="vote-head">
				<p class="eyebrow">WHAT’S ACTUALLY DECIDED</p>
				<h3 id="vote-title">{agreedIsOriginal ? 'Right now: the original costs.' : `Agreed: split no. ${agreed.version}`}</h3>
				<p>
					{#if agreedIsOriginal}
						Nobody has agreed to change anything, so everyone pays the original amounts. It only changes if <strong>Chris & Jenn, Adam & Lysanne and Oli & Phoebe each say what they’d chip in</strong>, <strong>everyone in House 1 says yes to those exact amounts</strong>, and Alex then publishes it. Saying nothing counts as no.
					{:else}
						{#if seeAll}{CONTRIBUTORS.map((id) => `${group(id).label} ${gbp(agreed.contributions[id])}`).join(', ')}.
						{:else if role === 'giver'}You agreed to chip in {gbp(agreed.contributions[myGroup as ContributorId])}.
						{:else if role === 'receiver'}Your share comes down to {gbp(lineFor(breakdown(agreed.contributions), myGroup as GroupId).total)}.
						{:else if myGroup}Your share doesn’t change.{/if}
						Published {new Date(agreed.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. The payments below use this.
					{/if}
				</p>
			</div>

			<div class="progress">
				<p><b>{answered} of {needed}</b> answered</p>
				<div class="meter" aria-hidden="true"><i style:width={`${(answered / needed) * 100}%`}></i></div>
			</div>

			<ul class="board">
				{#each CONTRIBUTORS as id}
					{@const p = status.pledges[id]}
					<li class:ok={p !== null} class:me={myGroup === id}>
						<span class="dot" aria-hidden="true"></span>
						<span class="g">{group(id).label}<small>House {group(id).house.slice(1)} · their offer</small></span>
						<span class="s">{p === null ? 'Hasn’t said yet' : !(seeAll || id === myGroup) ? 'Has answered' : p === 0 ? 'Would rather not (£0)' : `Happy to chip in ${gbp(p)}`}</span>
					</li>
				{/each}
				{#each RELIEF_GROUPS as id}
					{@const a = status.approvals[id]}
					<li class:ok={a === 'approved'} class:stale={a === 'outdated'} class:me={myGroup === id}>
						<span class="dot" aria-hidden="true"></span>
						<span class="g">{group(id).label}<small>House 1 · their yes</small></span>
						<span class="s">{a === 'approved' ? 'Said yes' : a === 'outdated' ? 'Said yes to older amounts' : 'Hasn’t said yet'}</span>
					</li>
				{/each}
			</ul>

			{#if tableAmounts && seeAll}
				<p class="table-now">On the table: {CONTRIBUTORS.map((id) => `${group(id).label} ${gbp(tableAmounts[id])}`).join(' · ')} <button class="text-btn" type="button" onclick={loadTable}>See it in the calculator</button></p>
			{/if}

			{#if myGroup && (isContributor(myGroup) || isReliefGroup(myGroup))}
			<div class="mine-box">
				<p class="how-h">Your answer</p>
				{#if isContributor(myGroup)}
					{@const myPledge = mine?.pledge ?? null}
					<p><strong>Your call, {group(myGroup).label}.</strong> Only you can set this. Use the calculator above, then:</p>
					<div class="row">
						<button class="btn primary" type="button" disabled={busy} onclick={() => run({ action: 'pledge', group: myGroup, pence: amounts[myGroup as ContributorId] })}>
							{amounts[myGroup as ContributorId] === 0 ? 'We’d rather not chip in (£0)' : `We’re happy to chip in ${gbp(amounts[myGroup as ContributorId])}`}
						</button>
						{#if myPledge !== null}<button class="btn" type="button" disabled={busy} onclick={() => run({ action: 'pledge', group: myGroup, pence: null })}>Take back our answer</button>{/if}
					</div>
					<p class="fine">{myPledge === null ? 'You haven’t answered yet.' : `You said ${gbp(myPledge)}.`} Changing it means House 1 has to say yes again. Nothing is owed until Alex publishes an agreed split.</p>
				{:else if isReliefGroup(myGroup)}
					<p><strong>{group(myGroup).label}:</strong> {#if !tableAmounts}nothing to approve yet. The chipping-in couples need to say what they’d be happy with first.{:else}you’d pay <b>{gbp(myProposedTotal ?? 0)}</b> instead of {gbp(lineFor(ORIGINAL, myGroup).total)}.{/if}</p>
					{#if tableAmounts}
						<div class="row">
							<button class="btn primary" type="button" disabled={busy || status.approvals[myGroup] === 'approved'} onclick={() => run({ action: 'approve', group: myGroup, amounts: tableAmounts })}>
								{status.approvals[myGroup] === 'approved' ? '✓ You said yes' : 'Yes, we agree to this'}
							</button>
							{#if mine?.approved}<button class="btn" type="button" disabled={busy} onclick={() => run({ action: 'approve', group: myGroup, amounts: null })}>Take back our yes</button>{/if}
						</div>
					{/if}
				{/if}
				{#if err}<p class="bad" role="alert">{err}</p>{/if}
			</div>
			{/if}

			{#if organiser}
				<div class="org">
					<p class="eyebrow">ORGANISER</p>
					{#if status.ready && !status.matchesAgreed}
						<p>Everyone has said yes. Publishing makes this the amount people owe.</p>
						<button class="btn primary" type="button" disabled={busy} onclick={() => run({ action: 'publish' })}>Publish this split</button>
					{:else if status.matchesAgreed}
						<p>The amounts on the table already match the agreed split.</p>
					{:else}
						<p>Can’t publish yet. Waiting on: {status.waitingOn.map((id) => group(id).label).join(', ')}.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.fht { background: radial-gradient(ellipse 50% 60% at 100% 0%, #6b142666, transparent 70%), var(--pine); color: var(--paper); padding-block: 80px; scroll-margin-top: 10px; }
	.fht .wrap > .eyebrow { color: var(--sun); }
	.fht h2 span { color: var(--sun); }

	/* the letter and how it would work */
	.intro { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 24px; margin-top: 28px; align-items: start; }
	.letter { position: relative; padding: 32px 34px 28px; background: var(--paper); color: var(--ink); border-radius: 4px; display: grid; gap: 12px; font-size: 16px; line-height: 1.7; box-shadow: 0 24px 50px #12030766; }
	.letter::before { content: ''; position: absolute; inset: 8px; border: 1px solid var(--line); border-radius: 2px; pointer-events: none; }
	.letter .dear { font: italic 700 22px var(--f-display); }
	.letter .sig { font: 34px/1 var(--f-marker); color: var(--ember); margin-top: 4px; transform: rotate(-3deg); transform-origin: left; }

	.how { padding: 24px; border: 1px solid #d8a84966; border-radius: 8px; background: #ffffff08; display: grid; gap: 16px; }
	.how-h { font: 600 11px var(--f-label); letter-spacing: .22em; text-transform: uppercase; color: var(--sun); }
	.lanes { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
	.lane { display: grid; grid-template-columns: 96px 1fr; column-gap: 14px; row-gap: 2px; align-items: start; padding: 14px; border-radius: 6px; background: #ffffff0a; border: 1px solid transparent; }
	.lane .tag { grid-row: span 2; align-self: center; justify-self: start; padding: 5px 10px; border-radius: 999px; font: 700 11px var(--f-body); letter-spacing: .06em; text-transform: uppercase; }
	.lane .names { font: 700 16px/1.35 var(--f-display); }
	.lane small { grid-column: 2; font-size: 12px; color: #d9c9b0; }
	.give .tag { background: var(--sun); color: var(--ink); }
	.save .tag { background: #3a6e4b; color: #fff; }
	.same .tag { background: #ffffff1f; color: var(--paper); }
	.lane.me { border-color: var(--sun); background: #d8a8491a; }
	.yours { border-top: 1px solid #d8a84944; padding-top: 16px; display: grid; gap: 10px; font-size: 15px; }
	.yours strong { color: #f3d58f; }
	.yours .btn { justify-self: start; }

	.calc { position: relative; margin-top: 28px; background: var(--paper); color: var(--ink); padding: 28px; border-radius: 8px; box-shadow: 0 24px 50px #12030766; scroll-margin-top: 16px; }
	.stamp { position: absolute; top: 22px; right: 22px; transform: rotate(4deg); border: 1px solid var(--ember); outline: 1px solid var(--ember); outline-offset: 2px; border-radius: 4px; color: var(--ember); padding: 6px 10px; font: 600 11px/1 var(--f-label); letter-spacing: .2em; }
	.calc-head { max-width: 560px; padding-right: 120px; }
	.calc-head h3 { font: 800 30px/1.1 var(--f-display); }
	.calc-head p { font-size: 14px; color: var(--muted); margin-top: 6px; }
	.sliders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 22px; } /* 3 couples, or just yours */
	.sliders.one { grid-template-columns: minmax(0, 560px); }
	.slider { border: 1px solid var(--line); border-radius: 6px; background: var(--paper-2); padding: 20px; display: grid; gap: 12px; }
	.slider.mine { border-color: var(--sun); box-shadow: 0 0 0 1px var(--sun); }
	.who { font-weight: 800; font-size: 15px; display: flex; gap: 8px; align-items: center; }
	.you { font: 600 9px var(--f-label); letter-spacing: .16em; text-transform: uppercase; background: var(--ember); color: #fff; padding: 3px 8px; border-radius: 999px; }
	.amt { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
	.amt :global(.money) { font: 800 52px/1 var(--f-display); color: var(--ember); font-variant-numeric: lining-nums; }
	.amt small { font-size: 12px; color: var(--muted); }
	.step { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; }
	.step button { min-width: 56px; min-height: 44px; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); font-weight: 800; }
	.step input { width: 100%; accent-color: var(--ember); min-height: 44px; }
	.presets { display: flex; flex-wrap: wrap; gap: 6px; }
	.presets button { min-height: 38px; padding: 4px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); font-weight: 700; font-size: 13px; }
	.presets button[aria-pressed=true] { background: var(--ember); color: #fff; border-color: var(--ember); }
	.custom label { font-size: 12px; font-weight: 700; color: var(--muted); }
	.custom div { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
	.custom span { font-weight: 800; }
	.custom input { width: 120px; min-height: 40px; border: 1px solid var(--line); background: var(--paper); padding: 6px 12px; border-radius: 6px; }
	.custom button { min-height: 40px; border: 1px solid var(--ink); border-radius: 999px; background: var(--paper); font-weight: 800; padding: 0 16px; }
	.bad { color: #a3361a; font-size: 13px; font-weight: 700; margin-top: 6px; }

	.flow { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; margin-top: 22px; padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper-2); }
	.end { display: grid; gap: 4px; text-align: center; padding: 12px 16px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); }
	.end span { font: 600 10px var(--f-label); letter-spacing: .18em; }
	.end b { font-size: 13px; }
	.end.h1 { background: var(--moss); color: #fff; border-color: var(--moss); }
	.pipe { position: relative; height: 34px; border-block: 2px solid var(--line); overflow: hidden; }
	.pipe i { position: absolute; top: 50%; left: -24px; width: 24px; height: 24px; margin-top: -12px; border-radius: 50%; background: var(--sun); color: var(--ink); font: 800 12px/24px var(--f-body); text-align: center; font-style: normal; opacity: 0; }
	.moving .pipe i { animation: coin 2.1s linear infinite; }
	@keyframes coin { 0% { left: -24px; opacity: 1; } 90% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
	.per { grid-column: 1 / -1; font-size: 14px; font-weight: 700; text-align: center; }

	.table-wrap { overflow-x: auto; margin-top: 20px; border: 1px solid var(--line); border-radius: 8px; }
	table { width: 100%; border-collapse: collapse; font-size: 14px; background: var(--paper-2); }
	th, td { text-align: right; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
	th[scope=row], thead th:first-child { text-align: left; }
	thead th { background: var(--ink); color: var(--paper); font: 600 10px var(--f-label); letter-spacing: .18em; text-transform: uppercase; white-space: nowrap; }
	th small, td small { display: block; font-size: 11px; font-weight: 500; color: var(--muted); }
	tr.you th { box-shadow: inset 3px 0 0 var(--sun); }
	tr.locked { background: #f3e9d8; }
	td.d { white-space: nowrap; font-weight: 800; }
	td.up { color: var(--ember); }
	td.down { color: var(--moss); }
	tfoot th, tfoot td { font-weight: 800; border-bottom: 0; border-top: 1px solid var(--ink); }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
	.calc-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 18px; }
	.calc .fine { color: var(--muted); }

	.vote { margin-top: 24px; background: var(--paper-2); color: var(--ink); padding: 28px; border-radius: 8px; box-shadow: 0 24px 50px #12030766; }
	.vote-head h3 { font: 800 30px/1.1 var(--f-display); margin-top: 8px; }
	.vote-head p { font-size: 15px; margin-top: 8px; max-width: 760px; color: var(--muted); }
	.vote-head p strong { color: var(--ink); }
	.vote .eyebrow { color: var(--ember); }
	.progress { display: flex; align-items: center; gap: 14px; margin-top: 20px; font-size: 14px; }
	.progress b { font: 800 18px var(--f-display); }
	.meter { flex: 1; max-width: 320px; height: 6px; border-radius: 999px; background: var(--line); overflow: hidden; }
	.meter i { display: block; height: 100%; background: var(--moss); border-radius: inherit; transition: width 400ms var(--ease); }
	.board { list-style: none; padding: 0; margin: 14px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; } /* 3 answers: 3 across, then 1 × 3 */
	.board li { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 6px; align-items: center; padding: 14px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); }
	.board li.me { border-color: var(--sun); box-shadow: 0 0 0 1px var(--sun); }
	.dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--sun); }
	.ok .dot { background: var(--moss); border-color: var(--moss); }
	.stale .dot { background: var(--sun); }
	.board .g { font-weight: 800; font-size: 15px; display: grid; }
	.board .g small { font: 600 10px var(--f-label); letter-spacing: .14em; text-transform: uppercase; color: var(--gold-ink); margin-top: 2px; }
	.board .s { grid-column: 1 / -1; font-size: 13px; color: var(--muted); border-top: 1px dotted var(--line); padding-top: 8px; }
	.board .ok .s { color: var(--moss); font-weight: 700; }
	.table-now { margin-top: 14px; font-size: 14px; font-weight: 700; }
	.mine-box { margin-top: 16px; padding: 18px 20px; border-radius: 6px; border-left: 3px solid var(--sun); background: var(--paper); display: grid; gap: 10px; font-size: 15px; }
	.mine-box .how-h { color: var(--gold-ink); }
	@media (max-width: 960px) { .intro { grid-template-columns: 1fr; } }
	@media (max-width: 1000px) { .sliders { grid-template-columns: 1fr; } .sliders.one { grid-template-columns: minmax(0, 560px); } }
	@media (max-width: 520px) { .board { grid-template-columns: 1fr; } .letter { padding: 24px 22px 22px; } .lane { grid-template-columns: 1fr; } .lane .tag { grid-row: auto; } .lane small { grid-column: 1; } }
	.row { display: flex; flex-wrap: wrap; gap: 10px; }
	.org { margin-top: 14px; padding: 16px 18px; border-radius: 6px; background: var(--ink); color: var(--paper); display: grid; gap: 8px; font-size: 14px; }
	.org .eyebrow { color: var(--sun); }

	@media (max-width: 760px) {
		.fht { padding-block: 52px; }
		.calc, .vote { padding: 20px 16px; }
		.calc-head { padding-right: 0; }
		.stamp { position: static; display: inline-block; margin-bottom: 10px; }
		.sliders { grid-template-columns: 1fr; }
		.flow { grid-template-columns: 1fr; }
		.pipe { height: 54px; width: 34px; justify-self: center; border-block: 0; border-inline: 2px solid var(--line); }
		.pipe i { left: 50%; margin-left: -12px; top: -24px; margin-top: 0; }
		.moving .pipe i { animation-name: coin-down; }
		@keyframes coin-down { 0% { top: -24px; opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
		th, td { padding: 9px 8px; font-size: 13px; }
	}
	@media (prefers-reduced-motion: reduce) { .moving .pipe i { animation: none; opacity: 1; left: calc(50% - 12px); top: 50%; } }
</style>

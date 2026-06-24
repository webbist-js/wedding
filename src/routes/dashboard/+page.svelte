<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Pill from '$lib/components/Pill.svelte';
  let { data } = $props();

  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gbp0 = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });

  let days = $state(0);
  $effect(() => {
    days = Math.max(0, Math.ceil((new Date(data.weddingISO).getTime() - Date.now()) / 86400000));
  });

  let b = $derived(data.budget);
  const pctOf = (n: number) => (b.target > 0 ? Math.min(100, (n / b.target) * 100) : 0);

  let invited = $derived(data.summary.total);
  let yes = $derived(data.summary.rsvpYes);
  let awaiting = $derived(Math.max(0, invited - yes));
  let rsvpPct = $derived(invited > 0 ? (yes / invited) * 100 : 0);

  let donePct = $derived(data.progress.total > 0 ? (data.progress.done / data.progress.total) * 100 : 0);

  // Circle geometry for the rings.
  const R = 42;
  const C = 2 * Math.PI * R;
  const dash = (pct: number) => `${(pct / 100) * C} ${C}`;
</script>

{#snippet ring(pct: number, big: string, small: string, color: string)}
  <div class="ring">
    <svg viewBox="0 0 100 100" width="120" height="120">
      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" stroke-width="7" />
      <circle cx="50" cy="50" r={R} fill="none" stroke={color} stroke-width="7" stroke-linecap="round"
        stroke-dasharray={dash(pct)} transform="rotate(-90 50 50)" />
    </svg>
    <div class="ring-c"><span class="rb">{big}</span><span class="rs">{small}</span></div>
  </div>
{/snippet}

<!-- Stat row -->
<div class="stats">
  <div class="stat hero">
    <div class="v">{days}</div>
    <div class="l">Days to go</div>
  </div>
  <div class="stat"><div class="v">{data.summary.total}</div><div class="l">Total guests</div></div>
  <div class="stat"><div class="v">{data.summary.day} / {data.summary.evening}</div><div class="l">Day / evening</div></div>
  <div class="stat"><div class="v sage">{data.summary.rsvpYes}</div><div class="l">RSVP'd yes</div></div>
  <div class="stat"><div class="v">{gbp0(b.confirmed)}</div><div class="l">Confirmed spend</div></div>
</div>

<Alert title="Notice of marriage — timing matters">
  You give notice at <b>Bradford &amp; Keighley Register Office</b> (City Hall, BD1 1HY), not North Yorkshire.
  Bradford won't let you book until you're <b>within 6 months of the wedding</b> — so book from <b>early October 2026</b>.
</Alert>

<div class="cols">
  <!-- Budget at a glance -->
  <section class="panel">
    <div class="phead"><h3>Budget at a glance</h3><a href="/dashboard/budget">Open →</a></div>
    <div class="bignum">{gbp(b.confirmed)}</div>
    <p class="sub">
      confirmed of {gbp(b.target)} target —
      {#if b.remaining >= 0}<span class="down">{gbp(b.remaining)} remaining</span>
      {:else}<span class="up">{gbp(-b.remaining)} over budget</span>{/if}
    </p>
    <div class="bar">
      <span style={`width:${pctOf(b.paid)}%`} class="s1"></span>
      <span style={`width:${pctOf(Math.max(0, b.confirmed - b.paid))}%`} class="s3"></span>
    </div>
    <div class="legend">
      <span><i class="d1"></i> Paid <b>{gbp(b.paid)}</b></span>
      <span><i class="d3"></i> Confirmed <b>{gbp(b.confirmed)}</b></span>
      <span><i class="d4"></i> Target <b>{gbp(b.target)}</b></span>
    </div>
  </section>

  <!-- RSVPs -->
  <section class="panel">
    <div class="phead"><h3>RSVPs</h3><a href="/dashboard/guests">Open →</a></div>
    <div class="ring-row">
      {@render ring(rsvpPct, String(yes), 'replied yes', 'var(--sage)')}
      <ul class="kv">
        <li><span>Confirmed yes</span><b>{yes}</b></li>
        <li><span>Awaiting reply</span><b>{awaiting}</b></li>
        <li><span>Total invited</span><b>{invited}</b></li>
      </ul>
    </div>
  </section>
</div>

<div class="cols">
  <!-- Planning progress -->
  <section class="panel">
    <div class="phead"><h3>Planning progress</h3></div>
    <div class="ring-row">
      {@render ring(donePct, `${Math.round(donePct)}%`, 'complete', 'var(--tan)')}
      <div class="prog">
        <p class="pcount"><b>{data.progress.done}</b> of {data.progress.total} tasks done</p>
        <ul class="dots">
          {#each data.progress.next as t}<li>{t.label}</li>{/each}
        </ul>
      </div>
    </div>
  </section>

  <!-- Booked so far -->
  <section class="panel">
    <div class="phead"><h3>Booked so far</h3><a href="/dashboard/suppliers">All suppliers →</a></div>
    {#if data.booked.length}
      <ul class="booked">
        {#each data.booked as b}
          <li>
            <div><span class="bcat">{b.category}</span>{#if b.name}<span class="bname">{b.name}</span>{/if}</div>
            <Pill tone="green">Booked</Pill>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">Nothing booked yet.</p>
    {/if}
  </section>
</div>

<!-- Priority next steps -->
<section class="panel priority">
  <div class="phead"><h3>Priority next steps</h3></div>
  {#if data.priority.length}
    <div class="pgrid">
      {#each data.priority as p}
        <div class="pitem"><span class="pdot"></span><span><b>{p.label}</b>{#if p.phase}<span class="pphase"> · {p.phase}</span>{/if}</span></div>
      {/each}
    </div>
  {:else}
    <p class="empty">All caught up — nothing outstanding.</p>
  {/if}
</section>

<style>
  /* Stat row */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 18px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; }
  .stat .v { font-family: var(--serif); font-weight: 600; font-size: 34px; color: var(--ink); line-height: 1; }
  .stat .v.sage { color: var(--sage); }
  .stat .l { font-weight: 600; letter-spacing: .14em; text-transform: uppercase; font-size: 10px; color: var(--muted); margin-top: 8px; }
  .stat.hero { background: var(--sage); border-color: var(--sage); }
  .stat.hero .v { color: #fff; }
  .stat.hero .l { color: rgba(255,255,255,.82); }

  /* Two-column panels */
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  @media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
  .panel { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 22px 24px; }
  .phead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
  .phead h3 { font-family: var(--sans); font-weight: 600; letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0; }
  .phead a { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--faint); text-decoration: none; font-weight: 600; }
  .phead a:hover { color: var(--sage-deep); }

  .bignum { font-family: var(--serif); font-weight: 600; font-size: 46px; line-height: 1; color: var(--ink); }
  .sub { margin: 8px 0 16px; font-size: 13px; color: var(--muted); }
  .sub .up { color: var(--terra); font-weight: 600; }
  .sub .down { color: var(--sage-deep); font-weight: 600; }
  .bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--line2); margin-bottom: 14px; }
  .bar span { display: block; height: 100%; }
  .bar .s1 { background: var(--sage-deep); } .bar .s3 { background: var(--sage); }
  .legend { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 12px; color: var(--body); }
  .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .legend .d1 { background: var(--sage-deep); } .legend .d3 { background: var(--sage); } .legend .d4 { background: var(--line2); border: 1px solid var(--line); }
  .legend b { color: var(--ink); }

  /* Rings */
  .ring-row { display: flex; align-items: center; gap: 22px; }
  .ring { position: relative; width: 120px; height: 120px; flex: none; }
  .ring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-c .rb { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); line-height: 1; }
  .ring-c .rs { font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); margin-top: 4px; font-weight: 600; }
  .kv { list-style: none; margin: 0; padding: 0; flex: 1; }
  .kv li { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--line2); font-size: 13.5px; color: var(--body); }
  .kv li:last-child { border-bottom: 0; }
  .kv b { color: var(--ink); }

  .prog { flex: 1; }
  .pcount { margin: 0 0 10px; font-size: 14px; color: var(--body); }
  .pcount b { color: var(--ink); font-size: 16px; }
  .dots { list-style: none; margin: 0; padding: 0; }
  .dots li { position: relative; padding: 4px 0 4px 16px; font-size: 13px; color: var(--body); }
  .dots li::before { content: ''; position: absolute; left: 0; top: 11px; width: 5px; height: 5px; border-radius: 50%; background: var(--tan); }

  /* Booked */
  .booked { list-style: none; margin: 0; padding: 0; }
  .booked li { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--line2); }
  .booked li:last-child { border-bottom: 0; }
  .bcat { display: block; font-weight: 600; color: var(--ink); font-size: 14px; }
  .bname { display: block; color: var(--muted); font-size: 12.5px; margin-top: 2px; }

  /* Priority */
  .priority { margin-top: 0; }
  .pgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 28px; }
  @media (max-width: 1000px) { .pgrid { grid-template-columns: 1fr; } }
  .pitem { display: flex; gap: 10px; font-size: 13.5px; color: var(--body); padding: 8px 0; border-bottom: 1px solid var(--line2); }
  .pitem b { color: var(--ink); font-weight: 600; }
  .pphase { color: var(--faint); font-size: 11px; letter-spacing: .04em; }
  .pdot { width: 6px; height: 6px; border-radius: 50%; background: var(--tan); margin-top: 7px; flex: none; }
  .empty { color: var(--muted); font-style: italic; font-size: 13.5px; }
</style>

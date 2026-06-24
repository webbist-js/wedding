<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();

  // Grouped navigation. Every section stays reachable; groups just tidy the rail.
  const NAV: { title?: string; items: [string, string, string][] }[] = [
    { items: [['/dashboard', 'Overview', 'grid']] },
    {
      title: 'Money',
      items: [
        ['/dashboard/venue', 'Venue', 'receipt'],
        ['/dashboard/budget', 'Budget', 'wallet'],
        ['/dashboard/shopping', 'Shopping', 'cart']
      ]
    },
    {
      title: 'Guests',
      items: [
        ['/dashboard/guests', 'Guests', 'users'],
        ['/dashboard/seating', 'Seating', 'seat'],
        ['/dashboard/suppliers', 'Suppliers', 'briefcase'],
        ['/dashboard/invites', 'Invites', 'qr']
      ]
    },
    {
      title: 'Planning',
      items: [
        ['/dashboard/timeline', 'Timeline', 'list'],
        ['/dashboard/calendar', 'Calendar', 'calendar'],
        ['/dashboard/notes', 'Notes', 'note']
      ]
    }
  ];

  // Per-route header: script title + muted subtitle.
  const META: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': { title: 'Overview', subtitle: 'Where you are, at a glance' },
    '/dashboard/venue': { title: 'Venue', subtitle: 'Live quote calculator — edits save automatically' },
    '/dashboard/budget': { title: 'Budget', subtitle: 'What you plan to spend, and what’s confirmed' },
    '/dashboard/shopping': { title: 'Shopping list', subtitle: 'Things to buy — feeds the budget' },
    '/dashboard/guests': { title: 'Guest list', subtitle: 'Households, contacts & RSVPs' },
    '/dashboard/seating': { title: 'Seating chart', subtitle: 'Plan tables and the floor layout' },
    '/dashboard/suppliers': { title: 'Suppliers', subtitle: 'Who’s booked, who’s next' },
    '/dashboard/invites': { title: 'Invites & QR codes', subtitle: 'Share links and printable codes' },
    '/dashboard/timeline': { title: 'Timeline', subtitle: 'Your road to 2 April 2027' },
    '/dashboard/calendar': { title: 'Calendar', subtitle: 'Appointments & supplier meetings' },
    '/dashboard/notes': { title: 'Research & notes', subtitle: 'Everything you’ve found' }
  };
  const meta = $derived(META[page.url.pathname] ?? { title: 'Dashboard', subtitle: '' });

  // Countdown to the wedding.
  const WEDDING = new Date('2027-04-02T14:30:00');
  const dateLabel = WEDDING.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).replace(',', '');
  let days = $state(0);
  $effect(() => {
    days = Math.max(0, Math.ceil((WEDDING.getTime() - Date.now()) / 86400000));
  });

  let navOpen = $state(false);
  $effect(() => {
    // Close the mobile drawer on navigation.
    page.url.pathname;
    navOpen = false;
  });
</script>

{#snippet icon(name: string)}
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#if name === 'grid'}<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    {:else if name === 'receipt'}<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M8 8h8M8 12h8"/>
    {:else if name === 'wallet'}<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14h2"/>
    {:else if name === 'cart'}<circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.2 11h10l2-8H6"/>
    {:else if name === 'users'}<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M21 20a6 6 0 0 0-4-5.6"/>
    {:else if name === 'seat'}<path d="M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><path d="M5 11h14a1 1 0 0 1 1 1v4H4v-4a1 1 0 0 1 1-1z"/><path d="M6 16v3M18 16v3"/>
    {:else if name === 'briefcase'}<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>
    {:else if name === 'qr'}<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7M17 21h4M17 17v0"/>
    {:else if name === 'list'}<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>
    {:else if name === 'calendar'}<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
    {:else if name === 'note'}<path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v6h6M9 13h6M9 17h4"/>
    {/if}
  </svg>
{/snippet}

<div class="shell">
  <!-- Mobile top bar -->
  <div class="mobilebar">
    <button class="burger" onclick={() => (navOpen = !navOpen)} aria-label="Menu">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <span class="m-word script">Katie &amp; Alex</span>
    <span class="m-days">{days}d</span>
  </div>

  <aside class="rail" class:open={navOpen}>
    <div class="brand">
      <span class="word script">Katie &amp; Alex</span>
      <span class="sub">The Tithe Barn · Bolton Abbey</span>
    </div>

    <nav>
      {#each NAV as group}
        {#if group.title}<p class="group">{group.title}</p>{/if}
        {#each group.items as [href, label, ic]}
          <a {href} class="nav-item" class:active={page.url.pathname === href}>
            {@render icon(ic)}
            <span>{label}</span>
          </a>
        {/each}
      {/each}
    </nav>

    <div class="rail-foot">
      <div class="countdown">
        <div class="cd-num">{days} <span>days to go</span></div>
        <div class="cd-date">{dateLabel} · 2.30pm</div>
      </div>
      <form method="POST" action="/logout" class="signout">
        <button type="submit">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </form>
    </div>
  </aside>

  {#if navOpen}<button class="scrim" aria-label="Close menu" onclick={() => (navOpen = false)}></button>{/if}

  <main class="content">
    <header class="page-head">
      <div class="ph-left">
        <h1 class="script">{meta.title}</h1>
        {#if meta.subtitle}<p class="ph-sub">{meta.subtitle}</p>{/if}
      </div>
      <div class="ph-right">
        <div class="wd">
          <span class="wd-label">Wedding day</span>
          <span class="wd-date">{dateLabel}</span>
        </div>
        <span class="wd-pill">{days} <span>days</span></span>
      </div>
    </header>
    <div class="page-body">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .shell { display: flex; min-height: 100vh; background: var(--bg); }

  /* ---------- Sidebar ---------- */
  .rail {
    position: fixed; inset: 0 auto 0 0; width: 268px; z-index: 40;
    background: var(--sidebar); color: var(--sidebar-text);
    display: flex; flex-direction: column; padding: 26px 18px 18px;
    overflow-y: auto;
  }
  .brand { padding: 4px 10px 18px; border-bottom: 1px solid var(--sidebar-line); margin-bottom: 16px; }
  .brand .word { display: block; font-size: 34px; line-height: 1; color: var(--sidebar-active); }
  .brand .sub { display: block; margin-top: 8px; font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--sidebar-faint); }

  nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .group { margin: 18px 12px 6px; font-size: 9px; letter-spacing: .24em; text-transform: uppercase; color: var(--sidebar-faint); font-weight: 600; }
  .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
    color: var(--sidebar-text); text-decoration: none; font-size: 12px; letter-spacing: .12em;
    text-transform: uppercase; font-weight: 500; border: 1px solid transparent; transition: background-color .15s, color .15s;
  }
  .nav-item :global(svg) { opacity: .8; flex: none; }
  .nav-item:hover { color: var(--sidebar-active); background: rgba(255,255,255,.04); }
  .nav-item.active {
    background: var(--sidebar-soft); color: var(--sidebar-active);
    border-color: var(--sidebar-line); box-shadow: 0 1px 0 rgba(255,255,255,.04) inset;
  }
  .nav-item.active :global(svg) { opacity: 1; color: var(--sage); }

  .rail-foot { margin-top: 16px; }
  .countdown {
    background: rgba(255,255,255,.04); border: 1px solid var(--sidebar-line);
    border-radius: 12px; padding: 14px 16px; margin-bottom: 6px;
  }
  .cd-num { font-family: var(--serif); font-weight: 600; font-size: 26px; color: var(--sage); line-height: 1; }
  .cd-num span { font-family: var(--sans); font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: var(--sidebar-faint); font-weight: 600; margin-left: 4px; }
  .cd-date { margin-top: 6px; font-size: 10.5px; letter-spacing: .08em; color: var(--sidebar-faint); }
  .signout button {
    display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: 0;
    color: var(--sidebar-faint); font: inherit; font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    cursor: pointer; padding: 14px 12px 4px;
  }
  .signout button:hover { color: var(--sidebar-active); }

  /* ---------- Main column ---------- */
  .content { flex: 1; margin-left: 268px; min-width: 0; display: flex; flex-direction: column; }
  .page-head {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
    padding: 34px 48px 22px; border-bottom: 1px solid var(--line); flex-wrap: wrap;
  }
  .ph-left h1 { font-size: 52px; line-height: 1; color: var(--ink); margin: 0; }
  .ph-sub { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
  .ph-right { display: flex; align-items: center; gap: 16px; }
  .wd { text-align: right; }
  .wd-label { display: block; font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: var(--faint); }
  .wd-date { display: block; font-weight: 700; color: var(--ink); font-size: 14px; margin-top: 3px; }
  .wd-pill {
    background: var(--sage); color: #fff; border-radius: 999px; padding: 8px 16px;
    font-weight: 700; font-size: 17px; display: inline-flex; align-items: baseline; gap: 5px;
  }
  .wd-pill span { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; font-weight: 600; opacity: .85; }
  .page-body { padding: 28px 48px 80px; max-width: 1700px; }

  /* ---------- Mobile ---------- */
  .mobilebar { display: none; }
  .scrim { display: none; }
  @media (max-width: 900px) {
    .mobilebar {
      display: flex; align-items: center; gap: 14px; position: sticky; top: 0; z-index: 30;
      background: var(--sidebar); color: var(--sidebar-active); padding: 12px 16px;
    }
    .burger { background: none; border: 0; color: var(--sidebar-active); cursor: pointer; padding: 0; display: grid; place-items: center; }
    .m-word { font-size: 24px; line-height: 1; flex: 1; }
    .m-days { font-size: 12px; color: var(--sage); font-weight: 700; }
    .rail { transform: translateX(-100%); transition: transform .22s ease; }
    .rail.open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.4); }
    .scrim { display: block; position: fixed; inset: 0; z-index: 35; background: rgba(0,0,0,.4); border: 0; }
    .content { margin-left: 0; }
    .page-head { padding: 22px 20px 18px; }
    .ph-left h1 { font-size: 38px; }
    .ph-right { gap: 12px; }
    .page-body { padding: 22px 20px 64px; }
  }
</style>

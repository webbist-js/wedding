<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();
  const tabs = [
    ['/dashboard', 'Overview'], ['/dashboard/budget', 'Budget'],
    ['/dashboard/venue', 'Venue'], ['/dashboard/guests', 'Guests'],
    ['/dashboard/seating', 'Seating'], ['/dashboard/suppliers', 'Suppliers'],
    ['/dashboard/timeline', 'Timeline'], ['/dashboard/invites', 'Invites'],
    ['/dashboard/notes', 'Notes']
  ];
</script>

<header class="top">
  <p class="eyebrow">The Tithe Barn · Bolton Abbey</p>
  <h1 class="script">Alex &amp; Katie</h1>
  <div class="meta">Thursday 2 April 2027 · 2.30pm</div>
</header>
<nav>
  {#each tabs as [href, label]}
    <a {href} class:active={page.url.pathname === href}>{label}</a>
  {/each}
  <form method="POST" action="/logout" class="out"><button>Sign out</button></form>
</nav>
<main>{@render children()}</main>

<style>
  .top { text-align: center; padding: 48px 24px 26px; }
  .top h1 { font-size: clamp(52px, 9vw, 92px); margin: 4px 0 6px; line-height: 1; }
  .meta { letter-spacing: .26em; text-transform: uppercase; font-size: 11px; color: #5f5b50; }
  nav { display: flex; gap: 26px; justify-content: center; flex-wrap: wrap; align-items: center;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 0 16px; }
  nav a { font-weight: 500; letter-spacing: .12em; text-transform: uppercase; font-size: 11.5px;
    padding: 15px 2px; color: var(--muted); text-decoration: none; border-bottom: 2px solid transparent; }
  nav a.active { color: var(--ink); border-bottom-color: var(--sage); }
  .out button { background: none; border: 0; color: var(--faint); font: inherit; font-size: 11.5px;
    letter-spacing: .12em; text-transform: uppercase; cursor: pointer; padding: 15px 0; }
  main { max-width: 1060px; margin: 0 auto; padding: 34px 22px 80px; }
</style>

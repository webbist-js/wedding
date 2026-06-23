<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import Card from '$lib/components/Card.svelte';
  import Alert from '$lib/components/Alert.svelte';
  let { data } = $props();
  let days = $state(0);
  $effect(() => {
    days = Math.max(0, Math.ceil((new Date(data.weddingISO).getTime() - Date.now()) / 86400000));
  });
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
</script>

<SectionHeading>Where you are</SectionHeading><Rule />
<div class="grid">
  <Stat value={`${days}`} label="Days to go" accent />
  <Stat value={`${data.summary.day} / ${data.summary.evening}`} label="Day / evening" />
  <Stat value={`${data.summary.total}`} label="Total guests" />
  <Stat value={`${data.summary.rsvpYes}`} label="RSVP'd yes" accent />
  <Stat value={`${data.summary.kids}`} label="Children" />
</div>

<Alert title="Notice of marriage — timing matters">
  You give notice at <b>Bradford &amp; Keighley Register Office</b> (City Hall, BD1 1HY), not North Yorkshire.
  Bradford won't let you book until you're <b>within 6 months of the wedding</b> — so book from <b>early October 2026</b>.
</Alert>

<Card kicker="Catering split (from RSVPs)">
  <p>Adults — vegetarian: <b>{data.summary.cateringVeg}</b> · non-veg: <b>{data.summary.cateringNonVeg}</b> · children: <b>{data.summary.kids}</b></p>
</Card>

<Card kicker="Upcoming appointments">
  {#if data.upcoming.length}
    <ul class="appts">
      {#each data.upcoming as a (a.id)}
        <li>
          <span class="d">{fmt(a.date)}{a.time ? ` · ${a.time}` : ''}</span>
          <span class="t">{a.title}</span>
          {#if a.supplierCategory}<span class="s">{a.supplierName ?? a.supplierCategory}</span>{/if}
        </li>
      {/each}
    </ul>
    <a class="all" href="/dashboard/calendar">Open calendar →</a>
  {:else}
    <p>No appointments booked yet. <a href="/dashboard/calendar">Add one →</a></p>
  {/if}
</Card>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .appts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .appts li { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; border-bottom: 1px solid var(--line2); padding-bottom: 8px; }
  .appts li:last-child { border-bottom: 0; padding-bottom: 0; }
  .appts .d { font-weight: 600; color: var(--ink); font-size: 13px; min-width: 130px; }
  .appts .t { color: var(--body); }
  .appts .s { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--sage-deep); }
  .all { display: inline-block; margin-top: 12px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--sage-deep); text-decoration: none; }
  .all:hover { text-decoration: underline; }
</style>

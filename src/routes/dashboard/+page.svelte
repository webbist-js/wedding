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

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
</style>

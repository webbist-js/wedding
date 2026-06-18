<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Card from '$lib/components/Card.svelte';
  import Alert from '$lib/components/Alert.svelte';
</script>

<SectionHeading>Research &amp; notes</SectionHeading><Rule />
<Card kicker="The Tithe Barn, Bolton Abbey (Cripps & Co)">
  <p>16th-century Grade II* listed barn on the Bolton Abbey Estate. Capacity 200 (ceremony & feast), 300 (drinks & dancing). Licensed for civil ceremonies. Late licence to 1am, Funktion-One sound, underfloor heating, fire pits, dog-friendly.</p>
  <p><b>All food & drink is in-house</b> — no external caterer. Book a <b>Feast Night</b> to taste & finalise the menu. Quote changes allowed up to 6 weeks before.</p>
  <p class="fine">enquiries@crippsboltonabbey.com · +44 1756 631 000 · coordinator Laura</p>
</Card>
<Card kicker="Adam Lowndes — Photographer (booked)">
  <p>Stoke-on-Trent based, travels UK. Relaxed, personality-led style. hello@adamlowndes.co.uk · 07527 547 073</p>
</Card>
<Card kicker="Venue logistics — once you have booked">
  <p>The £50pp Event Fee includes the coordinator, all staff, crockery, linen, décor, plus 3 canapés + 2 drinks per person. Final numbers 8 weeks before; final balance due 40 days before (~21 Feb 2027) via GoCardless. Planning meeting ~9 months out. Access from 9am; exclusive hire from 12.30pm. Full-day suppliers can have a meal at £25pp.</p>
</Card>
<Alert title="Check the shopping list against venue rules">
  Confetti must be <b>fresh petals only</b>. No fireworks, confetti cannons, Chinese lanterns, balloons or drones. Confirm whether sparklers are allowed. No décor fixed to walls/beams; chair sashes OK, full covers not.
</Alert>
<Alert title="Good to know" tone="sage">
  The venue's own gallery is shot by <b>Hamish Irvine</b> — the other name on the photographer shortlist.
</Alert>

<style>.fine { font-size: 12.5px; color: var(--muted); }</style>

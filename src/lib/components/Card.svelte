<script lang="ts">
  let { kicker = '', children } = $props();
</script>
<section class="card">
  {#if kicker}<h3 class="kick">{kicker}</h3>{/if}
  {@render children()}
</section>
<style>
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px;
    padding: 24px 26px; margin-bottom: 18px; }
  .kick { font-family: var(--sans); font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 16px; }
</style>

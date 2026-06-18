<script lang="ts">
  let { title = '', tone = 'terra', children } = $props(); // terra|sage
</script>
<div class="alert {tone}">
  {#if title}<div class="at">{title}</div>{/if}
  <div class="bd">{@render children()}</div>
</div>
<style>
  .alert { border-left: 3px solid var(--terra); background: var(--terra-bg);
    padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 0 0 20px; font-size: 14px; }
  .alert.sage { border-left-color: var(--sage); background: var(--sage-soft); }
  .at { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 10.5px;
    color: var(--terra); margin-bottom: 7px; }
  .alert.sage .at { color: var(--sage-deep); }
</style>

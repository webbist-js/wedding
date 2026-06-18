<script lang="ts">
  let { value, label, accent = false } = $props();
</script>
<div class="stat">
  <div class="v" class:accent>{value}</div>
  <div class="l">{label}</div>
</div>
<style>
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; }
  .v { font-family: var(--serif); font-weight: 600; font-size: 32px; color: var(--ink); line-height: 1; }
  .v.accent { color: var(--sage); }
  .l { font-weight: 500; letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; color: var(--muted); margin-top: 8px; }
</style>

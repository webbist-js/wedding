<script lang="ts">
  import { formatAuditLine } from '$lib/audit';
  let { data } = $props();
  const fmt = (d: Date | string | number | null) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
</script>

<div class="feed">
  {#each data.entries as e (e.id)}
    <div class="row">
      <span class="line">{formatAuditLine(e, e.userName)}</span>
      <span class="when">{fmt(e.createdAt)}</span>
    </div>
  {:else}
    <p class="empty">No activity yet.</p>
  {/each}
</div>

<style>
  .feed { display: flex; flex-direction: column; gap: 2px; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
  .line { font-size: 13.5px; color: var(--ink); }
  .when { font-size: 11px; color: var(--muted); white-space: nowrap; }
  .empty { color: var(--muted); }
</style>

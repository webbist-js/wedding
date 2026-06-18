<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<SectionHeading>Timeline</SectionHeading><Rule />
{#each data.phases as phase (phase.id)}
  <div class="phase">
    <div class="head"><span class="t">{phase.title}</span><span class="w">{phase.window}</span></div>
    {#each phase.items as item (item.id)}
      <div class="item" class:done={item.done}>
        <form method="POST" action="?/toggle" use:enhance><input type="hidden" name="id" value={item.id} /><button class="dot" class:on={item.done} aria-label="toggle"></button></form>
        <span class="x">{item.label}</span>
        <form method="POST" action="?/removeItem" use:enhance><input type="hidden" name="id" value={item.id} /><button class="rm">×</button></form>
      </div>
    {/each}
    <form method="POST" action="?/addItem" use:enhance class="additem">
      <input type="hidden" name="phaseId" value={phase.id} />
      <input name="label" placeholder="Add a task…" /><button>+</button>
    </form>
  </div>
{/each}
<form method="POST" action="?/addPhase" use:enhance class="addphase">
  <input name="title" placeholder="New phase title" /><input name="window" placeholder="Window (e.g. Spring 2027)" /><button>+ Add phase</button>
</form>

<style>
  .phase { margin-bottom: 26px; }
  .head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .head .t { font-family: var(--serif); font-weight: 600; font-size: 20px; color: var(--ink); }
  .head .w { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: var(--sage); }
  .item { display: flex; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line2); }
  .item .x { flex: 1; font-size: 14px; }
  .item.done .x { color: var(--muted); text-decoration: line-through; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--rule); background: transparent; cursor: pointer; padding: 0; }
  .dot.on { background: var(--sage); border-color: var(--sage); }
  .rm { background: none; border: 0; color: var(--faint); font-size: 16px; cursor: pointer; }
  .additem { display: flex; gap: 8px; margin-top: 8px; }
  .additem input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; }
  .additem button, .addphase button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; }
  .addphase { display: flex; gap: 8px; margin-top: 20px; }
  .addphase input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; }
</style>

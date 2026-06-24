<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
  // Only guests who have RSVP'd "yes" can be seated. The day/evening toggle then
  // narrows to that sitting. (A guest who later changes away from "yes" simply
  // drops out of the chart; their stale assignment is harmless and returns if
  // they re-confirm.)
  let attending = $derived(data.guests.filter((g) => g.rsvpStatus === 'yes'));
  let pool = $derived(data.seatMode === 'day' ? attending.filter((g) => g.attendanceType === 'day') : attending);
  let unassigned = $derived(pool.filter((g) => g.tableNo == null));
  const tables = $derived(Array.from({ length: data.tableCount }, (_, i) => i + 1));
</script>

{#snippet sidePill(side: string)}
  {#if side === 'B'}<span class="pill bride">Bride</span>
  {:else if side === 'G'}<span class="pill groom">Groom</span>
  {:else}<span class="pill both">Both</span>{/if}
{/snippet}

<SectionHeading>Seating chart</SectionHeading><Rule />
<div class="ctrls">
  <form method="POST" action="?/setTableCount" use:enhance>
    <label>Tables <input name="tableCount" type="number" min="1" max="30" value={data.tableCount} /></label><button>Set</button>
  </form>
  <form method="POST" action="?/clear" use:enhance><button class="clear">Clear all</button></form>
</div>

<div class="card">
  <h3 class="kick">Unassigned · {unassigned.length}</h3>
  <p class="hint">Only guests who have RSVP'd <b>yes</b> appear here{data.seatMode === 'day' ? ' (day guests)' : ''}.</p>
  <div class="chips">
    {#each unassigned as g (g.id)}
      <form method="POST" action="?/assign" use:enhance class="chip">
        {@render sidePill(g.side)}
        <span>{g.name}</span>
        <input type="hidden" name="guestId" value={g.id} />
        <select name="tableNo" onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}>
          <option value="">Table…</option>
          {#each tables as t}<option value={t}>Table {t}</option>{/each}
        </select>
      </form>
    {/each}
    {#if unassigned.length === 0}
      <span class="empty">Everyone seatable is seated.</span>
    {/if}
  </div>
</div>

<div class="tables">
  {#each tables as t}
    {@const seated = pool.filter((g) => g.tableNo === t)}
    <div class="tbl">
      <div class="cap"><span class="nm">Table {t}</span><span class="ct" class:over={seated.length > 10}>{seated.length}/10</span></div>
      <ul>
        {#each seated as g (g.id)}
          <li>{@render sidePill(g.side)}<span class="gname">{g.name}</span>
            <form method="POST" action="?/assign" use:enhance class="inline"><input type="hidden" name="guestId" value={g.id} /><input type="hidden" name="tableNo" value="" /><button class="rm">×</button></form>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</div>

<style>
  .ctrls { display: flex; gap: 18px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .ctrls form { display: flex; gap: 8px; align-items: center; }
  .ctrls label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; gap: 8px; align-items: center; }
  .ctrls input { border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; width: 80px; font: inherit; }
  .ctrls button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 11px; text-transform: uppercase; }
  .ctrls .clear { background: transparent; color: var(--faint); border: 1px solid var(--line); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 18px; }
  .kick { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 6px; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .empty { font-size: 12.5px; color: var(--muted); font-style: italic; }
  .pill { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 2px 7px; line-height: 1.4; white-space: nowrap; }
  .pill.bride { background: var(--terra-bg); color: var(--terra); }
  .pill.groom { background: var(--sage-soft); color: var(--sage-deep); }
  .pill.both { background: #efece3; color: var(--muted); }
  .gname { flex: 1; }
  .chip { display: inline-flex; align-items: center; gap: 8px; background: #faf8f2; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; font-size: 12.5px; }
  .chip select { border: 0; background: transparent; color: var(--sage); cursor: pointer; font: inherit; font-size: 11px; }
  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: 16px; }
  .tbl { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .cap { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .cap .nm { font-weight: 600; }
  .cap .ct { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--sage); }
  .cap .ct.over { color: var(--terra); }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 3px 0; }
  .inline { display: inline; }
  .rm { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 13px; }
</style>

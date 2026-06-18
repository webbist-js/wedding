<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  let earmark = $derived(data.lines.reduce((a, l) => a + l.budgeted, 0));
  let confirmed = $derived(data.lines.reduce((a, l) => a + l.confirmed, 0));
  let paid = $derived(data.lines.reduce((a, l) => a + l.paid, 0));

  async function toggleStatio(item: any, checked: boolean) {
    await fetch('/dashboard/stationery', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id, done: checked }) });
  }
</script>

<SectionHeading>Budget</SectionHeading><Rule />
<div class="grid">
  <form method="POST" action="?/setTarget" use:enhance class="stat-form">
    <label>Target £ <input name="target" type="number" value={data.target} /></label>
    <button>Save</button>
  </form>
  <Stat value={gbp(earmark)} label="Total earmarked" />
  <Stat value={gbp(confirmed)} label="Confirmed costs" />
  <Stat value={gbp(paid)} label="Paid to date" accent />
</div>

<div class="card">
  <table>
    <thead><tr><th>Category</th><th class="r">Budgeted</th><th class="r">Confirmed</th><th class="r">Paid</th><th>Status</th><th></th></tr></thead>
    <tbody>
      {#each data.lines as line (line.id)}
        <tr>
          <td colspan="6" class="rowcell">
            <form method="POST" action="?/update" use:enhance class="rowform">
              <input type="hidden" name="id" value={line.id} />
              <input name="category" value={line.category} class="cat" />
              <input name="budgeted" type="number" value={line.budgeted} class="num" />
              <input name="confirmed" type="number" value={line.confirmed} class="num" />
              <input name="paid" type="number" value={line.paid} class="num" />
              <select name="status" value={line.status}><option value="todo">To do</option><option value="booked">Booked</option><option value="paid">Paid</option></select>
              <button class="save">Save</button>
            </form>
            <form method="POST" action="?/remove" use:enhance class="rm"><input type="hidden" name="id" value={line.id} /><button>×</button></form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <form method="POST" action="?/add" use:enhance class="addrow">
    <input name="category" placeholder="New budget line…" />
    <button>+ Add line</button>
  </form>
</div>

<Card kicker="Stationery — what you'll need">
  {#each data.statio as item}
    <label class="statio"><input type="checkbox" checked={item.done} onchange={(e) => toggleStatio(item, (e.target as HTMLInputElement).checked)} /> {item.label}</label>
  {/each}
</Card>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .stat-form { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; display: grid; gap: 8px; }
  .stat-form label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: grid; gap: 6px; }
  .stat-form input { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 18px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 14px 18px; margin-bottom: 18px; }
  table { width: 100%; }
  th { text-align: left; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 8px; }
  th.r { text-align: right; }
  .rowform { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 6px 0; }
  .rowform .cat { flex: 1 1 180px; }
  .rowform input, .rowform select { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
  .rowform .num { width: 90px; text-align: right; }
  .rowcell { display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--line2); }
  .save, .addrow button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
  .rm button { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .addrow { display: flex; gap: 10px; margin-top: 12px; }
  .addrow input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; }
  .statio { display: block; padding: 5px 0; font-size: 14px; }
</style>

<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();

  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

  let total = $derived(data.items.reduce((a, i) => a + i.cost * i.qty, 0));
  let boughtTotal = $derived(data.items.filter((i) => i.bought).reduce((a, i) => a + i.cost * i.qty, 0));
  let boughtCount = $derived(data.items.filter((i) => i.bought).length);

  async function save(id: number, field: string, value: string | number | boolean) {
    await fetch('/dashboard/shopping/item', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, field, value })
    });
  }
</script>


<div class="stats">
  <div class="stat"><div class="v">{data.items.length}</div><div class="l">Items</div></div>
  <div class="stat"><div class="v">{gbp(total)}</div><div class="l">Total cost</div></div>
  <div class="stat"><div class="v accent">{gbp(boughtTotal)}</div><div class="l">Bought ({boughtCount})</div></div>
</div>

<p class="feed">This list's total feeds the <a href="/dashboard/budget">budget</a> as a synced <b>Shopping list</b> line under “Everything else”. Ticking <b>Bought</b> counts towards what's paid.</p>

<div class="card">
  <div class="row head">
    <span></span>
    <span>Item</span>
    <span class="r">Qty</span>
    <span class="r">Unit £</span>
    <span class="r">Line £</span>
    <span></span>
  </div>

  {#each data.items as item (item.id)}
    <div class="row" class:done={item.bought}>
      <label class="cb" title="Bought">
        <input type="checkbox" checked={item.bought} onchange={(e) => save(item.id, 'bought', e.currentTarget.checked)} />
      </label>
      <input class="lbl" value={item.label} onchange={(e) => save(item.id, 'label', e.currentTarget.value)} />
      <input class="num" type="number" min="1" value={item.qty} onchange={(e) => save(item.id, 'qty', e.currentTarget.value)} />
      <input class="num" type="number" min="0" step="0.01" value={item.cost} onchange={(e) => save(item.id, 'cost', e.currentTarget.value)} />
      <span class="line">{gbp(item.cost * item.qty)}</span>
      <form method="POST" action="?/remove" use:enhance class="rmf">
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" title="Remove" aria-label="Remove">×</button>
      </form>
    </div>
  {/each}

  {#if data.items.length === 0}
    <p class="empty">Nothing on the list yet — add your first item below.</p>
  {/if}

  <form method="POST" action="?/add" use:enhance class="addrow">
    <input name="label" placeholder="Add something to buy…" />
    <button>+ Add item</button>
  </form>
</div>

<style>
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 18px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 20px; }
  .stat .v { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--ink); line-height: 1; }
  .stat .v.accent { color: var(--sage); }
  .stat .l { font-weight: 500; letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; color: var(--muted); margin-top: 8px; }

  .feed { font-size: 13px; color: var(--muted); margin: 0 0 18px; line-height: 1.6; }
  .feed a { color: var(--sage-deep); }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 12px 16px; }
  .row { display: grid; grid-template-columns: 28px minmax(180px, 1.8fr) 80px 100px 100px 28px; gap: 10px; align-items: center; padding: 8px 4px; border-bottom: 1px solid var(--line2); }
  .row:last-of-type { border-bottom: 0; }
  .row.head { color: var(--muted); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  .row.head .r { text-align: right; }
  .row.done .lbl { color: var(--muted); text-decoration: line-through; }
  .row input { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 0; }
  .row input.lbl { font-weight: 500; color: var(--ink); }
  .row input.num { text-align: right; font-variant-numeric: tabular-nums; }
  .row .line { text-align: right; font-variant-numeric: tabular-nums; color: var(--body); padding-right: 8px; }
  .cb { display: grid; place-items: center; }
  .rmf { margin: 0; }
  .rmf button { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; padding: 0; }
  .rmf button:hover { color: var(--terra); }
  .empty { color: var(--muted); font-style: italic; font-size: 13px; padding: 12px 4px; }
  .addrow { display: flex; gap: 10px; margin: 12px 4px 4px; }
  .addrow input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 13px; }
  .addrow button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 500; }

  @media (max-width: 720px) {
    .row { grid-template-columns: 28px 1fr 60px 80px; }
    .row .line, .row.head span:nth-child(5) { display: none; }
  }
</style>

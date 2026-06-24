<script lang="ts">
  import { computeQuote, lineQty } from '$lib/quote';
  let { data } = $props();
  let day = $state(data.day),
    eve = $state(data.eve),
    min = $state(data.min);
  let lines = $state(data.lines.map((l) => ({ ...l })));
  let result = $derived(computeQuote(lines as any, { day, eve, min }));
  const gbp = (n: number) =>
    '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function post(payload: unknown) {
    return fetch('/dashboard/venue/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  function saveLine(line: any, field: 'label' | 'scope' | 'price' | 'qty' | 'bond') {
    post({ id: line.id, field, value: line[field] });
  }
  async function addLine() {
    const res = await post({ op: 'add' });
    const { id } = await res.json();
    lines = [
      ...lines,
      { id, label: 'New item', section: 'Custom', scope: 'fixed', price: 0, qty: null, included: false, confirmed: false, bond: false, sort: 999 }
    ];
  }
  function removeLine(line: any) {
    post({ op: 'remove', id: line.id });
    lines = lines.filter((l) => l.id !== line.id);
  }

  async function saveSetting(setting: 'dayGuests' | 'eveGuests' | 'minSpend', value: number) {
    post({ setting, value });
  }
</script>

<div class="ctrls">
  <label>Day guests <input type="number" bind:value={day} onchange={() => saveSetting('dayGuests', day)} /></label>
  <label>Evening guests <input type="number" bind:value={eve} onchange={() => saveSetting('eveGuests', eve)} /></label>
  <label>Min spend £ <input type="number" bind:value={min} onchange={() => saveSetting('minSpend', min)} /></label>
</div>

<div class="card">
  <div class="qrow head">
    <span>Item</span>
    <span>Scope</span>
    <span class="r">Qty</span>
    <span class="r">Price £</span>
    <span class="c" title="Refundable bond (excluded from spend)">Bond</span>
    <span class="r">Total</span>
    <span></span>
  </div>

  {#each lines as line (line.id)}
    {@const qty = lineQty(line as any, { day, eve, min })}
    <div class="qrow" class:bondline={line.bond}>
      <input class="label" bind:value={line.label} onblur={() => saveLine(line, 'label')} placeholder="Item" />
      <select bind:value={line.scope} onchange={() => saveLine(line, 'scope')}>
        <option value="day">Per day guest</option>
        <option value="eve">Per evening guest</option>
        <option value="fixed">Fixed (×1)</option>
        <option value="custom">Custom qty</option>
      </select>
      {#if line.scope === 'custom'}
        <input class="num qty" type="number" bind:value={line.qty} onblur={() => saveLine(line, 'qty')} />
      {:else}
        <span class="readonly num">{qty}</span>
      {/if}
      <input class="num price" type="number" step="0.01" bind:value={line.price} onblur={() => saveLine(line, 'price')} />
      <label class="cb"><input type="checkbox" bind:checked={line.bond} onchange={() => saveLine(line, 'bond')} /></label>
      <span class="num total">{gbp(qty * line.price)}</span>
      <button class="rm" type="button" onclick={() => removeLine(line)} title="Remove" aria-label="Remove">×</button>
    </div>
  {/each}

  <button class="addrow" type="button" onclick={addLine}>+ Add item</button>
</div>

<div class="card totals">
  <div class="row"><span>Chargeable subtotal</span><span>{gbp(result.spend)}</span></div>
  <div class="row"><span>Minimum-spend top-up</span><span>{gbp(result.topup)}</span></div>
  <div class="row"><span>Refundable bond</span><span>{gbp(result.bond)}</span></div>
  <div class="row grand"><span>Estimated total payable</span><span>{gbp(result.grand)}</span></div>
</div>

<style>
  .ctrls {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .ctrls label {
    display: grid;
    gap: 6px;
    font-size: 10.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .ctrls input {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 12px;
    width: 110px;
    font: inherit;
    font-size: 16px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 12px 16px;
    margin-bottom: 18px;
  }

  .qrow {
    display: grid;
    grid-template-columns: minmax(160px, 2.2fr) 150px 70px 90px 48px 100px 32px;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--line2);
  }
  .qrow:last-of-type {
    border-bottom: 0;
  }
  .qrow.head {
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .qrow.bondline {
    opacity: 0.85;
  }
  .r {
    text-align: right;
  }
  .c {
    text-align: center;
  }
  .qrow input:not([type='checkbox']),
  .qrow select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px 8px;
    font: inherit;
    font-size: 13px;
    background: #fff;
    color: var(--ink);
  }
  .qrow .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .qrow .readonly {
    color: var(--faint);
    font-size: 13px;
    padding-right: 8px;
  }
  .qrow .total {
    font-size: 13px;
    color: var(--ink);
  }
  .qrow .cb {
    display: grid;
    place-items: center;
  }
  .rm {
    background: none;
    border: 0;
    color: var(--faint);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
  }
  .rm:hover {
    color: var(--terra);
  }
  .addrow {
    margin-top: 12px;
    background: var(--sage);
    color: #fff;
    border: 0;
    border-radius: 8px;
    padding: 9px 16px;
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    cursor: pointer;
  }
  .addrow:hover {
    background: var(--sage-deep);
  }

  .totals {
    padding: 16px 24px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-top: 1px solid var(--line2);
  }
  .row.grand {
    border-top: 2px solid var(--ink);
    margin-top: 6px;
    font-family: var(--serif);
    font-size: 20px;
    font-weight: 600;
    color: var(--ink);
  }

  @media (max-width: 760px) {
    .qrow {
      grid-template-columns: 1fr 1fr;
      row-gap: 4px;
    }
    .qrow.head {
      display: none;
    }
  }
</style>

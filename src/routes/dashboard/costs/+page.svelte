<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { computeQuote } from '$lib/quote';
  let { data } = $props();
  let day = $state(data.day),
    eve = $state(data.eve),
    min = $state(data.min);
  let lines = $state(data.lines.map((l) => ({ ...l })));
  let result = $derived(computeQuote(lines as any, { day, eve, min }));
  const gbp = (n: number) =>
    '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function saveLine(line: any, field: 'price' | 'qty') {
    await fetch('/dashboard/costs/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: line.id, field, value: line[field] })
    });
  }

  async function saveSetting(setting: 'dayGuests' | 'eveGuests' | 'minSpend', value: number) {
    await fetch('/dashboard/costs/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ setting, value })
    });
  }
</script>

<SectionHeading>Venue quote</SectionHeading><Rule />
<div class="ctrls">
  <label>Day guests <input type="number" bind:value={day} onchange={() => saveSetting('dayGuests', day)} /></label>
  <label>Evening guests <input type="number" bind:value={eve} onchange={() => saveSetting('eveGuests', eve)} /></label>
  <label>Min spend £ <input type="number" bind:value={min} onchange={() => saveSetting('minSpend', min)} /></label>
</div>

<div class="card">
  <table>
    <thead
      ><tr
        ><th>Item</th><th>Scope</th><th class="r">Qty</th><th class="r">Price £</th><th class="r"
          >Total</th
        ></tr
      ></thead
    >
    <tbody>
      {#each lines as line}
        {@const qty =
          line.scope === 'day'
            ? day
            : line.scope === 'eve'
              ? eve
              : line.scope === 'fixed'
                ? 1
                : (line.qty ?? 0)}
        <tr>
          <td>{line.label}</td>
          <td class="scope">{line.scope}</td>
          <td class="r"
            >{#if line.scope === 'custom'}<input
                class="qty"
                type="number"
                bind:value={line.qty}
                onblur={() => saveLine(line, 'qty')}
              />{:else}{qty}{/if}</td
          >
          <td class="r"
            ><input
              class="price"
              type="number"
              step="0.01"
              bind:value={line.price}
              onblur={() => saveLine(line, 'price')}
            /></td
          >
          <td class="r">{gbp(qty * line.price)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
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
    padding: 6px 14px;
    overflow-x: auto;
    margin-bottom: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 11px 12px;
    border-bottom: 1px solid var(--line);
  }
  th.r,
  td.r {
    text-align: right;
  }
  td {
    padding: 9px 12px;
    border-bottom: 1px solid var(--line2);
    font-size: 13.5px;
  }
  td.scope {
    color: var(--faint);
    font-size: 11.5px;
  }
  input.price,
  input.qty {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 5px 7px;
    text-align: right;
    width: 80px;
    font: inherit;
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
</style>

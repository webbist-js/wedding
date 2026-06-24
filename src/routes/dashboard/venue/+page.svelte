<script lang="ts">
  import { computeQuote, lineQty } from '$lib/quote';
  let { data } = $props();
  let day = $state(data.day), eve = $state(data.eve), min = $state(data.min);
  let lines = $state(data.lines.map((l) => ({ ...l })));
  let result = $derived(computeQuote(lines as any, { day, eve, min }));

  // The venue's original headline quote (80 covers).
  const ORIGINAL_QUOTE = 17319.4;

  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SCOPE_LABEL: Record<string, string> = {
    day: 'per day guest', eve: 'per evening guest', fixed: 'fixed', custom: 'custom qty'
  };

  // Food & drink (per-guest consumables) vs hire & extras (fixed) + bond.
  let breakdown = $derived.by(() => {
    let food = 0, fixed = 0;
    for (const l of lines) {
      if (l.bond) continue;
      const t = lineQty(l as any, { day, eve, min }) * l.price;
      if (l.scope === 'fixed') fixed += t; else food += t;
    }
    return { food, hire: fixed + result.bond, vs: result.grand - ORIGINAL_QUOTE };
  });

  async function post(payload: unknown) {
    return fetch('/dashboard/venue/quote', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
    });
  }
  function saveLine(line: any, field: 'label' | 'scope' | 'price' | 'qty' | 'bond') {
    post({ id: line.id, field, value: line[field] });
  }
  async function addLine() {
    const res = await post({ op: 'add' });
    const { id } = await res.json();
    lines = [...lines, { id, label: 'New item', section: 'Custom', scope: 'fixed', price: 0, qty: null, included: false, confirmed: true, bond: false, sort: 999 }];
  }
  function removeLine(line: any) {
    post({ op: 'remove', id: line.id });
    lines = lines.filter((l) => l.id !== line.id);
  }
  function saveSetting(setting: 'dayGuests' | 'eveGuests' | 'minSpend', value: number) {
    post({ setting, value });
  }
  function reset() {
    day = 61; eve = 90; min = 16455;
    saveSetting('dayGuests', day); saveSetting('eveGuests', eve); saveSetting('minSpend', min);
  }
</script>

<p class="intro">
  Your venue quote (Cordero <b>#4673989</b>) was built on <b>80 covers</b> and totalled <b>{gbp(ORIGINAL_QUOTE)}</b>.
  Adjust the numbers below and the quote recalculates live. Lines marked <span class="confirm">Confirm</span>
  were too blurry to read — plug in the real figures from your Cordero account.
</p>

<div class="alert">
  <span class="ai" aria-hidden="true">!</span>
  <div>
    <p class="at">Minimum spend</p>
    <p class="ab">The venue has a minimum food &amp; drink spend (your quote shows ~{gbp(16455)}). If fewer guests pull your food/drink below it, the venue charges the difference as a top-up — so cutting covers may save less than you'd expect. The calculator estimates this below; <b>confirm the exact rule with Laura.</b></p>
  </div>
</div>

<div class="ctrls">
  <label>Day guests <input type="number" bind:value={day} onchange={() => saveSetting('dayGuests', day)} /></label>
  <label>Evening guests (total) <input type="number" bind:value={eve} onchange={() => saveSetting('eveGuests', eve)} /></label>
  <label>Min. spend (£) <input type="number" bind:value={min} onchange={() => saveSetting('minSpend', min)} /></label>
  <button class="reset" type="button" onclick={reset}>Reset</button>
  <span class="auto">edits save automatically</span>
</div>

<div class="card">
  <div class="qrow head">
    <span>Item</span>
    <span>Scope</span>
    <span class="r">Qty</span>
    <span class="r">Price £</span>
    <span class="r">Total</span>
    <span></span>
  </div>

  {#each lines as line, i (line.id)}
    {@const qty = lineQty(line as any, { day, eve, min })}
    {#if line.section !== lines[i - 1]?.section}
      <div class="band">{line.section}</div>
    {/if}
    <div class="qrow">
      <span class="itemcell">
        <input class="label" bind:value={line.label} onblur={() => saveLine(line, 'label')} placeholder="Item" />
        {#if !line.confirmed}<span class="confirm">Confirm</span>{/if}
      </span>
      <select class="scope" bind:value={line.scope} onchange={() => saveLine(line, 'scope')}>
        {#each Object.entries(SCOPE_LABEL) as [val, lbl]}<option value={val}>{lbl}</option>{/each}
      </select>
      {#if line.scope === 'custom'}
        <input class="num qty" type="number" bind:value={line.qty} onblur={() => saveLine(line, 'qty')} />
      {:else}
        <span class="readonly num">{qty}</span>
      {/if}
      <input class="num price" type="number" step="0.01" bind:value={line.price} onblur={() => saveLine(line, 'price')} />
      <span class="num total">{gbp(qty * line.price)}</span>
      <span class="acts">
        <label class="bond" title="Refundable bond — excluded from spend"><input type="checkbox" bind:checked={line.bond} onchange={() => saveLine(line, 'bond')} /> bond</label>
        <button class="rm" type="button" onclick={() => removeLine(line)} title="Remove" aria-label="Remove">×</button>
      </span>
    </div>
  {/each}

  <button class="addrow" type="button" onclick={addLine}>+ Add item</button>
</div>

<div class="card totals">
  <div class="row"><span>Food &amp; drink subtotal</span><span>{gbp(breakdown.food)}</span></div>
  <div class="row"><span>Minimum-spend top-up <i>(if below min)</i></span><span>{gbp(result.topup)}</span></div>
  <div class="row"><span>Hire, ceremony &amp; extras</span><span>{gbp(breakdown.hire)}</span></div>
  <div class="row grand"><span>Estimated total</span><span>{gbp(result.grand)}</span></div>
  <p class="vs">
    Original 80-cover quote: {gbp(ORIGINAL_QUOTE)} ·
    {#if breakdown.vs > 0}<span class="up">{gbp(breakdown.vs)} higher vs quote</span>
    {:else if breakdown.vs < 0}<span class="down">{gbp(-breakdown.vs)} under quote</span>
    {:else}in line with quote{/if}
  </p>
</div>

<style>
  .intro { font-size: 13.5px; color: var(--body); line-height: 1.7; max-width: 80ch; margin: 0 0 18px; }
  .confirm { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
    background: var(--terra-bg); color: var(--terra); border-radius: 999px; padding: 2px 7px; vertical-align: middle; }

  .alert { display: flex; gap: 14px; background: var(--rose-bg); border-radius: 14px; padding: 16px 20px; margin-bottom: 22px; }
  .alert .ai { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--terra); color: var(--terra);
    display: grid; place-items: center; font-weight: 700; font-size: 13px; }
  .alert .at { font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; color: var(--terra); margin: 2px 0 6px; }
  .alert .ab { font-size: 13px; color: var(--body); line-height: 1.6; margin: 0; }

  .ctrls { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 18px; }
  .ctrls label { display: grid; gap: 6px; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
  .ctrls input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; width: 120px; font: inherit; font-size: 16px; background: #fff; }
  .reset { background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 9px 16px; font: inherit; font-size: 11px;
    letter-spacing: .08em; text-transform: uppercase; color: var(--muted); cursor: pointer; }
  .reset:hover { border-color: var(--sage); color: var(--sage-deep); }
  .auto { font-size: 12px; color: var(--faint); margin-bottom: 10px; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 8px 18px; margin-bottom: 18px; }
  .qrow { display: grid; grid-template-columns: minmax(220px, 2.6fr) 140px 64px 96px 110px 80px; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--line2); }
  .qrow:last-of-type { border-bottom: 0; }
  .qrow.head { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 0 8px; border-bottom: 1px solid var(--line); }
  .r { text-align: right; }

  .band { grid-column: 1 / -1; background: #f1ece0; color: #9a7b53; font-size: 10px; font-weight: 700; letter-spacing: .16em;
    text-transform: uppercase; padding: 7px 12px; border-radius: 6px; margin: 8px 0 2px; }

  .itemcell { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .qrow .label { flex: 1; min-width: 0; border: 1px solid transparent; border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13.5px; background: transparent; color: var(--ink); }
  .qrow .label:hover { background: var(--bg); }
  .qrow .label:focus { background: #fff; border-color: var(--line); outline: none; }
  .scope { border: 1px solid transparent; background: transparent; color: var(--muted); font: inherit; font-size: 12.5px; padding: 6px 4px; border-radius: 6px; cursor: pointer; appearance: none; -webkit-appearance: none; }
  .scope:hover { color: var(--body); background: var(--bg); }
  .scope:focus { outline: none; border-color: var(--line); background: #fff; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .qrow .readonly { color: var(--muted); font-size: 13px; padding-right: 8px; }
  .qrow .price { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; width: 100%; min-width: 0; }
  .qrow .qty { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; width: 100%; min-width: 0; text-align: right; }
  .qrow .total { font-size: 13.5px; font-weight: 600; color: var(--ink); }

  .acts { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; opacity: 0; transition: opacity .12s; }
  .qrow:hover .acts { opacity: 1; }
  .bond { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 17px; cursor: pointer; line-height: 1; }
  .rm:hover { color: var(--terra); }

  .addrow { margin: 12px 0; background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font: inherit; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
  .addrow:hover { background: var(--sage-deep); }

  .totals { padding: 18px 24px; max-width: 520px; margin-left: auto; }
  .row { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid var(--line2); font-size: 14px; color: var(--body); }
  .row i { color: var(--faint); font-style: normal; font-size: 11px; }
  .row.grand { border-top: 2px solid var(--ink); margin-top: 6px; font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); }
  .vs { margin: 10px 0 0; font-size: 12px; color: var(--muted); }
  .vs .up { color: var(--terra); font-weight: 600; }
  .vs .down { color: var(--sage-deep); font-weight: 600; }

  @media (max-width: 760px) {
    .qrow { grid-template-columns: 1fr 1fr; row-gap: 4px; }
    .qrow.head { display: none; }
    .acts { opacity: 1; }
    .totals { max-width: none; }
  }
</style>

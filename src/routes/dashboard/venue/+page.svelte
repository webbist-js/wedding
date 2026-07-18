<script lang="ts">
  import { computeQuote, lineQty } from '$lib/quote';
  import type { CostBasis } from '$lib/headcount';
  let { data } = $props();

  // Which headcounts price the quote: typed numbers, everyone invited, or
  // RSVP-confirmed guests. The chosen basis also drives the Budget's Venue line.
  let basis = $state<CostBasis>(data.basis);
  let manual = $state({ ...data.manual });
  let min = $state(data.min);
  let lines = $state(data.lines.map((l) => ({ ...l })));
  let sections = $state(data.sections.map((s) => ({ ...s })));

  // Lines grouped under their section band, both in display order. Grouping is
  // by name (that's the DB link); items within a group follow `lines` order.
  const grouped = $derived(
    sections.map((s) => ({ s, items: lines.filter((l) => l.section === s.name) }))
  );

  const active = $derived(basis === 'manual' ? manual : data.counts[basis]);
  const result = $derived(computeQuote(lines as any, { ...active, min }));
  const estimateGrand = $derived(computeQuote(lines as any, { ...data.counts.estimate, min }).grand);
  const confirmedGrand = $derived(computeQuote(lines as any, { ...data.counts.confirmed, min }).grand);

  const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SCOPE_LABEL: Record<string, string> = {
    day: 'per day guest', eve: 'per evening guest', fixed: 'fixed', custom: 'custom qty'
  };

  // Food & drink (per-guest consumables) vs hire & extras (fixed) + bond.
  let breakdown = $derived.by(() => {
    let food = 0, fixed = 0;
    for (const l of lines) {
      if (l.bond) continue;
      const t = lineQty(l as any, { ...active, min }) * l.price;
      if (l.scope === 'fixed') fixed += t; else food += t;
    }
    return { food, hire: fixed + result.bond, vs: result.grand - data.originalQuote };
  });

  async function post(payload: unknown) {
    return fetch('/dashboard/venue/quote', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
    });
  }
  function saveLine(line: any, field: 'label' | 'scope' | 'meal' | 'price' | 'qty' | 'bond') {
    post({ id: line.id, field, value: line[field] });
  }
  async function addLine(section: string) {
    const res = await post({ op: 'add', section });
    const { id } = await res.json();
    lines = [...lines, { id, label: 'New item', section, scope: 'fixed', meal: 'any', price: 0, qty: null, included: false, confirmed: true, bond: false, sort: lines.length }];
  }
  function removeLine(line: any) {
    post({ op: 'remove', id: line.id });
    lines = lines.filter((l) => l.id !== line.id);
  }

  // ---- Section header management ----

  function uniqueName(base: string) {
    let name = base, n = 2;
    while (sections.some((s) => s.name === name)) name = `${base} ${n++}`;
    return name;
  }
  async function addSection() {
    const name = uniqueName('New section');
    const res = await post({ op: 'addSection', name });
    const { id } = await res.json();
    sections = [...sections, { id, name, sort: sections.length }];
  }
  // Reads the new name off the input on blur rather than binding, so typing
  // doesn't re-group lines mid-edit. Duplicate names would merge two groups,
  // so they get a numeric suffix.
  function renameSection(s: any, e: FocusEvent) {
    const input = e.currentTarget as HTMLInputElement;
    let name = input.value.trim() || 'Section';
    if (name === s.name) { input.value = s.name; return; }
    if (sections.some((o) => o !== s && o.name === name)) name = uniqueName(name);
    const old = s.name;
    s.name = name;
    input.value = name;
    for (const l of lines) if (l.section === old) l.section = name;
    post({ op: 'renameSection', id: s.id, name });
  }
  function removeSection(s: any) {
    const items = lines.filter((l) => l.section === s.name);
    let moveTo: string | undefined;
    if (items.length) {
      const i = sections.indexOf(s);
      const neighbour = sections[i - 1] ?? sections[i + 1];
      if (!neighbour) { alert('Can’t remove the only section while it still has items.'); return; }
      if (!confirm(`Remove “${s.name}”? Its ${items.length} item${items.length === 1 ? '' : 's'} will move to “${neighbour.name}”.`)) return;
      moveTo = neighbour.name;
      for (const l of items) l.section = moveTo;
    }
    sections = sections.filter((o) => o !== s);
    post({ op: 'removeSection', id: s.id, moveTo });
  }

  // ---- Drag & drop (native HTML5) ----
  // Rows drag between/within sections; bands drag to reorder sections.

  type Drag = { type: 'line'; id: number } | { type: 'section'; id: number } | null;
  let drag = $state<Drag>(null);
  // Current drop indicator: a line/section id plus whether we'd land after it,
  // or an empty section acting as one big drop zone.
  let over = $state<{ key: string; after: boolean } | null>(null);

  function startDrag(e: DragEvent, d: NonNullable<Drag>) {
    drag = d;
    e.dataTransfer!.effectAllowed = 'move';
    // The handle is the draggable element; show the whole row as the ghost.
    const row = (e.currentTarget as HTMLElement).closest('.qrow, .band');
    if (row) e.dataTransfer!.setDragImage(row, 20, row.clientHeight / 2);
  }
  function overTarget(e: DragEvent, key: string, allow: 'line' | 'section') {
    if (drag?.type !== allow) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    over = { key, after: e.clientY > r.top + r.height / 2 };
  }
  function endDrag() { drag = null; over = null; }

  function persistLineOrder() {
    // Normalise the flat array to match display order, then save it all.
    const flat = grouped.flatMap((g) => g.items);
    lines = flat;
    post({ op: 'reorder', lines: flat.map((l, i) => ({ id: l.id, section: l.section, sort: i })) });
  }
  function dropOnLine(target: any) {
    if (drag?.type !== 'line') return;
    const moving = lines.find((l) => l.id === drag!.id);
    if (!moving || moving === target) return endDrag();
    const after = over?.after ?? true;
    moving.section = target.section;
    const rest = lines.filter((l) => l !== moving);
    const i = rest.indexOf(target);
    rest.splice(i + (after ? 1 : 0), 0, moving);
    lines = rest;
    persistLineOrder();
    endDrag();
  }
  // A band accepts lines (drop = top of that section) and sections (reorder).
  function dropOnSection(target: any) {
    if (drag?.type === 'line') {
      const moving = lines.find((l) => l.id === drag!.id);
      if (!moving) return endDrag();
      moving.section = target.name;
      const rest = lines.filter((l) => l !== moving);
      const group = grouped.find((g) => g.s === target);
      const first = group?.items.find((l) => l !== moving);
      rest.splice(first ? rest.indexOf(first) : rest.length, 0, moving);
      lines = rest;
      persistLineOrder();
    } else if (drag?.type === 'section') {
      const moving = sections.find((s) => s.id === drag!.id);
      if (!moving || moving === target) return endDrag();
      const after = over?.after ?? true;
      const rest = sections.filter((s) => s !== moving);
      rest.splice(rest.indexOf(target) + (after ? 1 : 0), 0, moving);
      sections = rest;
      post({ op: 'sectionOrder', sections: rest.map((s, i) => ({ id: s.id, sort: i })) });
    }
    endDrag();
  }
  function saveSetting(setting: 'dayGuests' | 'eveGuests' | 'minSpend' | 'vegGuests', value: number) {
    post({ setting, value });
  }
  function saveBasis() {
    post({ setting: 'venueCostBasis', value: basis });
  }
  function reset() {
    manual = { day: 61, eve: 90, veg: 6 }; min = 16455;
    saveSetting('dayGuests', manual.day); saveSetting('eveGuests', manual.eve);
    saveSetting('vegGuests', manual.veg); saveSetting('minSpend', min);
  }
</script>

<div class="ctrls">
  <label>Cost basis
    <select class="basis" bind:value={basis} onchange={saveBasis}>
      <option value="manual">Manual counts</option>
      <option value="estimate">All invited (estimate)</option>
      <option value="confirmed">RSVP confirmed</option>
    </select>
  </label>
  {#if basis === 'manual'}
    <label>Day guests <input type="number" bind:value={manual.day} onchange={() => saveSetting('dayGuests', manual.day)} /></label>
    <label>Evening guests (total) <input type="number" bind:value={manual.eve} onchange={() => saveSetting('eveGuests', manual.eve)} /></label>
    <label>Vegetarian (day) <input type="number" bind:value={manual.veg} onchange={() => saveSetting('vegGuests', manual.veg)} /></label>
  {:else}
    <span class="derived-counts">
      <strong>{active.day}</strong> day · <strong>{active.eve}</strong> evening · <strong>{active.veg}</strong> veg
      <em>from the guest list — {basis === 'confirmed' ? 'RSVP yes only' : 'everyone who hasn’t declined'}</em>
    </span>
  {/if}
  <label>Min. spend (£) <input type="number" bind:value={min} onchange={() => saveSetting('minSpend', min)} /></label>
  <button class="reset" type="button" onclick={reset}>Reset</button>
  <span class="auto">edits save automatically · this basis drives the Budget’s Venue line</span>
</div>

<div class="card compare">
  <div class="c" class:active={basis === 'estimate'}>
    <span>All invited (estimate)</span><strong>{gbp(estimateGrand)}</strong>
  </div>
  <div class="c" class:active={basis === 'confirmed'}>
    <span>RSVP confirmed so far</span><strong>{gbp(confirmedGrand)}</strong>
  </div>
  <div class="c">
    <span>Original 80-cover quote</span><strong>{gbp(data.originalQuote)}</strong>
  </div>
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

  {#each grouped as g (g.s.id)}
    <div
      class="band"
      class:drop-before={over?.key === `s${g.s.id}` && !over.after && drag?.type === 'section'}
      class:drop-after={over?.key === `s${g.s.id}` && over.after && drag?.type === 'section'}
      class:drop-into={over?.key === `s${g.s.id}` && drag?.type === 'line'}
      role="listitem"
      ondragover={(e) => overTarget(e, `s${g.s.id}`, drag?.type === 'line' ? 'line' : 'section')}
      ondrop={() => dropOnSection(g.s)}
    >
      <span class="grip" draggable="true" title="Drag to reorder sections"
        ondragstart={(e) => startDrag(e, { type: 'section', id: g.s.id })} ondragend={endDrag}>⋮⋮</span>
      <input class="bandname" value={g.s.name} onblur={(e) => renameSection(g.s, e)} />
      <span class="bandcount">{g.items.length} item{g.items.length === 1 ? '' : 's'}</span>
      <button class="banditem" type="button" onclick={() => addLine(g.s.name)} title="Add item to this section">+ item</button>
      <button class="rm" type="button" onclick={() => removeSection(g.s)} title="Remove section" aria-label="Remove section">×</button>
    </div>

    {#each g.items as line (line.id)}
      {@const qty = lineQty(line as any, { ...active, min })}
      <div
        class="qrow"
        class:dragging={drag?.type === 'line' && drag.id === line.id}
        class:drop-before={over?.key === `l${line.id}` && !over.after}
        class:drop-after={over?.key === `l${line.id}` && over.after}
        role="listitem"
        ondragover={(e) => overTarget(e, `l${line.id}`, 'line')}
        ondrop={() => dropOnLine(line)}
      >
        <span class="itemcell">
          <span class="grip" draggable="true" title="Drag to reorder"
            ondragstart={(e) => startDrag(e, { type: 'line', id: line.id })} ondragend={endDrag}>⋮⋮</span>
          <input class="label" bind:value={line.label} onblur={() => saveLine(line, 'label')} placeholder="Item" />
          {#if !line.confirmed}<span class="confirm">Confirm</span>{/if}
          {#if line.scope === 'day'}
            <select class="meal" class:mealset={line.meal !== 'any'} bind:value={line.meal} onchange={() => saveLine(line, 'meal')} title="Who this per-head price applies to">
              <option value="any">everyone</option>
              <option value="veg">veg only</option>
              <option value="nonveg">non-veg only</option>
            </select>
          {/if}
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
    {:else}
      <div
        class="emptysec"
        class:drop-into={over?.key === `e${g.s.id}`}
        role="listitem"
        ondragover={(e) => overTarget(e, `e${g.s.id}`, 'line')}
        ondrop={() => dropOnSection(g.s)}
      >No items — drag one here or use “+ item”</div>
    {/each}
  {/each}

  <button class="addrow" type="button" onclick={addSection}>+ Add section</button>
</div>

<div class="card totals">
  <div class="row"><span>Food &amp; drink subtotal</span><span>{gbp(breakdown.food)}</span></div>
  <div class="row"><span>Minimum-spend top-up <i>(if below min)</i></span><span>{gbp(result.topup)}</span></div>
  <div class="row"><span>Hire, ceremony &amp; extras</span><span>{gbp(breakdown.hire)}</span></div>
  <div class="row grand"><span>Estimated total</span><span>{gbp(result.grand)}</span></div>
  <p class="vs">
    Original 80-cover quote: {gbp(data.originalQuote)} ·
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
  .ctrls .basis { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 14px; background: #fff; cursor: pointer; }
  .derived-counts { font-size: 14px; color: var(--body); padding: 9px 0; }
  .derived-counts strong { color: var(--ink); font-size: 16px; }
  .derived-counts em { display: block; font-style: normal; font-size: 11px; color: var(--muted); }
  .compare { display: flex; flex-wrap: wrap; gap: 0; padding: 0; overflow: hidden; }
  .compare .c { flex: 1; min-width: 160px; display: grid; gap: 2px; padding: 14px 18px; border-right: 1px solid var(--line2); }
  .compare .c:last-child { border-right: 0; }
  .compare .c.active { background: var(--sage-soft); }
  .compare .c span { font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .compare .c strong { font-family: var(--serif); font-size: 22px; color: var(--ink); }
  .meal { flex: none; border: 1px solid transparent; background: transparent; color: var(--faint); font: inherit; font-size: 11px; padding: 3px 2px; border-radius: 6px; cursor: pointer; }
  .meal.mealset { color: var(--sage-deep); background: var(--sage-soft); }
  .meal:focus { outline: none; border-color: var(--line); background: #fff; }
  .reset { background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 9px 16px; font: inherit; font-size: 11px;
    letter-spacing: .08em; text-transform: uppercase; color: var(--muted); cursor: pointer; }
  .reset:hover { border-color: var(--sage); color: var(--sage-deep); }
  .auto { font-size: 12px; color: var(--faint); margin-bottom: 10px; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 8px 18px; margin-bottom: 18px; }
  .qrow { display: grid; grid-template-columns: minmax(220px, 2.6fr) 140px 64px 96px 110px 80px; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--line2); }
  .qrow:last-of-type { border-bottom: 0; }
  .qrow.head { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 0 8px; border-bottom: 1px solid var(--line); }
  .r { text-align: right; }

  .band { display: flex; align-items: center; gap: 8px; background: #f1ece0; color: #9a7b53;
    padding: 4px 12px 4px 8px; border-radius: 6px; margin: 8px 0 2px; }
  .bandname { flex: 1; min-width: 0; border: 1px solid transparent; border-radius: 6px; padding: 4px 6px;
    background: transparent; color: inherit; font: inherit; font-size: 10px; font-weight: 700;
    letter-spacing: .16em; text-transform: uppercase; }
  .bandname:hover { background: rgba(255, 255, 255, .5); }
  .bandname:focus { outline: none; background: #fff; border-color: var(--line); }
  .bandcount { font-size: 10px; color: #bda98a; white-space: nowrap; }
  .band .banditem, .band .rm { opacity: 0; transition: opacity .12s; }
  .band:hover .banditem, .band:hover .rm { opacity: 1; }
  .banditem { background: none; border: 1px solid #dccfb4; border-radius: 6px; color: inherit; font: inherit;
    font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 3px 8px; cursor: pointer; }
  .banditem:hover { background: #fff; }

  .grip { flex: none; cursor: grab; color: var(--faint); font-size: 11px; letter-spacing: -1px; user-select: none;
    padding: 4px 2px; opacity: 0; transition: opacity .12s; }
  .qrow:hover .grip, .band:hover .grip, .grip:active { opacity: 1; }
  .grip:active { cursor: grabbing; }

  .dragging { opacity: .35; }
  .drop-before { box-shadow: 0 -2px 0 0 var(--sage-deep, #6b7f5e); }
  .drop-after { box-shadow: 0 2px 0 0 var(--sage-deep, #6b7f5e); }
  .band.drop-into, .emptysec.drop-into { outline: 2px solid var(--sage-deep, #6b7f5e); outline-offset: -1px; }
  .emptysec { padding: 12px; font-size: 12px; color: var(--faint); font-style: italic; border: 1px dashed var(--line);
    border-radius: 6px; margin: 4px 0; }

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

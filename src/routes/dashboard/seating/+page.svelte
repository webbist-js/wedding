<script lang="ts">
  import FloorPlan from '$lib/components/FloorPlan.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { TABLE_KINDS, kindLabel, kindShape, seatPositions, initials, COUPLE } from '$lib/seating';
  let { data } = $props();

  let tab = $state<'plan' | 'floor'>('plan');

  type Occ = {
    key: string;
    name: string;
    side: string;
    tableNo: number | null;
    seatNo: number | null;
    couple: boolean;
  };

  // Seatable occupants: RSVP-yes guests (narrowed to the sitting) + the couple.
  let attending = $derived(data.guests.filter((g) => g.rsvpStatus === 'yes'));
  let guestPool = $derived(
    data.seatMode === 'day' ? attending.filter((g) => g.attendanceType === 'day') : attending
  );
  let occupants = $derived.by<Occ[]>(() => {
    const list: Occ[] = guestPool.map((g) => ({
      key: `guest:${g.id}`,
      name: g.name,
      side: g.side,
      tableNo: g.tableNo,
      seatNo: g.seatNo,
      couple: false
    }));
    for (const c of COUPLE) {
      const pos = data.couple[c.key as 'bride' | 'groom'];
      list.push({
        key: `couple:${c.key}`,
        name: c.name,
        side: c.side,
        tableNo: pos?.tableNo ?? null,
        seatNo: pos?.seatNo ?? null,
        couple: true
      });
    }
    return list;
  });

  let unassigned = $derived(occupants.filter((o) => o.tableNo == null));

  const kindEntries = Object.entries(TABLE_KINDS);
  const tableName = (t: { label: string | null; number: number }) => t.label || `Table ${t.number}`;

  function submitOnChange(e: Event) {
    (e.currentTarget as HTMLElement & { form: HTMLFormElement | null }).form?.requestSubmit();
  }

  // ---- Drag and drop ----
  let dragging = $state<string | null>(null);
  let hoverKey = $state<string | null>(null);

  function onDragStart(e: DragEvent, occKey: string) {
    dragging = occKey;
    e.dataTransfer?.setData('text/plain', occKey);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() {
    dragging = null;
    hoverKey = null;
  }
  function allowDrop(e: DragEvent, key: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    hoverKey = key;
  }
  async function place(occupant: string, tableNo: number | null, seatNo: number | null) {
    await fetch('/dashboard/seating/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ occupant, tableNo, seatNo })
    });
    await invalidateAll();
  }
  async function onDrop(e: DragEvent, tableNo: number | null, seatNo: number | null) {
    e.preventDefault();
    const occ = e.dataTransfer?.getData('text/plain') || dragging;
    dragging = null;
    hoverKey = null;
    if (occ) await place(occ, tableNo, seatNo);
  }
</script>

{#snippet sidePill(side: string)}
  {#if side === 'B'}<span class="pill bride">Bride</span>
  {:else if side === 'G'}<span class="pill groom">Groom</span>
  {:else}<span class="pill both">Both</span>{/if}
{/snippet}


<div class="tabs">
  <button class:active={tab === 'plan'} onclick={() => (tab = 'plan')}>Plan</button>
  <button class:active={tab === 'floor'} onclick={() => (tab = 'floor')}>Floor plan</button>
</div>

{#if tab === 'floor'}
  <FloorPlan tables={data.tables} {occupants} />
{:else}
<div class="ctrls">
  <form method="POST" action="?/setMode" use:enhance class="seg">
    <input type="hidden" name="seatMode" value={data.seatMode === 'day' ? 'all' : 'day'} />
    <span class="seg-label">Showing</span>
    <button class:active={data.seatMode === 'day'} type="submit" disabled={data.seatMode === 'day'}>Day</button>
    <button class:active={data.seatMode === 'all'} type="submit" disabled={data.seatMode === 'all'}>All guests</button>
  </form>
  <form method="POST" action="?/addTable" use:enhance class="add-table">
    <select name="kind">
      {#each kindEntries as [key, k]}<option value={key}>{k.label}</option>{/each}
    </select>
    <button type="submit">+ Add table</button>
  </form>
  <form method="POST" action="?/clear" use:enhance><button class="clear">Clear all</button></form>
</div>

<div
  class="card pool"
  class:drop-hot={hoverKey === 'pool'}
  role="list"
  ondragover={(e) => allowDrop(e, 'pool')}
  ondragleave={() => (hoverKey = hoverKey === 'pool' ? null : hoverKey)}
  ondrop={(e) => onDrop(e, null, null)}
>
  <h3 class="kick">Unassigned · {unassigned.length}</h3>
  <p class="hint">
    Drag a name onto a seat to place them — drag here to unseat. Only the couple and guests who've
    RSVP'd <b>yes</b> can be seated{data.seatMode === 'day' ? ' (day sitting)' : ''}.
  </p>
  <div class="chips">
    {#each unassigned as o (o.key)}
      <div
        class="chip"
        class:couple={o.couple}
        role="listitem"
        draggable="true"
        ondragstart={(e) => onDragStart(e, o.key)}
        ondragend={onDragEnd}
      >
        {#if o.couple}<span class="crown" title="The couple">♥</span>{/if}
        {@render sidePill(o.side)}
        <span class="nm">{o.name}</span>
        <form method="POST" action="?/assign" use:enhance class="picker">
          {#if o.couple}<input type="hidden" name="who" value={o.key.split(':')[1]} />{:else}<input type="hidden" name="guestId" value={o.key.split(':')[1]} />{/if}
          <select name="tableNo" value="" onchange={submitOnChange}>
            <option value="">Seat at…</option>
            {#each data.tables as t (t.id)}<option value={t.number}>{tableName(t)}</option>{/each}
          </select>
        </form>
      </div>
    {/each}
    {#if unassigned.length === 0}<span class="empty">Everyone seatable is seated.</span>{/if}
  </div>
</div>

<div class="tables">
  {#each data.tables as t (t.id)}
    {@const shape = kindShape(t.kind)}
    {@const atTable = occupants.filter((o) => o.tableNo === t.number)}
    {@const overflow = atTable.filter((o) => o.seatNo == null)}
    {@const positions = seatPositions(shape, t.seats)}
    <div class="tbl">
      <div class="cap">
        <span class="nm">{tableName(t)}</span>
        <span class="ct" class:over={atTable.length > t.seats}>{atTable.length}/{t.seats}</span>
      </div>

      <form method="POST" action="?/updateTable" use:enhance class="tbl-edit">
        <input type="hidden" name="id" value={t.id} />
        <input class="label-in" name="label" value={t.label ?? ''} placeholder={`Table ${t.number}`} onchange={submitOnChange} />
        <select name="kind" value={t.kind} onchange={submitOnChange} title="Arrangement">
          {#each kindEntries as [key]}<option value={key}>{kindLabel(key)}</option>{/each}
        </select>
        <label class="seats">seats<input name="seats" type="number" min="1" max="40" value={t.seats} onchange={submitOnChange} /></label>
        <button class="rm-tbl" formaction="?/removeTable" title="Remove table (frees its guests)"
                onclick={(e) => { if (!confirm(`Remove ${tableName(t)}? Anyone seated there moves back to unassigned.`)) e.preventDefault(); }}>×</button>
      </form>

      <div class={`stage ${shape}`}>
        <div class={`surface ${shape}`}></div>
        {#each positions as p, i}
          {@const seatNo = i + 1}
          {@const occ = atTable.find((o) => o.seatNo === seatNo)}
          <div
            class="seat"
            class:filled={!!occ}
            class:bride={occ?.side === 'B'}
            class:groom={occ?.side === 'G'}
            class:drop-hot={hoverKey === `${t.number}:${seatNo}`}
            role="button"
            tabindex="-1"
            aria-label={occ ? `Seat ${seatNo}, ${occ.name}` : `Seat ${seatNo}, empty`}
            style={`left:${p.x}%;top:${p.y}%`}
            title={occ ? `Seat ${seatNo} — ${occ.name}` : `Seat ${seatNo} (empty)`}
            draggable={!!occ}
            ondragstart={(e) => occ && onDragStart(e, occ.key)}
            ondragend={onDragEnd}
            ondragover={(e) => allowDrop(e, `${t.number}:${seatNo}`)}
            ondragleave={() => (hoverKey = hoverKey === `${t.number}:${seatNo}` ? null : hoverKey)}
            ondrop={(e) => onDrop(e, t.number, seatNo)}
          >
            {#if occ}{#if occ.couple}<span class="mini-crown">♥</span>{/if}{initials(occ.name)}{:else}<span class="snum">{seatNo}</span>{/if}
          </div>
        {/each}
      </div>

      <ul class="seated">
        {#each atTable.filter((o) => o.seatNo != null).sort((a, b) => (a.seatNo ?? 0) - (b.seatNo ?? 0)) as o (o.key)}
          <li draggable="true" ondragstart={(e) => onDragStart(e, o.key)} ondragend={onDragEnd}>
            <span class="seatno">{o.seatNo}</span>{@render sidePill(o.side)}<span class="gname">{o.couple ? '♥ ' : ''}{o.name}</span>
            <button class="rm" title="Unseat" onclick={() => place(o.key, null, null)}>×</button>
          </li>
        {/each}
        {#each overflow as o (o.key)}
          <li class="ovf" draggable="true" ondragstart={(e) => onDragStart(e, o.key)} ondragend={onDragEnd}>
            <span class="seatno">–</span>{@render sidePill(o.side)}<span class="gname">{o.couple ? '♥ ' : ''}{o.name}</span>
            <button class="rm" title="Unseat" onclick={() => place(o.key, null, null)}>×</button>
          </li>
        {/each}
        {#if atTable.length === 0}<li class="vacant">No one seated yet</li>{/if}
      </ul>
    </div>
  {/each}
  {#if data.tables.length === 0}<p class="empty">No tables yet — add one above.</p>{/if}
</div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; margin-bottom: 18px; }
  .tabs button { background: transparent; border: 1px solid var(--line); color: var(--muted); border-radius: 999px;
    padding: 7px 18px; font: inherit; font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
  .tabs button.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  .ctrls { display: flex; gap: 18px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .ctrls form { display: flex; gap: 8px; align-items: center; }
  .ctrls button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .ctrls .clear { background: transparent; color: var(--faint); border: 1px solid var(--line); }
  .add-table select { border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
  .seg { gap: 6px !important; }
  .seg-label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .seg button { background: transparent; color: var(--muted); border: 1px solid var(--line); }
  .seg button.active { background: var(--sage); color: #fff; border-color: var(--sage); opacity: 1; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 18px; transition: border-color .15s, background-color .15s; }
  .pool.drop-hot { border-color: var(--terra); background: var(--terra-bg); }
  .kick { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 6px; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .empty { font-size: 12.5px; color: var(--muted); font-style: italic; }
  .chip { display: inline-flex; align-items: center; gap: 8px; background: #faf8f2; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; font-size: 12.5px; cursor: grab; }
  .chip:active { cursor: grabbing; }
  .chip.couple { background: var(--sage-soft); border-color: var(--sage); }
  .chip .nm { font-weight: 500; }
  .crown { color: var(--terra); font-size: 12px; }
  .picker select, .chip select { border: 0; background: transparent; color: var(--sage-deep); cursor: pointer; font: inherit; font-size: 11px; }

  .pill { font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border-radius: 999px; padding: 2px 6px; line-height: 1.4; white-space: nowrap; }
  .pill.bride { background: var(--terra-bg); color: var(--terra); }
  .pill.groom { background: var(--sage-soft); color: var(--sage-deep); }
  .pill.both { background: #efece3; color: var(--muted); }

  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
  .tbl { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .cap { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .cap .nm { font-weight: 600; flex: 1; }
  .cap .ct { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--sage); }
  .cap .ct.over { color: var(--terra); }

  .tbl-edit { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid var(--line2); }
  .tbl-edit .label-in { flex: 1 1 80px; min-width: 0; border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; font: inherit; font-size: 12px; }
  .tbl-edit select { border: 1px solid var(--line); border-radius: 6px; padding: 5px 6px; font: inherit; font-size: 11.5px; }
  .tbl-edit .seats { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); display: flex; gap: 4px; align-items: center; }
  .tbl-edit .seats input { width: 46px; border: 1px solid var(--line); border-radius: 6px; padding: 5px 6px; font: inherit; font-size: 12px; }
  .rm-tbl { background: none; border: 1px solid var(--line); border-radius: 6px; color: var(--faint); cursor: pointer; font-size: 14px; width: 26px; height: 26px; line-height: 1; }
  .rm-tbl:hover { border-color: var(--terra); color: var(--terra); }

  /* Visual table stage with seats positioned around it */
  .stage { position: relative; height: 190px; margin: 6px 0 10px; }
  .stage.long { height: 130px; }
  .stage.sweetheart { height: 110px; }
  .surface { position: absolute; background: #f1ede3; border: 1px solid var(--line); }
  .surface.round { inset: 26%; border-radius: 50%; }
  .surface.oval { inset: 30% 18%; border-radius: 50%; }
  .surface.square { inset: 28%; border-radius: 8px; }
  .surface.long { inset: 36% 8%; border-radius: 8px; }
  .surface.sweetheart { inset: 30% 34%; border-radius: 10px; }

  .seat { position: absolute; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 50%; border: 1.5px dashed var(--line); display: grid; place-items: center; font-size: 11px; font-weight: 700; color: var(--faint); background: var(--bg); user-select: none; }
  .seat .snum { font-weight: 500; opacity: .7; }
  .seat.filled { border-style: solid; cursor: grab; color: var(--ink); }
  .seat.filled:active { cursor: grabbing; }
  .seat.filled.bride { background: var(--terra-bg); border-color: var(--terra); color: var(--terra); }
  .seat.filled.groom { background: var(--sage-soft); border-color: var(--sage); color: var(--sage-deep); }
  .seat.drop-hot { border-color: var(--sage-deep); box-shadow: 0 0 0 3px var(--sage-soft); }
  .mini-crown { font-size: 8px; line-height: 0; margin-right: 1px; }

  .seated { list-style: none; margin: 0; padding: 0; }
  .seated li { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 0; cursor: grab; }
  .seated li.vacant { color: var(--faint); font-style: italic; cursor: default; }
  .seated li.ovf .seatno { color: var(--terra); }
  .seatno { font-size: 10px; font-weight: 700; color: var(--muted); width: 16px; text-align: center; flex: none; }
  .gname { flex: 1; }
  .rm { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 13px; }
  .rm:hover { color: var(--terra); }
</style>

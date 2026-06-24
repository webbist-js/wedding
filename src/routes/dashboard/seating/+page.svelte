<script lang="ts">
  import FloorPlan from '$lib/components/FloorPlan.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { TABLE_KINDS, kindLabel, COUPLE } from '$lib/seating';
  let { data } = $props();

  let tab = $state<'plan' | 'floor'>('plan');

  type Occ = {
    key: string;
    name: string;
    side: string;
    attend: 'day' | 'evening' | null;
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
      attend: g.attendanceType,
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
        attend: null,
        tableNo: pos?.tableNo ?? null,
        seatNo: pos?.seatNo ?? null,
        couple: true
      });
    }
    return list;
  });

  let unassigned = $derived(occupants.filter((o) => o.tableNo == null));
  let seatedCount = $derived(occupants.length - unassigned.length);
  let capacityTotal = $derived(data.tables.reduce((a, t) => a + t.seats, 0));

  let q = $state('');
  let filteredPool = $derived(
    !q ? unassigned : unassigned.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()))
  );

  const kindEntries = Object.entries(TABLE_KINDS);
  const tableName = (t: { label: string | null; number: number }) => t.label || `Table ${t.number}`;
  function submitOnChange(e: Event) {
    (e.currentTarget as HTMLElement & { form: HTMLFormElement | null }).form?.requestSubmit();
  }

  async function place(occupant: string, tableNo: number | null, seatNo: number | null = null) {
    await fetch('/dashboard/seating/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ occupant, tableNo, seatNo })
    });
    await invalidateAll();
  }

  // ---- Click-to-assign: pick a guest, then click a table ----
  let selected = $state<string | null>(null);
  let selectedName = $derived(unassigned.find((o) => o.key === selected)?.name ?? null);
  async function assignTo(tableNo: number) {
    if (!selected) return;
    const who = selected;
    selected = null;
    await place(who, tableNo, null);
  }

  // ---- Drag (optional): drag a guest onto a table ----
  let dragging = $state<string | null>(null);
  let hoverTable = $state<number | null>(null);
  function onDragStart(e: DragEvent, key: string) {
    dragging = key;
    e.dataTransfer?.setData('text/plain', key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  async function onDropTable(e: DragEvent, tableNo: number) {
    e.preventDefault();
    const occ = e.dataTransfer?.getData('text/plain') || dragging;
    dragging = null;
    hoverTable = null;
    if (occ) await place(occ, tableNo, null);
  }

  // ---- Per-table settings popover ----
  let openSettings = $state<number | null>(null);
</script>

<div class="tabs">
  <button class:active={tab === 'plan'} onclick={() => (tab = 'plan')}>Plan</button>
  <button class:active={tab === 'floor'} onclick={() => (tab = 'floor')}>Floor plan</button>
</div>

{#if tab === 'floor'}
  <FloorPlan tables={data.tables} {occupants} />
{:else}
  <!-- Stats -->
  <div class="stats">
    <div class="stat"><div class="v">{occupants.length}</div><div class="l">To seat</div></div>
    <div class="stat hero"><div class="v">{seatedCount}</div><div class="l">Seated</div></div>
    <div class="stat"><div class="v">{unassigned.length}</div><div class="l">Unassigned</div></div>
    <div class="stat"><div class="v">{data.tables.length}</div><div class="l">Tables</div></div>
    <div class="stat"><div class="v">{seatedCount}/{capacityTotal}</div><div class="l">Capacity used</div></div>
  </div>

  <!-- Actions -->
  <div class="actions">
    <form method="POST" action="?/addTable" use:enhance><button class="btn primary" type="submit">+ Add table</button></form>
    <form method="POST" action="?/autofill" use:enhance><button class="btn" type="submit">Auto-fill</button></form>
    <form method="POST" action="?/clear" use:enhance
      onsubmit={(e) => { if (!confirm('Clear every seat assignment?')) e.preventDefault(); }}>
      <button class="btn" type="submit">Clear all</button>
    </form>
  </div>

  <div class="layout">
    <!-- Unassigned panel -->
    <aside class="pool">
      <div class="pool-head"><span>Unassigned</span><span class="n">{unassigned.length}</span></div>
      <form method="POST" action="?/setMode" use:enhance class="seg">
        <input type="hidden" name="seatMode" value={data.seatMode === 'day' ? 'all' : 'day'} />
        <button class:active={data.seatMode === 'day'} type="submit" disabled={data.seatMode === 'day'}>Day</button>
        <button class:active={data.seatMode === 'all'} type="submit" disabled={data.seatMode === 'all'}>All guests</button>
      </form>
      <input class="search" placeholder="Search guests…" bind:value={q} />
      <div class="pool-list">
        {#each filteredPool as o (o.key)}
          <button
            class="grow"
            class:sel={selected === o.key}
            draggable="true"
            ondragstart={(e) => onDragStart(e, o.key)}
            onclick={() => (selected = selected === o.key ? null : o.key)}
          >
            <span class="nm">{#if o.couple}<span class="heart">♥</span>{/if}{o.name}</span>
            {#if o.attend}<span class="tag">{o.attend === 'day' ? 'Day' : 'Eve'}</span>{/if}
          </button>
        {/each}
        {#if filteredPool.length === 0}<p class="empty">{unassigned.length === 0 ? 'Everyone is seated.' : 'No matches.'}</p>{/if}
      </div>
      {#if selectedName}<p class="cue">Now click a table to seat <b>{selectedName}</b>.</p>{/if}
    </aside>

    <!-- Tables grid -->
    <div class="tables">
      {#each data.tables as t (t.id)}
        {@const at = occupants.filter((o) => o.tableNo === t.number)}
        {@const full = at.length >= t.seats}
        <div
          class="tbl"
          class:armed={!!selected}
          class:hover={hoverTable === t.number}
          role="button"
          tabindex="0"
          onclick={(e) => { if (!(e.target as HTMLElement).closest('.settings,.gear,.rm')) assignTo(t.number); }}
          onkeydown={(e) => { if (e.key === 'Enter') assignTo(t.number); }}
          ondragover={(e) => { e.preventDefault(); hoverTable = t.number; }}
          ondragleave={() => (hoverTable = hoverTable === t.number ? null : hoverTable)}
          ondrop={(e) => onDropTable(e, t.number)}
        >
          <div class="thead">
            <span class="tname">{tableName(t)}</span>
            <span class="tcap" class:over={at.length > t.seats}>{at.length}/{t.seats}</span>
            <button class="gear" title="Table settings"
              onclick={(e) => { e.stopPropagation(); openSettings = openSettings === t.id ? null : t.id; }} aria-label="Table settings">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.4 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z"/></svg>
            </button>
          </div>

          {#if openSettings === t.id}
            <div class="settings">
              <input class="s-label" name="label" value={t.label ?? ''} placeholder={`Table ${t.number}`}
                form={`tf-${t.id}`} onchange={submitOnChange} />
              <select class="s-kind" value={t.kind} form={`tf-${t.id}`} onchange={submitOnChange}>
                {#each kindEntries as [key]}<option value={key}>{kindLabel(key)}</option>{/each}
              </select>
              <label class="s-seats">seats <input type="number" min="1" max="40" name="seats" value={t.seats} form={`tf-${t.id}`} onchange={submitOnChange} /></label>
              <form method="POST" action="?/updateTable" use:enhance id={`tf-${t.id}`}>
                <input type="hidden" name="id" value={t.id} />
              </form>
              <form method="POST" action="?/removeTable" use:enhance
                onsubmit={(e) => { if (!confirm(`Remove ${tableName(t)}? Anyone seated there moves back to unassigned.`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={t.id} />
                <button class="s-remove" type="submit">Remove table</button>
              </form>
            </div>
          {/if}

          <div class="dots">
            {#each Array(t.seats) as _, i}
              <span class="dot" class:on={i < at.length} class:full={full && i < at.length}></span>
            {/each}
          </div>

          {#if at.length}
            <ul class="seated">
              {#each [...at].sort((a, b) => (a.seatNo ?? 99) - (b.seatNo ?? 99)) as o (o.key)}
                <li>
                  <span class="oname">{#if o.couple}<span class="heart">♥</span>{/if}{o.name}</span>
                  <button class="rm" title="Unseat" onclick={(e) => { e.stopPropagation(); place(o.key, null, null); }}>×</button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="vacant">Empty — pick a guest, then click a table</p>
          {/if}
        </div>
      {/each}
      {#if data.tables.length === 0}<p class="empty">No tables yet — add one above.</p>{/if}
    </div>
  </div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; margin-bottom: 18px; }
  .tabs button { background: transparent; border: 1px solid var(--line); color: var(--muted); border-radius: 999px;
    padding: 7px 18px; font: inherit; font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
  .tabs button.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  /* Stats */
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 18px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }
  .stat .v { font-family: var(--serif); font-weight: 600; font-size: 30px; color: var(--ink); line-height: 1; }
  .stat .l { font-weight: 600; letter-spacing: .14em; text-transform: uppercase; font-size: 9.5px; color: var(--muted); margin-top: 7px; }
  .stat.hero { background: var(--sage); border-color: var(--sage); }
  .stat.hero .v { color: #fff; }
  .stat.hero .l { color: rgba(255,255,255,.82); }
  @media (max-width: 900px) { .stats { grid-template-columns: repeat(2, 1fr); } }

  /* Actions */
  .actions { display: flex; gap: 10px; margin-bottom: 18px; }
  .actions form { margin: 0; }
  .btn { background: transparent; border: 1px solid var(--line); color: var(--body); border-radius: 8px; padding: 9px 16px;
    font: inherit; font-size: 11px; letter-spacing: .07em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
  .btn:hover { border-color: var(--sage); color: var(--sage-deep); }
  .btn.primary { background: var(--sage); color: #fff; border-color: var(--sage); }
  .btn.primary:hover { background: var(--sage-deep); color: #fff; }

  /* Layout */
  .layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
  @media (max-width: 880px) { .layout { grid-template-columns: 1fr; } }

  /* Unassigned panel */
  .pool { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; position: sticky; top: 16px; }
  .pool-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .pool-head span:first-child { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 11px; color: var(--sage); }
  .pool-head .n { font-size: 13px; color: var(--muted); font-weight: 600; }
  .seg { display: inline-flex; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 3px; gap: 3px; margin-bottom: 12px; }
  .seg button { background: transparent; border: 0; color: var(--muted); border-radius: 999px; padding: 6px 14px; font: inherit;
    font-size: 10px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
  .seg button.active { background: var(--sage); color: #fff; opacity: 1; }
  .search { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 13px; background: #fff; box-sizing: border-box; margin-bottom: 12px; }
  .pool-list { display: flex; flex-direction: column; gap: 7px; max-height: 60vh; overflow-y: auto; padding-right: 4px; }
  .grow { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left;
    background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 13.5px; color: var(--ink); cursor: pointer; }
  .grow:hover { border-color: var(--sage); }
  .grow.sel { border-color: var(--sage); background: var(--sage-soft); box-shadow: 0 0 0 2px var(--sage-soft); }
  .grow .nm { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grow .tag { font-size: 8.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); flex: none; }
  .heart { color: var(--terra); font-size: 11px; }
  .cue { margin: 12px 0 0; font-size: 12px; color: var(--sage-deep); }
  .empty { font-size: 12.5px; color: var(--muted); font-style: italic; padding: 6px 2px; }

  /* Tables grid */
  .tables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  @media (max-width: 1200px) { .tables { grid-template-columns: 1fr; } }
  .tbl { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; transition: box-shadow .15s, border-color .15s; }
  .tbl.armed { cursor: pointer; }
  .tbl.armed:hover, .tbl.hover { border-color: var(--sage); box-shadow: 0 0 0 3px var(--sage-soft); }
  .thead { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .tname { font-weight: 700; font-size: 16px; color: var(--ink); flex: 1; }
  .tcap { font-size: 12px; font-weight: 600; color: var(--sage-deep); }
  .tcap.over { color: var(--terra); }
  .gear { background: none; border: 0; color: var(--faint); cursor: pointer; padding: 2px; display: grid; place-items: center; }
  .gear:hover { color: var(--sage-deep); }

  .settings { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px; margin-bottom: 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; }
  .settings .s-label { flex: 1 1 120px; min-width: 0; border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 12px; }
  .settings .s-kind { border: 1px solid var(--line); border-radius: 6px; padding: 6px; font: inherit; font-size: 12px; }
  .settings .s-seats { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); display: inline-flex; align-items: center; gap: 5px; }
  .settings .s-seats input { width: 50px; border: 1px solid var(--line); border-radius: 6px; padding: 6px; font: inherit; font-size: 12px; }
  .s-remove { background: none; border: 0; color: var(--terra); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; cursor: pointer; margin-left: auto; }

  .dots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid var(--rule); background: transparent; }
  .dot.on { background: var(--sage); border-color: var(--sage); }
  .dot.full { background: var(--terra); border-color: var(--terra); }

  .seated { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
  .seated li { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--bg); border: 1px solid var(--line2); border-radius: 10px; padding: 9px 12px; }
  .oname { display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--ink); }
  .rm { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 15px; line-height: 1; }
  .rm:hover { color: var(--terra); }
  .vacant { font-size: 12.5px; color: var(--faint); font-style: italic; margin: 6px 0; }
</style>

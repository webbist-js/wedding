<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { kindShape, seatPositions, initials } from '$lib/seating';

  type Occ = { key: string; name: string; side: string; tableNo: number | null; seatNo: number | null; couple: boolean };
  type Tbl = { id: number; number: number; label: string | null; kind: string; seats: number; posX: number | null; posY: number | null; rotation: number };

  let { tables, occupants }: { tables: Tbl[]; occupants: Occ[] } = $props();

  let roomEl = $state<HTMLDivElement | null>(null);
  // Live overrides while dragging/rotating, before the server round-trips.
  let live = $state<Record<number, { x?: number; y?: number; rot?: number }>>({});
  let drag = $state<{ id: number; mode: 'move' | 'rotate'; offX: number; offY: number } | null>(null);

  const clamp = (v: number) => Math.max(2, Math.min(98, v));
  const idx = $derived(new Map(tables.map((t, i) => [t.id, i])));

  // Auto grid position (% of room) when a table has no saved position yet.
  function grid(i: number) {
    const cols = Math.ceil(Math.sqrt(tables.length || 1));
    const rows = Math.ceil((tables.length || 1) / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: ((col + 0.5) / cols) * 80 + 10, y: ((row + 0.5) / rows) * 78 + 11 };
  }
  const xOf = (t: Tbl) => live[t.id]?.x ?? t.posX ?? grid(idx.get(t.id) ?? 0).x;
  const yOf = (t: Tbl) => live[t.id]?.y ?? t.posY ?? grid(idx.get(t.id) ?? 0).y;
  const rotOf = (t: Tbl) => live[t.id]?.rot ?? t.rotation ?? 0;

  function size(t: Tbl) {
    const sh = kindShape(t.kind);
    if (sh === 'long') return { w: Math.min(330, 96 + t.seats * 15), h: 82 };
    if (sh === 'sweetheart') return { w: 132, h: 82 };
    const d = Math.min(196, Math.max(100, 58 + t.seats * 8));
    if (sh === 'oval') return { w: d * 1.28, h: d * 0.78 };
    return { w: d, h: d };
  }

  function centerPx(t: Tbl) {
    const r = roomEl!.getBoundingClientRect();
    return { cx: r.left + (xOf(t) / 100) * r.width, cy: r.top + (yOf(t) / 100) * r.height, r };
  }

  function startMove(e: PointerEvent, t: Tbl) {
    if (e.button !== 0 || !roomEl) return;
    e.preventDefault();
    const { cx, cy } = centerPx(t);
    drag = { id: t.id, mode: 'move', offX: e.clientX - cx, offY: e.clientY - cy };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }
  function startRotate(e: PointerEvent, t: Tbl) {
    if (e.button !== 0 || !roomEl) return;
    e.preventDefault();
    e.stopPropagation();
    drag = { id: t.id, mode: 'rotate', offX: 0, offY: 0 };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }
  function onMove(e: PointerEvent) {
    if (!drag || !roomEl) return;
    const t = tables.find((x) => x.id === drag!.id);
    if (!t) return;
    const r = roomEl.getBoundingClientRect();
    if (drag.mode === 'move') {
      const x = ((e.clientX - drag.offX - r.left) / r.width) * 100;
      const y = ((e.clientY - drag.offY - r.top) / r.height) * 100;
      live[drag.id] = { ...live[drag.id], x: clamp(x), y: clamp(y) };
    } else {
      const cx = r.left + (xOf(t) / 100) * r.width;
      const cy = r.top + (yOf(t) / 100) * r.height;
      const ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
      live[drag.id] = { ...live[drag.id], rot: Math.round((ang + 360) % 360) };
    }
  }
  async function onUp() {
    window.removeEventListener('pointermove', onMove);
    if (!drag) return;
    const t = tables.find((x) => x.id === drag!.id);
    const id = drag.id;
    drag = null;
    if (!t) return;
    await save(t.id, xOf(t), yOf(t), rotOf(t));
    delete live[id];
  }

  async function save(id: number, posX: number, posY: number, rotation: number) {
    await fetch('/dashboard/seating/layout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, posX, posY, rotation })
    });
    await invalidateAll();
  }

  async function tidy() {
    for (let i = 0; i < tables.length; i++) {
      const g = grid(i);
      await save(tables[i].id, g.x, g.y, 0);
    }
  }
</script>

<div class="wrap">
  <div class="bar">
    <span class="hint">Drag a table to move it · drag the ◍ handle to rotate</span>
    <button type="button" class="tidy" onclick={tidy}>Tidy into a grid</button>
  </div>
  <div class="room" bind:this={roomEl}>
    <span class="top-marker">Top of room</span>
    {#each tables as t (t.id)}
      {@const sh = kindShape(t.kind)}
      {@const sz = size(t)}
      {@const rot = rotOf(t)}
      {@const atTable = occupants.filter((o) => o.tableNo === t.number)}
      <div
        class="ftable"
        class:dragging={drag?.id === t.id}
        style={`left:${xOf(t)}%;top:${yOf(t)}%;width:${sz.w}px;height:${sz.h}px;transform:translate(-50%,-50%) rotate(${rot}deg)`}
        role="group"
        aria-label={`${t.label || 'Table ' + t.number}, ${atTable.length} of ${t.seats} seated`}
        onpointerdown={(e) => startMove(e, t)}
      >
        <div class={`fsurface ${sh}`}></div>
        <span class="flabel" style={`transform:rotate(${-rot}deg)`}>{t.label || `T${t.number}`}</span>
        {#each seatPositions(sh, t.seats) as p, si}
          {@const occ = atTable.find((o) => o.seatNo === si + 1)}
          <div
            class="fseat"
            class:filled={!!occ}
            class:bride={occ?.side === 'B'}
            class:groom={occ?.side === 'G'}
            style={`left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%) rotate(${-rot}deg)`}
            title={occ ? `Seat ${si + 1} — ${occ.name}` : `Seat ${si + 1} (empty)`}
          >
            {#if occ}{initials(occ.name)}{:else}<span class="sn">{si + 1}</span>{/if}
          </div>
        {/each}
        <button
          type="button"
          class="rotate-handle"
          style={`transform:rotate(${-rot}deg)`}
          title="Drag to rotate"
          aria-label="Rotate table"
          onpointerdown={(e) => startRotate(e, t)}
        >◍</button>
      </div>
    {/each}
    {#if tables.length === 0}<p class="empty">No tables yet — add some in the Plan tab.</p>{/if}
  </div>
</div>

<style>
  .bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
  .hint { font-size: 12px; color: var(--muted); }
  .tidy { background: transparent; border: 1px solid var(--line); color: var(--sage-deep); border-radius: 6px; padding: 6px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; cursor: pointer; }
  .tidy:hover { border-color: var(--sage); }

  .room {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    min-height: 460px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(111, 125, 89, 0.05), transparent 60%),
      repeating-linear-gradient(0deg, rgba(33,31,26,0.04) 0 1px, transparent 1px 26px),
      repeating-linear-gradient(90deg, rgba(33,31,26,0.04) 0 1px, transparent 1px 26px),
      var(--card);
    box-shadow: inset 0 2px 18px rgba(33, 31, 26, 0.05);
    overflow: hidden;
    touch-action: none;
  }
  .top-marker {
    position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--faint);
  }
  .empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-style: italic; }

  .ftable { position: absolute; cursor: grab; user-select: none; touch-action: none; }
  .ftable.dragging { cursor: grabbing; z-index: 5; }
  .fsurface { position: absolute; inset: 22%; background: #efe9dc; border: 1.5px solid var(--sage); box-shadow: 0 4px 14px rgba(33,31,26,0.12); }
  .fsurface.round, .fsurface.oval { border-radius: 50%; }
  .fsurface.square { border-radius: 10px; }
  .fsurface.long { inset: 30% 6%; border-radius: 10px; }
  .fsurface.sweetheart { inset: 24% 30%; border-radius: 12px; border-color: var(--terra); }

  .flabel { position: absolute; left: 50%; top: 50%; transform-origin: center;
    translate: -50% -50%; font-size: 11px; font-weight: 700; color: var(--ink); pointer-events: none; white-space: nowrap; }

  .fseat { position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 1.5px dashed var(--line);
    background: var(--bg); display: grid; place-items: center; font-size: 9.5px; font-weight: 700; color: var(--faint); pointer-events: none; }
  .fseat .sn { opacity: .6; font-weight: 500; }
  .fseat.filled { border-style: solid; }
  .fseat.filled.bride { background: var(--terra-bg); border-color: var(--terra); color: var(--terra); }
  .fseat.filled.groom { background: var(--sage-soft); border-color: var(--sage); color: var(--sage-deep); }

  .rotate-handle { position: absolute; left: 50%; top: -16px; translate: -50% 0;
    width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--sage); background: #fff;
    color: var(--sage-deep); font-size: 11px; line-height: 1; cursor: grab; display: grid; place-items: center; padding: 0;
    box-shadow: 0 2px 6px rgba(33,31,26,.12); }
  .rotate-handle:active { cursor: grabbing; }
</style>

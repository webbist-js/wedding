<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  let { data } = $props();

  // ---- Progress ----
  let allItems = $derived(data.phases.flatMap((p) => p.items));
  let total = $derived(allItems.length);
  let done = $derived(allItems.filter((i) => i.done).length);
  let pct = $derived(total ? Math.round((done / total) * 100) : 0);

  const phaseDone = (p: (typeof data.phases)[number]) => p.items.filter((i) => i.done).length;

  // ---- Collapse (default: collapse a phase once every task is done) ----
  let collapsed = $state<Record<number, boolean>>({});
  const isCollapsed = (p: (typeof data.phases)[number]) =>
    collapsed[p.id] ?? (p.items.length > 0 && phaseDone(p) === p.items.length);
  const toggle = (p: (typeof data.phases)[number]) => (collapsed[p.id] = !isCollapsed(p));

  // ---- Due-date helpers ----
  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const fmtDate = (due: string) =>
    new Date(due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  function rel(due: string): { txt: string; over: boolean } | null {
    const days = Math.round((new Date(due + 'T00:00:00').getTime() - startOfToday().getTime()) / 86400000);
    if (days < 0) return { txt: 'Overdue', over: true };
    if (days === 0) return { txt: 'Today', over: false };
    if (days <= 45) return { txt: `In ${days}d`, over: false };
    return null;
  }
  let editDate = $state<number | null>(null);

  // ---- Drag & drop (phases reorder among themselves; items among themselves) ----
  let dragKind = $state<'item' | 'phase' | null>(null);
  let dragId = $state<number | null>(null);
  let dragOverId = $state<number | null>(null);

  function onItemDragStart(e: DragEvent, id: number) {
    if (!e.dataTransfer) return;
    e.stopPropagation();
    dragKind = 'item';
    dragId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  }
  function onPhaseDragStart(e: DragEvent, id: number) {
    if (!e.dataTransfer) return;
    dragKind = 'phase';
    dragId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  }
  function onDragOver(e: DragEvent, id: number, kind: 'item' | 'phase') {
    if (dragKind !== kind) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverId = id;
  }
  function onDragLeave() {
    dragOverId = null;
  }
  async function onDrop(targetId: number, kind: 'item' | 'phase') {
    if (dragKind !== kind) return;
    const source = dragId;
    dragKind = null;
    dragId = null;
    dragOverId = null;
    if (!source || source === targetId) return;
    const ids =
      kind === 'item'
        ? data.phases.flatMap((p) => p.items.map((i) => i.id))
        : data.phases.map((p) => p.id);
    const fromIdx = ids.indexOf(source);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    await fetch('/dashboard/timeline/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: kind === 'item' ? 'items' : 'phases', ids })
    });
    await invalidateAll();
  }
</script>

{#snippet cal()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>{/snippet}

<div class="progress">
  <span class="pl"><b>{done}</b> of {total} tasks complete</span>
  <div class="track"><span style={`width:${pct}%`}></span></div>
  <span class="pct">{pct}%</span>
</div>

<div class="spine">
  {#each data.phases as phase (phase.id)}
    {@const pd = phaseDone(phase)}
    {@const full = phase.items.length > 0 && pd === phase.items.length}
    <div class="prow">
      <span class="node" class:full></span>
      <section
        class="phase"
        class:drop-over={dragOverId === phase.id && dragKind === 'phase'}
        draggable="true"
        ondragstart={(e) => onPhaseDragStart(e, phase.id)}
        ondragover={(e) => onDragOver(e, phase.id, 'phase')}
        ondragleave={onDragLeave}
        ondrop={() => onDrop(phase.id, 'phase')}
      >
        <header class="phead">
          <button class="chev" class:open={!isCollapsed(phase)} onclick={() => toggle(phase)} aria-label="Toggle">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
          <span class="t">{phase.title}</span>
          <span class="w">{phase.window}</span>
          <span class="count">{pd} / {phase.items.length}</span>
          <span class="mini"><span class="mini-fill" class:full style={`width:${phase.items.length ? (pd / phase.items.length) * 100 : 0}%`}></span></span>
        </header>

        {#if !isCollapsed(phase)}
          <div class="items">
            {#each phase.items as item (item.id)}
              <div
                class="task"
                class:done={item.done}
                class:drop-over={dragOverId === item.id && dragKind === 'item'}
                draggable="true"
                ondragstart={(e) => onItemDragStart(e, item.id)}
                ondragover={(e) => onDragOver(e, item.id, 'item')}
                ondragleave={onDragLeave}
                ondrop={(e) => { e.stopPropagation(); onDrop(item.id, 'item'); }}
              >
                <form method="POST" action="?/toggle" use:enhance>
                  <input type="hidden" name="id" value={item.id} />
                  <button class="check" class:on={item.done} aria-label="Toggle done"></button>
                </form>
                <span class="label">{item.label}</span>

                {#if editDate === item.id}
                  <form method="POST" action="?/setDueDate" use:enhance class="dateedit">
                    <input type="hidden" name="id" value={item.id} />
                    <!-- svelte-ignore a11y_autofocus -->
                    <input type="date" name="dueDate" value={item.dueDate ?? ''} autofocus
                      onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
                      onblur={() => (editDate = null)} />
                  </form>
                {:else if item.dueDate}
                  {@const r = rel(item.dueDate)}
                  <button class="datepill" class:over={r?.over} onclick={() => (editDate = item.id)}>
                    {@render cal()} {fmtDate(item.dueDate)}{#if r}<span class="reltag" class:over={r.over}>{r.txt}</span>{/if}
                  </button>
                {:else}
                  <button class="datepill add" onclick={() => (editDate = item.id)}>{@render cal()} Add date</button>
                {/if}

                <form method="POST" action="?/removeItem" use:enhance class="rmf">
                  <input type="hidden" name="id" value={item.id} />
                  <button class="rm" aria-label="Remove">×</button>
                </form>
              </div>
            {/each}

            <form method="POST" action="?/addItem" use:enhance class="additem">
              <input type="hidden" name="phaseId" value={phase.id} />
              <input name="label" placeholder="Add a task…" />
              <button aria-label="Add task">+</button>
            </form>
          </div>
        {/if}
      </section>
    </div>
  {/each}
</div>

<form method="POST" action="?/addPhase" use:enhance class="addphase">
  <input name="title" placeholder="New phase title" />
  <input name="window" placeholder="Window (e.g. Spring 2027)" />
  <button>+ Add phase</button>
</form>

<style>
  .progress { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; }
  .progress .pl { font-size: 13px; color: var(--muted); white-space: nowrap; }
  .progress .pl b { color: var(--ink); font-weight: 700; }
  .progress .track { flex: 1; height: 8px; border-radius: 999px; background: var(--line2); overflow: hidden; }
  .progress .track span { display: block; height: 100%; background: var(--sage); border-radius: 999px; transition: width .3s ease; }
  .progress .pct { font-size: 13px; font-weight: 700; color: var(--sage-deep); }

  /* Vertical spine */
  .spine { position: relative; padding-left: 30px; }
  .spine::before { content: ''; position: absolute; left: 7px; top: 10px; bottom: 18px; width: 2px; background: var(--line); }
  .prow { position: relative; margin-bottom: 16px; }
  .node { position: absolute; left: -30px; top: 16px; width: 16px; height: 16px; border-radius: 50%; background: var(--bg); border: 2px solid var(--sage); z-index: 1; }
  .node.full { background: var(--sage); }

  .phase { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 4px 18px; border-top: 2px solid var(--line); transition: border-color .12s; }
  .phase.drop-over { border-top-color: var(--sage); }
  .phead { display: flex; align-items: center; gap: 10px; padding: 14px 0; cursor: grab; }
  .phead:active { cursor: grabbing; }
  .chev { background: none; border: 0; padding: 0; color: var(--muted); cursor: pointer; display: grid; place-items: center; transition: transform .15s; }
  .chev.open { transform: rotate(90deg); color: var(--ink); }
  .phead .t { font-weight: 700; font-size: 15px; color: var(--ink); }
  .phead .w { letter-spacing: .14em; text-transform: uppercase; font-size: 10px; color: var(--faint); }
  .phead .count { margin-left: auto; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .phead .mini { width: 90px; height: 6px; border-radius: 999px; background: var(--line2); overflow: hidden; flex: none; }
  .mini-fill { display: block; height: 100%; background: var(--tan); border-radius: 999px; }
  .mini-fill.full { background: var(--sage); }

  .items { padding-bottom: 12px; }
  .task { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid var(--line2); border-left: 2px solid transparent; }
  .task.drop-over { border-left-color: var(--sage); background: var(--sage-soft); }
  .task .label { flex: 1; font-size: 14px; color: var(--body); }
  .task.done .label { color: var(--muted); text-decoration: line-through; }
  .check { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--rule); background: transparent; cursor: pointer; padding: 0; flex: none; transition: background-color .12s, border-color .12s; }
  .check.on { background: var(--sage); border-color: var(--sage); }
  .check.on::after { content: ''; display: block; width: 100%; height: 100%; }

  .datepill { display: inline-flex; align-items: center; gap: 6px; background: #f4efe4; border: 1px solid transparent; border-radius: 999px; padding: 4px 10px; font: inherit; font-size: 11.5px; color: var(--body); cursor: pointer; white-space: nowrap; }
  .datepill :global(.ico) { color: var(--muted); flex: none; }
  .datepill.add { background: transparent; color: var(--faint); }
  .datepill.add:hover { color: var(--sage-deep); }
  .datepill.over { background: var(--terra-bg); color: var(--terra); }
  .reltag { font-weight: 700; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--tan); }
  .reltag.over { color: var(--terra); }
  .dateedit input { border: 1px solid var(--sage); border-radius: 8px; padding: 4px 8px; font: inherit; font-size: 12px; }

  .rmf { margin: 0; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 16px; cursor: pointer; padding: 0 2px; }
  .rm:hover { color: var(--terra); }

  .additem { display: flex; gap: 8px; margin-top: 12px; }
  .additem input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 13px; }
  .additem button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; width: 40px; font-size: 18px; cursor: pointer; }

  .addphase { display: flex; gap: 8px; margin-top: 18px; margin-left: 30px; }
  .addphase input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 13px; }
  .addphase button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }

  @media (max-width: 640px) {
    .phead .w { display: none; }
    .phead .mini { width: 50px; }
  }
</style>

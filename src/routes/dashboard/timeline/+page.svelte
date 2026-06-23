<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  let { data } = $props();

  // ---- Drag & drop reordering ----
  // Phases reorder among themselves; items reorder among themselves
  // (current behaviour keeps items in their existing phase — moving across
  // phases is a follow-up).
  let dragKind = $state<'item' | 'phase' | null>(null);
  let dragId = $state<number | null>(null);
  let dragOverId = $state<number | null>(null);

  function onItemDragStart(e: DragEvent, id: number) {
    if (!e.dataTransfer) return;
    // Items live inside draggable phases; stop the event bubbling to the phase's
    // own dragstart, which would otherwise overwrite dragKind to 'phase'.
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
    e.stopPropagation(); // keep item dragover from also triggering the phase's
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
    let ids: number[];
    if (kind === 'item') {
      ids = data.phases.flatMap((p) => p.items.map((i) => i.id));
    } else {
      ids = data.phases.map((p) => p.id);
    }
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

<SectionHeading>Timeline</SectionHeading><Rule />
{#each data.phases as phase (phase.id)}
  <div
    class="phase"
    class:drop-over={dragOverId === phase.id && dragKind === 'phase'}
    draggable="true"
    ondragstart={(e) => onPhaseDragStart(e, phase.id)}
    ondragover={(e) => onDragOver(e, phase.id, 'phase')}
    ondragleave={onDragLeave}
    ondrop={() => onDrop(phase.id, 'phase')}
  >
    <div class="head">
      <span class="grip" title="Drag to reorder phases">≡</span>
      <span class="t">{phase.title}</span>
      <span class="w">{phase.window}</span>
    </div>
    {#each phase.items as item (item.id)}
      <div
        class="item"
        class:done={item.done}
        class:drop-over={dragOverId === item.id && dragKind === 'item'}
        draggable="true"
        ondragstart={(e) => onItemDragStart(e, item.id)}
        ondragover={(e) => onDragOver(e, item.id, 'item')}
        ondragleave={onDragLeave}
        ondrop={(e) => { e.stopPropagation(); onDrop(item.id, 'item'); }}
      >
        <span class="grip" title="Drag to reorder">≡</span>
        <form method="POST" action="?/toggle" use:enhance><input type="hidden" name="id" value={item.id} /><button class="dot" class:on={item.done} aria-label="toggle"></button></form>
        <span class="x">{item.label}</span>
        <form method="POST" action="?/setDueDate" use:enhance class="due">
          <input type="hidden" name="id" value={item.id} />
          <input
            type="date"
            name="dueDate"
            value={item.dueDate ?? ''}
            onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
            title="Due date (Slack reminders fire 1 week / 1 day / day-of / overdue)"
          />
        </form>
        <form method="POST" action="?/removeItem" use:enhance><input type="hidden" name="id" value={item.id} /><button class="rm">×</button></form>
      </div>
    {/each}
    <form method="POST" action="?/addItem" use:enhance class="additem">
      <input type="hidden" name="phaseId" value={phase.id} />
      <input name="label" placeholder="Add a task…" /><button>+</button>
    </form>
  </div>
{/each}
<form method="POST" action="?/addPhase" use:enhance class="addphase">
  <input name="title" placeholder="New phase title" /><input name="window" placeholder="Window (e.g. Spring 2027)" /><button>+ Add phase</button>
</form>

<style>
  .phase { margin-bottom: 26px; padding-top: 4px; border-top: 2px solid transparent; transition: border-color .12s ease; }
  .phase.drop-over { border-top-color: var(--sage); }
  .head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; cursor: grab; }
  .head:active { cursor: grabbing; }
  .head .t { font-family: var(--serif); font-weight: 600; font-size: 20px; color: var(--ink); }
  .head .w { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: var(--sage); }
  .grip { color: var(--faint); font-size: 14px; cursor: grab; user-select: none; line-height: 1; }
  .grip:active { cursor: grabbing; }
  .item { display: flex; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line2); border-top: 2px solid transparent; transition: border-color .12s ease, background-color .12s ease; }
  .item.drop-over { border-top-color: var(--sage); background: var(--sage-soft); }
  .item .x { flex: 1; font-size: 14px; }
  .item.done .x { color: var(--muted); text-decoration: line-through; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--rule); background: transparent; cursor: pointer; padding: 0; }
  .dot.on { background: var(--sage); border-color: var(--sage); }
  .rm { background: none; border: 0; color: var(--faint); font-size: 16px; cursor: pointer; }
  .due input { border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; font: inherit; font-size: 12px; color: var(--body); background: #fff; }
  .due input:hover { border-color: var(--sage); }
  .additem { display: flex; gap: 8px; margin-top: 8px; }
  .additem input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; }
  .additem button, .addphase button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; }
  .addphase { display: flex; gap: 8px; margin-top: 20px; }
  .addphase input { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; }
</style>

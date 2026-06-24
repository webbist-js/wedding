<script lang="ts">
  import Notes from '$lib/components/Notes.svelte';
  import type { NoteRow } from '$lib/components/Notes.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();

  const todayISO = new Date().toISOString().slice(0, 10);
  const apptsBySupplier = $derived.by(() => {
    const map: Record<number, typeof data.appointments> = {};
    for (const a of data.appointments) {
      if (a.supplierId == null || a.date < todayISO) continue;
      (map[a.supplierId] ??= []).push(a);
    }
    return map;
  });
  const notesBySupplier = $derived.by(() => {
    const map: Record<number, NoteRow[]> = {};
    for (const n of data.notes as NoteRow[]) {
      if (n.entityId == null) continue;
      (map[n.entityId] ??= []).push(n);
    }
    return map;
  });
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const STATUS = [
    ['todo', 'To do'],
    ['short', 'Shortlist'],
    ['booked', 'Booked']
  ];
  const tone = (s: string) => (s === 'booked' ? 'green' : s === 'short' ? 'tan' : 'neut');

  let openNotes = $state<Record<number, boolean>>({});

  async function save(id: number, field: string, value: string) {
    await fetch('/dashboard/suppliers/edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, field, value })
    });
  }
</script>

{#snippet calIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>{/snippet}
{#snippet noteIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>{/snippet}

<div class="list">
  {#each data.suppliers as s (s.id)}
    <article class="supplier">
      <div class="top">
        <input class="cat" value={s.category} placeholder="Category"
          onchange={(e) => save(s.id, 'category', e.currentTarget.value)} />
        <input class="name" value={s.name ?? ''} placeholder="Supplier — who?"
          onchange={(e) => save(s.id, 'name', e.currentTarget.value)} />
        <input class="contact" value={s.contact ?? ''} placeholder="Contact"
          onchange={(e) => save(s.id, 'contact', e.currentTarget.value)} />
        <span class={`status ${tone(s.status)}`}>
          <select value={s.status} onchange={(e) => save(s.id, 'status', e.currentTarget.value)} aria-label="Status">
            {#each STATUS as [val, label]}<option value={val}>{label}</option>{/each}
          </select>
        </span>
        <form method="POST" action="?/remove" use:enhance class="rmf"
          onsubmit={(e) => { if (!confirm(`Remove ${s.category}?`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={s.id} />
          <button class="rm" title="Remove" aria-label="Remove">×</button>
        </form>
      </div>

      <input class="note-line" value={s.notes ?? ''} placeholder="Add a note…"
        onchange={(e) => save(s.id, 'notes', e.currentTarget.value)} />

      <div class="actions">
        {#each apptsBySupplier[s.id] ?? [] as a (a.id)}
          <a class="chip booked-chip" href="/dashboard/calendar" title={a.title}>
            {@render calIcon()} {fmt(a.date)}{a.time ? ` · ${a.time}` : ''} — {a.title}
          </a>
        {/each}
        <a class="chip" href={`/dashboard/calendar?supplier=${s.id}`}>{@render calIcon()} Book appointment</a>
        <button class="chip" onclick={() => (openNotes[s.id] = !openNotes[s.id])}>
          {@render noteIcon()} Notes{(notesBySupplier[s.id] ?? []).length ? ` · ${notesBySupplier[s.id].length}` : ''}
        </button>
      </div>

      {#if openNotes[s.id] || (notesBySupplier[s.id] ?? []).length}
        <div class="notes-area">
          <Notes notes={notesBySupplier[s.id] ?? []} category="Suppliers" entityType="supplier" entityId={s.id} compact addLabel="Add note" />
        </div>
      {/if}
    </article>
  {/each}

  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add supplier</button></form>
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 14px; }
  .supplier {
    background: var(--card); border: 1px solid var(--line); border-radius: 16px;
    padding: 18px 22px; transition: box-shadow .15s, border-color .15s;
  }
  .supplier:hover { box-shadow: 0 4px 18px rgba(33,31,26,.05); }

  .top {
    display: grid; grid-template-columns: minmax(160px, 1.1fr) minmax(160px, 1.4fr) minmax(150px, 1.2fr) 120px 28px;
    gap: 14px; align-items: center;
  }
  /* Borderless, text-like inputs that reveal on hover/focus */
  .top input, .note-line {
    border: 1px solid transparent; border-radius: 8px; padding: 6px 8px; font: inherit;
    background: transparent; min-width: 0; transition: background-color .12s, border-color .12s;
  }
  .top input:hover, .note-line:hover { background: var(--bg); }
  .top input:focus, .note-line:focus { background: #fff; border-color: var(--line); outline: none; }
  .top .cat { font-weight: 700; font-size: 15px; color: var(--ink); }
  .top .name { color: var(--body); font-size: 14px; }
  .top .contact { color: var(--muted); font-size: 13px; }

  /* Status as a coloured pill wrapping a select */
  .status { justify-self: start; border-radius: 999px; padding: 0; position: relative; display: inline-flex; }
  .status select {
    appearance: none; -webkit-appearance: none; border: 0; background: transparent; cursor: pointer;
    font: inherit; font-weight: 700; font-size: 10px; letter-spacing: .07em; text-transform: uppercase;
    padding: 4px 12px; border-radius: 999px; color: inherit;
  }
  .status.green { background: var(--sage-soft); color: var(--sage-deep); }
  .status.tan { background: #f0e8da; color: #9a7b53; }
  .status.neut { background: #f0ede5; color: #8a8678; }

  .rmf { margin: 0; justify-self: end; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; padding: 0; line-height: 1; }
  .rm:hover { color: var(--terra); }

  .note-line { display: block; width: 100%; color: var(--muted); font-size: 13px; margin-top: 4px; }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--line);
    border-radius: 999px; padding: 6px 13px; font: inherit; font-size: 10.5px; letter-spacing: .07em;
    text-transform: uppercase; color: var(--sage-deep); text-decoration: none; cursor: pointer;
  }
  .chip:hover { border-color: var(--sage); background: var(--sage-soft); }
  .chip :global(.ico) { flex: none; }
  .booked-chip { background: var(--terra-bg); border-color: var(--terra-bg); color: var(--terra); text-transform: none; letter-spacing: 0; }
  .booked-chip:hover { border-color: var(--terra); background: var(--terra-bg); }

  .notes-area { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }

  .add { margin-top: 4px; }
  .add button {
    background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px;
    font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; cursor: pointer;
  }

  @media (max-width: 820px) {
    .top { grid-template-columns: 1fr 1fr; }
    .top .contact { grid-column: 1 / -1; }
    .status { grid-column: 1; }
    .rmf { grid-column: 2; }
  }
</style>

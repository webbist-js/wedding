<script lang="ts">
  import Notes from '$lib/components/Notes.svelte';
  import type { NoteRow } from '$lib/components/Notes.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();

  const STAGES = ['Lead', 'Enquired', 'Quoted', 'Shortlisted', 'Booked'];
  const todayISO = new Date().toISOString().slice(0, 10);

  const apptsByVendor = $derived.by(() => {
    const map: Record<number, typeof data.appointments> = {};
    for (const a of data.appointments) {
      if (a.vendorId == null || a.date < todayISO) continue;
      (map[a.vendorId] ??= []).push(a);
    }
    return map;
  });
  const notesByVendor = $derived.by(() => {
    const map: Record<number, NoteRow[]> = {};
    for (const n of data.notes as NoteRow[]) {
      if (n.entityId == null) continue;
      (map[n.entityId] ??= []).push(n);
    }
    return map;
  });
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const stageTone = (s: string) =>
    s === 'Booked' ? 'green' : s === 'Shortlisted' || s === 'Quoted' ? 'tan' : 'neut';

  let openNotes = $state<Record<number, boolean>>({});

  async function save(id: number, field: string, value: unknown) {
    await fetch('/dashboard/vendors/edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, field, value })
    });
  }
</script>

{#snippet calIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>{/snippet}
{#snippet noteIcon()}<svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>{/snippet}

<div class="list">
  {#each data.vendors as v (v.id)}
    <article class="vendor" class:chosen={v.depositPaid}>
      <div class="top">
        <input class="cat" value={v.category} placeholder="Category"
          onchange={(e) => save(v.id, 'category', e.currentTarget.value)} />
        <input class="name" value={v.name ?? ''} placeholder="Vendor — who?"
          onchange={(e) => save(v.id, 'name', e.currentTarget.value)} />
        <span class={`status ${stageTone(v.stage)}`}>
          <select value={v.stage} onchange={(e) => save(v.id, 'stage', e.currentTarget.value)} aria-label="Stage">
            {#each STAGES as st}<option value={st}>{st}</option>{/each}
          </select>
        </span>
        {#if v.depositPaid}<span class="chosen-badge">Chosen supplier</span>{/if}
        <form method="POST" action="?/remove" use:enhance class="rmf"
          onsubmit={(e) => { if (!confirm(`Remove ${v.category}?`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={v.id} />
          <button class="rm" title="Remove" aria-label="Remove">×</button>
        </form>
      </div>

      <div class="grid">
        <label>Phone<input value={v.phone ?? ''} onchange={(e) => save(v.id, 'phone', e.currentTarget.value)} /></label>
        <label>Email<input value={v.email ?? ''} onchange={(e) => save(v.id, 'email', e.currentTarget.value)} /></label>
        <label>Website<input value={v.website ?? ''} onchange={(e) => save(v.id, 'website', e.currentTarget.value)} /></label>
        <label>Contact<input value={v.contact ?? ''} onchange={(e) => save(v.id, 'contact', e.currentTarget.value)} /></label>
        <label>Quote £<input type="number" step="0.01" value={v.quotedAmount ?? ''} onchange={(e) => save(v.id, 'quotedAmount', e.currentTarget.value)} /></label>
        <label>Deposit £<input type="number" step="0.01" value={v.depositAmount ?? ''} onchange={(e) => save(v.id, 'depositAmount', e.currentTarget.value)} /></label>
        <label>Follow-up<input type="date" value={v.followUpDate ?? ''} onchange={(e) => save(v.id, 'followUpDate', e.currentTarget.value)} /></label>
        <label>Priority
          <select value={String(v.priority)} onchange={(e) => save(v.id, 'priority', e.currentTarget.value)}>
            <option value="1">High</option><option value="2">Medium</option><option value="3">Low</option>
          </select>
        </label>
      </div>

      <label class="deposit-toggle">
        <input type="checkbox" checked={v.depositPaid}
          onchange={(e) => save(v.id, 'depositPaid', e.currentTarget.checked)} />
        Deposit paid — booked &amp; chosen supplier
      </label>

      <textarea class="desc" rows="2" placeholder="Notes, quote details, what they offer…"
        value={v.description ?? ''} onchange={(e) => save(v.id, 'description', e.currentTarget.value)}></textarea>

      <div class="actions">
        {#each apptsByVendor[v.id] ?? [] as a (a.id)}
          <a class="chip booked-chip" href="/dashboard/calendar" title={a.title}>
            {@render calIcon()} {fmt(a.date)}{a.time ? ` · ${a.time}` : ''} — {a.title}
          </a>
        {/each}
        <a class="chip dashed" href={`/dashboard/calendar?supplier=${v.id}`}>{@render calIcon()} Book appointment</a>
        <button class="chip" onclick={() => (openNotes[v.id] = !openNotes[v.id])}>
          {@render noteIcon()} Notes{(notesByVendor[v.id] ?? []).length ? ` · ${notesByVendor[v.id].length}` : ''}
        </button>
      </div>

      {#if openNotes[v.id] || (notesByVendor[v.id] ?? []).length}
        <div class="notes-area">
          <Notes notes={notesByVendor[v.id] ?? []} category="Suppliers" entityType="vendor" entityId={v.id} compact addLabel="Add note" />
        </div>
      {/if}
    </article>
  {/each}

  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add vendor</button></form>
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 14px; }
  .vendor {
    background: var(--card); border: 1px solid var(--line); border-radius: 16px;
    padding: 18px 22px; transition: box-shadow .15s, border-color .15s;
  }
  .vendor:hover { box-shadow: 0 4px 18px rgba(33,31,26,.05); }
  .vendor.chosen { border-color: var(--sage); }

  .top { display: grid; grid-template-columns: minmax(140px,1fr) minmax(160px,1.4fr) 130px auto 28px; gap: 14px; align-items: center; }
  .top input { border: 1px solid transparent; border-radius: 8px; padding: 6px 8px; font: inherit; background: transparent; min-width: 0; transition: background-color .12s, border-color .12s; }
  .top input:hover { background: var(--bg); }
  .top input:focus { background: #fff; border-color: var(--line); outline: none; }
  .top .cat { font-weight: 700; font-size: 15px; color: var(--ink); }
  .top .name { color: var(--body); font-size: 14px; }

  .status { justify-self: start; border-radius: 999px; display: inline-flex; }
  .status select { appearance: none; -webkit-appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 700; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; color: inherit; }
  .status.green { background: var(--sage-soft); color: var(--sage-deep); }
  .status.tan { background: #f0e8da; color: #9a7b53; }
  .status.neut { background: #f0ede5; color: #8a8678; }
  .chosen-badge { justify-self: start; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; color: var(--sage-deep); background: var(--sage-soft); padding: 4px 10px; border-radius: 999px; }

  .rmf { margin: 0; justify-self: end; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; padding: 0; line-height: 1; }
  .rm:hover { color: var(--terra); }

  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 14px; margin-top: 14px; }
  .grid label { display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
  .grid input, .grid select { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; font-size: 13px; background: #fff; min-width: 0; }

  .deposit-toggle { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: var(--body); cursor: pointer; }
  .desc { display: block; width: 100%; margin-top: 12px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; resize: vertical; box-sizing: border-box; }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }
  .chip { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px; font: inherit; font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--sage-deep); text-decoration: none; cursor: pointer; }
  .chip:hover { border-color: var(--sage); background: var(--sage-soft); }
  .chip :global(.ico) { flex: none; }
  .chip.dashed { border-style: dashed; }
  .booked-chip { background: var(--terra-bg); border-color: var(--terra-bg); color: var(--terra); text-transform: none; letter-spacing: 0; }
  .booked-chip:hover { border-color: var(--terra); background: var(--terra-bg); }

  .notes-area { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line2); }

  .add { margin-top: 4px; }
  .add button { background: var(--sage); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; cursor: pointer; }

  @media (max-width: 820px) {
    .top { grid-template-columns: 1fr 1fr; }
    .grid { grid-template-columns: 1fr 1fr; }
  }
</style>

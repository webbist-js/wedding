<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();

  const todayISO = new Date().toISOString().slice(0, 10);
  // Upcoming appointments grouped by supplier, for the inline "booked in" line.
  const apptsBySupplier = $derived.by(() => {
    const map: Record<number, typeof data.appointments> = {};
    for (const a of data.appointments) {
      if (a.supplierId == null || a.date < todayISO) continue;
      (map[a.supplierId] ??= []).push(a);
    }
    return map;
  });
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
</script>

<SectionHeading>Suppliers</SectionHeading><Rule />
<div class="card">
  {#each data.suppliers as s (s.id)}
    <div class="supplier">
      <div class="row">
        <form method="POST" action="?/update" use:enhance class="rowform">
          <input type="hidden" name="id" value={s.id} />
          <input name="category" value={s.category} placeholder="Category" />
          <input name="name" value={s.name ?? ''} placeholder="Supplier" />
          <input name="contact" value={s.contact ?? ''} placeholder="Contact" />
          <select name="status" value={s.status}><option value="todo">To do</option><option value="short">Shortlist</option><option value="booked">Booked</option></select>
          <input name="notes" value={s.notes ?? ''} placeholder="Notes" class="notes" />
          <button>Save</button>
        </form>
        <form method="POST" action="?/remove" use:enhance><input type="hidden" name="id" value={s.id} /><button class="rm">×</button></form>
      </div>
      <div class="appts">
        {#each apptsBySupplier[s.id] ?? [] as a (a.id)}
          <a class="appt-chip" href="/dashboard/calendar" title={a.title}>
            📅 {fmt(a.date)}{a.time ? ` · ${a.time}` : ''} — {a.title}
          </a>
        {/each}
        <a class="book" href={`/dashboard/calendar?supplier=${s.id}`}>+ Book appointment</a>
      </div>
    </div>
  {/each}
  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add supplier</button></form>
</div>

<style>
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
  .supplier { border-bottom: 1px solid var(--line2); padding: 8px 0; }
  .row { display: flex; gap: 8px; align-items: center; }
  .appts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 6px; padding-left: 2px; }
  .appt-chip { font-size: 11px; background: var(--terra-bg); color: var(--terra); border-radius: 999px; padding: 3px 10px; text-decoration: none; }
  .appt-chip:hover { text-decoration: underline; }
  .book { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--sage-deep); text-decoration: none; }
  .book:hover { text-decoration: underline; }
  .rowform { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
  .rowform input, .rowform select { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
  .rowform .notes { flex: 1 1 200px; }
  .rowform button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .add { margin-top: 12px; }
  .add button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
</style>

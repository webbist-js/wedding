<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<SectionHeading>Suppliers</SectionHeading><Rule />
<div class="card">
  {#each data.suppliers as s (s.id)}
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
  {/each}
  <form method="POST" action="?/add" use:enhance class="add"><button>+ Add supplier</button></form>
</div>

<style>
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
  .row { display: flex; gap: 8px; align-items: center; border-bottom: 1px solid var(--line2); padding: 6px 0; }
  .rowform { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
  .rowform input, .rowform select { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
  .rowform .notes { flex: 1 1 200px; }
  .rowform button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .rm { background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .add { margin-top: 12px; }
  .add button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 11px; text-transform: uppercase; cursor: pointer; }
</style>

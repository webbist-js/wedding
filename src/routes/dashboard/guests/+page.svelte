<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import Pill from '$lib/components/Pill.svelte';
  let { data } = $props();
  let q = $state('');

  const sideTone: Record<string, 'green'|'rose'|'tan'> = { G: 'green', B: 'rose', X: 'tan' };
  const sideLabel: Record<string, string> = { G: 'Groom', B: 'Bride', X: 'Both' };

  let filtered = $derived(data.guests.filter((g) =>
    !q || g.name.toLowerCase().includes(q.toLowerCase()) || (g.relation ?? '').toLowerCase().includes(q.toLowerCase())));
  let groups = $derived([...new Set(filtered.map((g) => g.relationshipGroup))]);
</script>

<SectionHeading>Guest list</SectionHeading><Rule />
<input class="srch" placeholder="Search guests…" bind:value={q} />

<div class="card">
  <table>
    <thead><tr><th>Name</th><th>Side</th><th>Relationship</th><th>Role</th><th>RSVP</th><th>Meal</th><th>Dietary</th></tr></thead>
    <tbody>
      {#each groups as grp}
        {@const rows = filtered.filter((g) => g.relationshipGroup === grp)}
        <tr class="section"><td colspan="7">{grp} · {rows.length}</td></tr>
        {#each rows as g}
          <tr>
            <td class="name">{g.name}{#if g.isChild} <Pill tone="tan">Child</Pill>{/if}</td>
            <td><Pill tone={sideTone[g.side]}>{sideLabel[g.side]}</Pill></td>
            <td>{g.relation ?? ''}</td>
            <td>{g.role ?? '—'}</td>
            <td><Pill tone={g.rsvpStatus === 'yes' ? 'green' : g.rsvpStatus === 'no' ? 'terra' : 'neut'}>{g.rsvpStatus}</Pill></td>
            <td>{g.isChild ? 'Kids menu' : (g.meal ?? '—')}</td>
            <td class="diet">{g.dietaryNotes ?? ''}</td>
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>

<style>
  .srch { border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; width: 260px; max-width: 100%;
    font: inherit; margin-bottom: 16px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 6px 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; font-size: 10px;
    color: var(--muted); padding: 11px 12px; border-bottom: 1px solid var(--line); }
  td { padding: 9px 12px; border-bottom: 1px solid var(--line2); font-size: 13.5px; }
  td.name { font-weight: 600; color: var(--ink); }
  td.diet { color: var(--terra); font-size: 12px; }
  tr.section td { font-weight: 600; letter-spacing: .12em; text-transform: uppercase; font-size: 10.5px;
    color: var(--sage-deep); background: var(--sage-soft); }
</style>

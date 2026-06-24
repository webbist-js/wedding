<script lang="ts">
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import Rule from '$lib/components/Rule.svelte';
  import { enhance } from '$app/forms';
  import { TABLE_KINDS, kindLabel, kindShape, COUPLE } from '$lib/seating';
  let { data } = $props();

  // Only RSVP-yes guests are seatable; the couple are always seatable.
  let attending = $derived(data.guests.filter((g) => g.rsvpStatus === 'yes'));
  let pool = $derived(
    data.seatMode === 'day' ? attending.filter((g) => g.attendanceType === 'day') : attending
  );

  // The couple as seatable occupants (their table lives in data.couple).
  let coupleSeats = $derived(
    COUPLE.map((c) => ({ ...c, tableNo: data.couple[c.key as 'bride' | 'groom'] }))
  );

  let unassignedGuests = $derived(pool.filter((g) => g.tableNo == null));
  let unassignedCouple = $derived(coupleSeats.filter((c) => c.tableNo == null));

  const kindEntries = Object.entries(TABLE_KINDS);
  const tableName = (t: { label: string | null; number: number }) =>
    t.label || `Table ${t.number}`;

  function submitOnChange(e: Event) {
    (e.currentTarget as HTMLElement & { form: HTMLFormElement | null }).form?.requestSubmit();
  }
</script>

{#snippet sidePill(side: string)}
  {#if side === 'B'}<span class="pill bride">Bride</span>
  {:else if side === 'G'}<span class="pill groom">Groom</span>
  {:else}<span class="pill both">Both</span>{/if}
{/snippet}

{#snippet tablePicker(who: string, guestId: number | null, current: number | null)}
  <form method="POST" action="?/assign" use:enhance class="picker">
    {#if who}<input type="hidden" name="who" value={who} />{:else}<input type="hidden" name="guestId" value={guestId} />{/if}
    <select name="tableNo" value={current ?? ''} onchange={submitOnChange}>
      <option value="">{current ? 'Move…' : 'Seat at…'}</option>
      {#each data.tables as t (t.id)}
        <option value={t.number}>{tableName(t)}</option>
      {/each}
    </select>
  </form>
{/snippet}

<SectionHeading>Seating chart</SectionHeading><Rule />

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

<div class="card">
  <h3 class="kick">Unassigned · {unassignedGuests.length + unassignedCouple.length}</h3>
  <p class="hint">
    Only the couple and guests who've RSVP'd <b>yes</b> can be seated{data.seatMode === 'day' ? ' (day sitting)' : ''}.
  </p>
  <div class="chips">
    {#each unassignedCouple as c (c.key)}
      <div class="chip couple">
        <span class="crown" title="The couple">♥</span>
        {@render sidePill(c.side)}
        <span class="nm">{c.name}</span>
        {@render tablePicker(c.key, null, null)}
      </div>
    {/each}
    {#each unassignedGuests as g (g.id)}
      <div class="chip">
        {@render sidePill(g.side)}
        <span class="nm">{g.name}</span>
        {@render tablePicker('', g.id, null)}
      </div>
    {/each}
    {#if unassignedGuests.length + unassignedCouple.length === 0}
      <span class="empty">Everyone seatable is seated.</span>
    {/if}
  </div>
</div>

<div class="tables">
  {#each data.tables as t (t.id)}
    {@const seatedGuests = pool.filter((g) => g.tableNo === t.number)}
    {@const seatedCouple = coupleSeats.filter((c) => c.tableNo === t.number)}
    {@const occ = seatedGuests.length + seatedCouple.length}
    <div class="tbl">
      <div class="cap">
        <span class={`shape ${kindShape(t.kind)}`} aria-hidden="true"></span>
        <span class="nm">{tableName(t)}</span>
        <span class="ct" class:over={occ > t.seats}>{occ}/{t.seats}</span>
      </div>

      <form method="POST" action="?/updateTable" use:enhance class="tbl-edit">
        <input type="hidden" name="id" value={t.id} />
        <input
          class="label-in"
          name="label"
          value={t.label ?? ''}
          placeholder={`Table ${t.number}`}
          onchange={submitOnChange}
        />
        <select name="kind" value={t.kind} onchange={submitOnChange} title="Arrangement">
          {#each kindEntries as [key, k]}<option value={key}>{kindLabel(key)}</option>{/each}
        </select>
        <label class="seats">seats
          <input name="seats" type="number" min="1" max="40" value={t.seats} onchange={submitOnChange} />
        </label>
        <button class="rm-tbl" formaction="?/removeTable" title="Remove table"
                onclick={(e) => { if (!confirm(`Remove ${tableName(t)}?`)) e.preventDefault(); }}>×</button>
      </form>

      <ul>
        {#each seatedCouple as c (c.key)}
          <li class="couple-li">
            <span class="crown" title="The couple">♥</span>{@render sidePill(c.side)}<span class="gname">{c.name}</span>
            <form method="POST" action="?/assign" use:enhance class="inline">
              <input type="hidden" name="who" value={c.key} /><input type="hidden" name="tableNo" value="" />
              <button class="rm">×</button>
            </form>
          </li>
        {/each}
        {#each seatedGuests as g (g.id)}
          <li>
            {@render sidePill(g.side)}<span class="gname">{g.name}</span>
            <form method="POST" action="?/assign" use:enhance class="inline">
              <input type="hidden" name="guestId" value={g.id} /><input type="hidden" name="tableNo" value="" />
              <button class="rm">×</button>
            </form>
          </li>
        {/each}
        {#if occ === 0}<li class="vacant">No one seated yet</li>{/if}
      </ul>
    </div>
  {/each}
  {#if data.tables.length === 0}
    <p class="empty">No tables yet — add one above.</p>
  {/if}
</div>

<style>
  .ctrls { display: flex; gap: 18px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .ctrls form { display: flex; gap: 8px; align-items: center; }
  .ctrls button { background: var(--sage); color: #fff; border: 0; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .ctrls .clear { background: transparent; color: var(--faint); border: 1px solid var(--line); }
  .add-table select { border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }

  .seg { gap: 6px !important; }
  .seg-label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .seg button { background: transparent; color: var(--muted); border: 1px solid var(--line); }
  .seg button.active { background: var(--sage); color: #fff; border-color: var(--sage); opacity: 1; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 18px; }
  .kick { font-weight: 600; letter-spacing: .16em; text-transform: uppercase; font-size: 11px; color: var(--sage); margin: 0 0 6px; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .empty { font-size: 12.5px; color: var(--muted); font-style: italic; }
  .chip { display: inline-flex; align-items: center; gap: 8px; background: #faf8f2; border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; font-size: 12.5px; }
  .chip.couple { background: var(--sage-soft); border-color: var(--sage); }
  .chip .nm { font-weight: 500; }
  .crown { color: var(--terra); font-size: 12px; }
  .picker select, .chip select { border: 0; background: transparent; color: var(--sage-deep); cursor: pointer; font: inherit; font-size: 11px; }

  .pill { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 2px 7px; line-height: 1.4; white-space: nowrap; }
  .pill.bride { background: var(--terra-bg); color: var(--terra); }
  .pill.groom { background: var(--sage-soft); color: var(--sage-deep); }
  .pill.both { background: #efece3; color: var(--muted); }

  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .tbl { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .cap { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .cap .nm { font-weight: 600; flex: 1; }
  .cap .ct { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--sage); }
  .cap .ct.over { color: var(--terra); }

  /* Layout shape glyphs */
  .shape { width: 20px; height: 20px; border: 1.5px solid var(--sage); flex: none; }
  .shape.round { border-radius: 50%; }
  .shape.oval { border-radius: 50%; width: 26px; height: 16px; }
  .shape.square { border-radius: 3px; }
  .shape.long { border-radius: 4px; width: 28px; height: 12px; }
  .shape.sweetheart { border-radius: 50%; width: 14px; height: 14px; border-color: var(--terra); }

  .tbl-edit { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-bottom: 10px; margin-bottom: 8px; border-bottom: 1px solid var(--line2); }
  .tbl-edit .label-in { flex: 1 1 90px; min-width: 0; border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; font: inherit; font-size: 12px; }
  .tbl-edit select { border: 1px solid var(--line); border-radius: 6px; padding: 5px 6px; font: inherit; font-size: 11.5px; }
  .tbl-edit .seats { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); display: flex; gap: 4px; align-items: center; }
  .tbl-edit .seats input { width: 48px; border: 1px solid var(--line); border-radius: 6px; padding: 5px 6px; font: inherit; font-size: 12px; }
  .rm-tbl { background: none; border: 1px solid var(--line); border-radius: 6px; color: var(--faint); cursor: pointer; font-size: 14px; width: 26px; height: 26px; line-height: 1; }
  .rm-tbl:hover { border-color: var(--terra); color: var(--terra); }

  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 3px 0; }
  li.couple-li { font-weight: 600; }
  li.vacant { color: var(--faint); font-style: italic; }
  .gname { flex: 1; }
  .inline { display: inline; }
  .rm { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 13px; }
  .rm:hover { color: var(--terra); }
</style>

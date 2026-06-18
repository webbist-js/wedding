<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

<main class="rsvp">
  <p class="eyebrow">You are invited to the wedding of</p>
  <h1 class="script">Alex &amp; Katie</h1>
  <p class="when">Thursday 2 April 2027 · The Tithe Barn, Bolton Abbey</p>

  {#if form?.saved}
    <div class="thanks">Thank you — your reply is saved. You can change it any time from this link.</div>
  {/if}

  <form method="POST" use:enhance>
    {#each data.members as m (m.id)}
      <fieldset>
        <legend>{m.name} <span class="type">· {m.attendanceType === 'day' ? 'Day & evening' : 'Evening reception'}</span></legend>
        <div class="attend">
          <label><input type="radio" name="attend_{m.id}" value="yes" checked={m.rsvpStatus === 'yes'} /> Joyfully accepts</label>
          <label><input type="radio" name="attend_{m.id}" value="no" checked={m.rsvpStatus === 'no'} /> Regretfully declines</label>
        </div>
        {#if m.isChild}
          <p class="kids">Children are served from our <b>kids' menu</b>.</p>
          <label class="field">Allergies / dietary notes<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} /></label>
        {:else}
          <div class="meal">
            <label><input type="radio" name="meal_{m.id}" value="veg" checked={m.meal === 'veg'} /> Vegetarian</label>
            <label><input type="radio" name="meal_{m.id}" value="non-veg" checked={m.meal === 'non-veg'} /> Non-vegetarian</label>
          </div>
          <label class="field">Allergies / dietary notes<input name="diet_{m.id}" value={m.dietaryNotes ?? ''} /></label>
        {/if}
      </fieldset>
    {/each}
    <label class="field msg">A message to the couple (optional)<textarea name="message" rows="3">{data.group.message ?? ''}</textarea></label>
    <button type="submit">Send our reply</button>
  </form>
</main>

<style>
  .rsvp { max-width: 560px; margin: 0 auto; padding: 8vh 24px 80px; text-align: center; }
  .rsvp h1 { font-size: clamp(56px, 14vw, 96px); margin: 6px 0; }
  .when { letter-spacing: .14em; text-transform: uppercase; font-size: 11.5px; color: #5f5b50; margin-bottom: 28px; }
  .thanks { background: var(--sage-soft); color: var(--sage-deep); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
  fieldset { border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; margin: 0 0 16px; text-align: left; }
  legend { font-family: var(--serif); font-size: 22px; color: var(--ink); padding: 0 8px; }
  .type { font-family: var(--sans); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .attend, .meal { display: flex; gap: 18px; flex-wrap: wrap; margin: 10px 0; }
  .attend label, .meal label { font-size: 14px; }
  .kids { font-size: 13.5px; color: var(--body); background: var(--rose-bg); padding: 8px 12px; border-radius: 8px; }
  .field { display: grid; gap: 6px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-top: 8px; }
  .field input, .field textarea { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 14px; text-transform: none; letter-spacing: normal; color: var(--ink); }
  .msg { margin-top: 8px; }
  button { margin-top: 18px; background: var(--sage); color: #fff; border: 0; border-radius: 10px; padding: 14px 28px; letter-spacing: .1em; text-transform: uppercase; font-size: 13px; cursor: pointer; }
</style>

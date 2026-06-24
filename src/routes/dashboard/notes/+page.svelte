<script lang="ts">
	import Notes from '$lib/components/Notes.svelte';
	import type { NoteRow } from '$lib/components/Notes.svelte';
	import { NOTE_CATEGORIES } from '$lib/notes';

	let { data } = $props();

	// Group notes by category, preserving the canonical category order. Empty
	// categories are skipped in the body but always available in the "add" picker.
	const byCategory = $derived.by(() => {
		const map = new Map<string, NoteRow[]>();
		for (const c of NOTE_CATEGORIES) map.set(c, []);
		for (const n of data.notes as NoteRow[]) {
			if (!map.has(n.category)) map.set(n.category, []);
			map.get(n.category)!.push(n);
		}
		return map;
	});

	const total = $derived((data.notes as NoteRow[]).length);
	const pinned = $derived((data.notes as NoteRow[]).filter((n) => n.pinned).length);

	// Category to file a brand-new standalone note under.
	let newCategory = $state<string>('General');
</script>


<p class="lead">
	{total} note{total === 1 ? '' : 's'}{pinned ? ` · ${pinned} pinned` : ''}. Notes added against a
	supplier (or other item) elsewhere in the dashboard show up here under their section, and stay
	linked back to where you flagged them.
</p>

<div class="addbar">
	<label>
		New note in
		<select bind:value={newCategory}>
			{#each NOTE_CATEGORIES as c}
				<option value={c}>{c}</option>
			{/each}
		</select>
	</label>
	<div class="addbox">
		{#key newCategory}
			<Notes notes={[]} category={newCategory} addLabel="Add note" />
		{/key}
	</div>
</div>

{#each NOTE_CATEGORIES as category}
	{@const list = byCategory.get(category) ?? []}
	{#if list.length}
		<section class="group">
			<h2>{category} <span class="count">{list.length}</span></h2>
			<Notes notes={list} {category} showContext addLabel="Add to {category}" />
		</section>
	{/if}
{/each}

{#if total === 0}
	<p class="empty">No notes yet — add your first one above, or jot one against a supplier.</p>
{/if}

<style>
	.lead {
		color: var(--muted);
		font-size: 13.5px;
		line-height: 1.6;
		max-width: 64ch;
		margin: 0 0 20px;
	}
	.addbar {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 14px 16px;
		margin-bottom: 28px;
	}
	.addbar label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 10px;
	}
	.addbar select {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 5px 8px;
		font: inherit;
		font-size: 13px;
		text-transform: none;
		letter-spacing: 0;
	}
	.group {
		margin-bottom: 28px;
	}
	.group h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 22px;
		margin: 0 0 12px;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.count {
		font-family: var(--sans);
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 2px 9px;
	}
	.empty {
		color: var(--muted);
		font-size: 13.5px;
	}
</style>

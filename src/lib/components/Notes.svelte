<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	export interface NoteComment {
		id: number;
		body: string;
		authorName?: string | null;
		updatedAt: Date | string | number | null;
	}
	export interface NoteRow {
		id: number;
		body: string;
		category: string;
		entityType: string | null;
		entityId: number | null;
		pinned: boolean;
		updatedAt: Date | string | number | null;
		// Optional, supplied by the hub so the note can link back to where it was flagged.
		contextLabel?: string | null;
		contextHref?: string | null;
		authorName?: string | null;
		lastEditedByName?: string | null;
		comments?: NoteComment[];
	}

	let {
		notes = [],
		category = 'General',
		entityType = null,
		entityId = null,
		showContext = false,
		compact = false,
		addLabel = 'Add note'
	}: {
		notes?: NoteRow[];
		category?: string;
		entityType?: string | null;
		entityId?: number | null;
		showContext?: boolean;
		compact?: boolean;
		addLabel?: string;
	} = $props();

	let draft = $state('');
	let editingId = $state<number | null>(null);
	let editDraft = $state('');
	let busy = $state(false);

	async function post(payload: Record<string, unknown>) {
		busy = true;
		try {
			const res = await fetch('/dashboard/notes/edit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error(await res.text());
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function add() {
		const body = draft.trim();
		if (!body) return;
		await post({ op: 'create', body, category, entityType, entityId });
		draft = '';
	}

	function startEdit(n: NoteRow) {
		editingId = n.id;
		editDraft = n.body;
	}
	async function saveEdit(id: number) {
		const body = editDraft.trim();
		if (!body) return;
		await post({ op: 'update', id, body });
		editingId = null;
	}
	async function togglePin(n: NoteRow) {
		await post({ op: 'pin', id: n.id, pinned: !n.pinned });
	}
	async function remove(id: number) {
		if (!confirm('Delete this note?')) return;
		await post({ op: 'delete', id });
	}

	let openComments = $state<Record<number, boolean>>({});
	let commentDraft = $state<Record<number, string>>({});

	async function addComment(noteId: number) {
		const body = (commentDraft[noteId] ?? '').trim();
		if (!body) return;
		await post({ op: 'comment.create', noteId, body });
		commentDraft[noteId] = '';
	}
	async function removeComment(id: number) {
		if (!confirm('Delete this comment?')) return;
		await post({ op: 'comment.delete', id });
	}

	const fmt = (d: NoteRow['updatedAt']) => {
		if (!d) return '';
		const date = d instanceof Date ? d : new Date(d);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	};
</script>

<div class="notes" class:compact>
	{#each notes as n (n.id)}
		<div class="note" class:pinned={n.pinned}>
			{#if editingId === n.id}
				<textarea bind:value={editDraft} rows="3"></textarea>
				<div class="acts">
					<button class="mini primary" disabled={busy} onclick={() => saveEdit(n.id)}>Save</button>
					<button class="mini" onclick={() => (editingId = null)}>Cancel</button>
				</div>
			{:else}
				<p class="body">{n.body}</p>
				<div class="foot">
					<span class="meta">
						{#if showContext && n.contextLabel}
							{#if n.contextHref}<a class="ctx" href={n.contextHref}>{n.contextLabel}</a>{:else}<span class="ctx">{n.contextLabel}</span>{/if}
							·
						{/if}
						{n.authorName ? n.authorName : 'Imported'}{n.lastEditedByName && n.lastEditedByName !== n.authorName ? ` · edited by ${n.lastEditedByName}` : ''} · {fmt(n.updatedAt)}
					</span>
					<span class="acts">
						<button class="link" title={n.pinned ? 'Unpin' : 'Pin'} onclick={() => togglePin(n)}>
							{n.pinned ? '★' : '☆'}
						</button>
						<button class="link" onclick={() => startEdit(n)}>Edit</button>
						<button class="link danger" onclick={() => remove(n.id)}>Delete</button>
						<button class="link" onclick={() => (openComments[n.id] = !openComments[n.id])}>Comments{(n.comments?.length ?? 0) ? ` (${n.comments?.length})` : ''}</button>
					</span>
				</div>
					{#if openComments[n.id]}
						<div class="thread">
							{#each n.comments ?? [] as c (c.id)}
								<div class="comment">
									<p>{c.body}</p>
									<div class="cfoot">
										<span>{c.authorName ?? 'Imported'} · {fmt(c.updatedAt)}</span>
										<button class="link danger" onclick={() => removeComment(c.id)}>Delete</button>
									</div>
								</div>
							{/each}
							<div class="add">
								<textarea bind:value={commentDraft[n.id]} rows="1" placeholder="Add a comment…"></textarea>
								<button class="mini primary" disabled={busy || !(commentDraft[n.id] ?? '').trim()} onclick={() => addComment(n.id)}>Comment</button>
							</div>
						</div>
					{/if}
			{/if}
		</div>
	{/each}

	<div class="add">
		<textarea bind:value={draft} rows={compact ? 1 : 2} placeholder="Add a note…"></textarea>
		<button class="mini primary" disabled={busy || !draft.trim()} onclick={add}>{addLabel}</button>
	</div>
</div>

<style>
	.notes {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.note {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 12px;
		background: var(--card);
	}
	.note.pinned {
		border-color: var(--sage);
		background: var(--sage-soft);
	}
	.body {
		margin: 0 0 6px;
		font-size: 13.5px;
		line-height: 1.5;
		white-space: pre-wrap;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.meta {
		font-size: 11px;
		color: var(--muted);
	}
	.ctx {
		color: var(--sage-deep);
		text-decoration: none;
		font-weight: 600;
	}
	.ctx:hover {
		text-decoration: underline;
	}
	.acts {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.link {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		font-size: 11px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
		cursor: pointer;
	}
	.link:hover {
		color: var(--ink);
	}
	.link.danger:hover {
		color: var(--terra);
	}
	textarea {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 10px;
		font: inherit;
		font-size: 13.5px;
		resize: vertical;
		box-sizing: border-box;
	}
	.add {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}
	.add textarea {
		flex: 1;
	}
	.mini {
		border: 1px solid var(--line);
		background: var(--bg);
		border-radius: 6px;
		padding: 7px 12px;
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		white-space: nowrap;
	}
	.mini.primary {
		background: var(--sage);
		color: #fff;
		border-color: var(--sage);
	}
	.mini:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.thread {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px dashed var(--line);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.comment p {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.45;
		white-space: pre-wrap;
	}
	.cfoot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		font-size: 10.5px;
		color: var(--muted);
		margin-top: 2px;
	}
	.compact .note {
		padding: 8px 10px;
	}
	.compact .body {
		font-size: 12.5px;
	}
</style>

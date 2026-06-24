<script lang="ts">
	import Stat from '$lib/components/Stat.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	let { data } = $props();

	let q = $state('');
	let filtered = $derived(
		!q
			? data.households
			: data.households.filter((h) => {
					const needle = q.toLowerCase();
					return (
						h.name.toLowerCase().includes(needle) ||
						h.members.some((m) => m.name.toLowerCase().includes(needle))
					);
				})
	);

	async function save(
		kind: 'group' | 'guest',
		id: number,
		field: string,
		value: string | boolean
	) {
		await fetch('/dashboard/guests/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind, id, field, value })
		});
	}

	function confirmSubmit(message: string) {
		return (e: Event) => {
			if (!confirm(message)) e.preventDefault();
		};
	}

	// Relationship-group dropdown. The "+ New group…" sentinel prompts for a fresh
	// group name; we reload so it persists and appears as an option everywhere.
	const NEW_GROUP = '__new__';
	async function onRelChange(memberId: number, current: string, e: Event) {
		const sel = e.currentTarget as HTMLSelectElement;
		const v = sel.value;
		if (v === NEW_GROUP) {
			const name = window.prompt('New relationship group name:')?.trim();
			sel.value = current; // restore until the reload confirms the change
			if (!name) return;
			await save('guest', memberId, 'relationshipGroup', name);
			await invalidateAll();
			return;
		}
		await save('guest', memberId, 'relationshipGroup', v);
	}

	// Add-household modal.
	let showAdd = $state(false);
	let addName = $state('');
	function openAdd() {
		showAdd = true;
	}
	function closeAdd() {
		showAdd = false;
	}

	// <main> carries a persistent load-animation transform, which makes it the
	// containing block for position:fixed children — so the modal would centre
	// on the list, not the viewport. Reparent it to the SvelteKit app root (the
	// topmost child of <body>): outside <main>, but still inside Svelte's event-
	// delegation root so backdrop/cancel clicks keep firing.
	function portal(node: HTMLElement) {
		let root: HTMLElement = node;
		while (root.parentElement && root.parentElement !== document.body) {
			root = root.parentElement;
		}
		root.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>


<div class="stats">
	<Stat value={String(data.summary.total)} label="Total" />
	<Stat value={`${data.summary.day} / ${data.summary.evening}`} label="Day / evening" />
	<Stat value={String(data.summary.kids)} label="Children" />
	<Stat value={String(data.summary.rsvpYes)} label="RSVP'd yes" accent />
</div>

<div class="ctrls">
	<input class="srch" bind:value={q} placeholder="Search households or names…" />
	<button type="button" class="btn primary" onclick={openAdd}>+ Add household</button>
</div>

{#each filtered as h (h.id)}
	{@const replied = h.members.filter((m) => m.rsvpStatus !== 'pending').length}
	{@const allReplied = replied === h.members.length && h.members.length > 0}
	<section class="household" class:complete={allReplied}>
		<header class="h-head">
			<input
				class="h-name"
				value={h.name}
				onchange={(e) => save('group', h.id, 'name', e.currentTarget.value)}
				placeholder="Household name"
			/>
			<div class="h-meta">
				<a class="token-link" href={`/rsvp/${h.token}`} target="_blank" rel="noopener">
					/rsvp/{h.token}
				</a>
				<span class="replied" class:done={allReplied}>
					{replied}/{h.members.length} replied
				</span>
				<form method="POST" action="?/regenerateToken" use:enhance
				      onsubmit={confirmSubmit('Regenerate the QR link? Any printed QR codes will stop working.')}>
					<input type="hidden" name="id" value={h.id} />
					<button class="btn-ghost" type="submit" title="Regenerate link">↻</button>
				</form>
				<form method="POST" action="?/removeGroup" use:enhance
				      onsubmit={confirmSubmit(`Delete ${h.name} and all ${h.members.length} member(s)?`)}>
					<input type="hidden" name="id" value={h.id} />
					<button class="btn-ghost danger" type="submit" title="Delete household">×</button>
				</form>
			</div>
		</header>

		<div class="h-contact">
			<label class="field addr">
				<span>Address</span>
				<textarea
					rows="2"
					placeholder="Postal address for invitations…"
					value={h.address ?? ''}
					onchange={(e) => save('group', h.id, 'address', e.currentTarget.value)}
				></textarea>
			</label>
			<label class="field">
				<span>Email</span>
				<input
					type="email"
					placeholder="—"
					value={h.email ?? ''}
					onchange={(e) => save('group', h.id, 'email', e.currentTarget.value)}
				/>
			</label>
			<label class="field">
				<span>Phone</span>
				<input
					placeholder="—"
					value={h.phone ?? ''}
					onchange={(e) => save('group', h.id, 'phone', e.currentTarget.value)}
				/>
			</label>
		</div>

		<div class="members">
			<div class="row head">
				<span>Name</span>
				<span>Side</span>
				<span>Relationship group</span>
				<span>Relation</span>
				<span>Role</span>
				<span>Day/Eve</span>
				<span title="Child">Kid</span>
				<span title="Plus-one slot">+1</span>
				<span>RSVP</span>
				<span></span>
			</div>

			{#each h.members as m (m.id)}
				<div class="row">
					<input
						value={m.name}
						placeholder="Name"
						onchange={(e) => save('guest', m.id, 'name', e.currentTarget.value)}
					/>
					<select
						value={m.side}
						onchange={(e) => save('guest', m.id, 'side', e.currentTarget.value)}
					>
						<option value="G">Groom</option>
						<option value="B">Bride</option>
						<option value="X">Both</option>
					</select>
					<select
						class="rel-sel"
						value={m.relationshipGroup}
						onchange={(e) => onRelChange(m.id, m.relationshipGroup, e)}
					>
						{#each data.relationshipGroups as rg}
							<option value={rg}>{rg}</option>
						{/each}
						{#if !data.relationshipGroups.includes(m.relationshipGroup)}
							<option value={m.relationshipGroup}>{m.relationshipGroup}</option>
						{/if}
						<option value={NEW_GROUP}>+ New group…</option>
					</select>
					<input
						value={m.relation ?? ''}
						placeholder="—"
						onchange={(e) => save('guest', m.id, 'relation', e.currentTarget.value)}
					/>
					<input
						value={m.role ?? ''}
						placeholder="—"
						onchange={(e) => save('guest', m.id, 'role', e.currentTarget.value)}
					/>
					<select
						value={m.attendanceType}
						onchange={(e) => save('guest', m.id, 'attendanceType', e.currentTarget.value)}
					>
						<option value="day">Day</option>
						<option value="evening">Evening</option>
					</select>
					<label class="cb">
						<input
							type="checkbox"
							checked={m.isChild}
							onchange={(e) => save('guest', m.id, 'isChild', e.currentTarget.checked)}
						/>
					</label>
					<label class="cb">
						<input
							type="checkbox"
							checked={m.isPlusOne}
							onchange={(e) => save('guest', m.id, 'isPlusOne', e.currentTarget.checked)}
						/>
					</label>
					<select
						class="rsvp-sel {m.rsvpStatus}"
						value={m.rsvpStatus}
						onchange={(e) => save('guest', m.id, 'rsvpStatus', e.currentTarget.value)}
						title="RSVP status (admin override)"
					>
						<option value="pending">—</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
					<div class="actions">
						<form method="POST" action="?/moveGuest" use:enhance class="inline">
							<input type="hidden" name="id" value={m.id} />
							<select
								name="newGroupId"
								onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
							>
								<option value="">Move…</option>
								{#each data.households.filter((g) => g.id !== h.id) as g (g.id)}
									<option value={g.id}>{g.name}</option>
								{/each}
							</select>
						</form>
						<form method="POST" action="?/removeGuest" use:enhance class="inline"
						      onsubmit={confirmSubmit(`Remove ${m.name}?`)}>
							<input type="hidden" name="id" value={m.id} />
							<button class="btn-ghost danger" type="submit" title="Remove guest">×</button>
						</form>
					</div>
				</div>
			{/each}

			<form method="POST" action="?/addGuest" use:enhance class="addmember">
				<input type="hidden" name="groupId" value={h.id} />
				<input name="name" placeholder="Add another guest to this household…" />
				<button type="submit" class="btn ghost">+ Add</button>
			</form>
		</div>
	</section>
{/each}

{#if showAdd}
	<div
		class="overlay"
		role="presentation"
		use:portal
		onclick={(e) => {
			if (e.target === e.currentTarget) closeAdd();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Add household">
			<h2>Add household</h2>
			<form
				method="POST"
				action="?/addGroup"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							q = addName.trim(); // filter the list straight to the new household
							showAdd = false;
							addName = '';
							await update();
						} else {
							await update();
						}
					};
				}}
			>
				<label class="f">
					<span>Household name *</span>
					<input name="name" bind:value={addName} placeholder="e.g. The Smiths" required />
				</label>

				<div class="grid2">
					<label class="f">
						<span>First guest (optional)</span>
						<input name="firstGuest" placeholder="Add one guest now…" />
					</label>
					<label class="f">
						<span>Side</span>
						<select name="side">
							<option value="X">Both</option>
							<option value="B">Bride</option>
							<option value="G">Groom</option>
						</select>
					</label>
				</div>

				<label class="f">
					<span>Address</span>
					<textarea name="address" rows="2" placeholder="Postal address for invitations…"></textarea>
				</label>

				<div class="grid2">
					<label class="f">
						<span>Email</span>
						<input name="email" type="email" placeholder="—" />
					</label>
					<label class="f">
						<span>Phone</span>
						<input name="phone" placeholder="—" />
					</label>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn ghost" onclick={closeAdd}>Cancel</button>
					<button type="submit" class="btn primary" disabled={!addName.trim()}>Add household</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 14px;
		margin-bottom: 22px;
	}

	.ctrls {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 22px;
		flex-wrap: wrap;
	}
	.srch {
		flex: 1;
		min-width: 220px;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 14px;
		font: inherit;
		font-size: 14px;
	}

	.btn {
		border: 0;
		border-radius: 8px;
		padding: 10px 18px;
		font: inherit;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.primary {
		background: var(--sage);
		color: #fff;
	}
	.btn.primary:hover { background: var(--sage-deep); }
	.btn.ghost {
		background: transparent;
		color: var(--sage-deep);
		border: 1px solid var(--line);
	}
	.btn.ghost:hover { border-color: var(--sage); }
	.btn-ghost {
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 6px;
		width: 28px;
		height: 28px;
		display: inline-grid;
		place-items: center;
		color: var(--muted);
		cursor: pointer;
		font-size: 14px;
		padding: 0;
		font-family: inherit;
	}
	.btn-ghost:hover {
		border-color: var(--sage);
		color: var(--sage-deep);
	}
	.btn-ghost.danger:hover {
		border-color: var(--terra);
		color: var(--terra);
	}

	.household {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 16px 18px;
		margin-bottom: 14px;
	}
	.household.complete {
		border-color: var(--sage);
	}

	.h-head {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: space-between;
		flex-wrap: wrap;
		margin-bottom: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--line2);
	}
	.h-name {
		flex: 1;
		min-width: 200px;
		font-family: var(--serif);
		font-weight: 600;
		font-size: 19px;
		color: var(--ink);
		border: 1px solid transparent;
		background: transparent;
		border-radius: 6px;
		padding: 4px 8px;
	}
	.h-name:hover,
	.h-name:focus {
		border-color: var(--line);
		background: #fff;
	}
	.h-meta {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: 12px;
		color: var(--muted);
	}
	.token-link {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11.5px;
		color: var(--sage-deep);
		text-decoration: none;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
	}
	.token-link:hover { text-decoration: underline; }
	.replied {
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 600;
	}
	.replied.done { color: var(--sage-deep); }

	.h-contact {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 10px;
		margin-bottom: 14px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--line2);
	}
	.h-contact .field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.h-contact .field > span {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
	}
	.h-contact textarea,
	.h-contact input {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 12.5px;
		background: #fff;
		color: var(--ink);
		resize: vertical;
		width: 100%;
	}
	@media (max-width: 760px) {
		.h-contact {
			grid-template-columns: 1fr;
		}
	}

	.members .row {
		display: grid;
		grid-template-columns:
			minmax(140px, 1.4fr) 90px minmax(140px, 1.3fr) minmax(110px, 1fr) 90px 90px 36px 36px
			52px minmax(180px, 1fr);
		gap: 6px;
		align-items: center;
		padding: 6px 0;
		border-bottom: 1px solid var(--line2);
	}
	.members .row:last-of-type { border-bottom: 0; }
	.members .row.head {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
		padding-bottom: 8px;
	}
	.row input:not([type='checkbox']),
	.row select {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		font: inherit;
		font-size: 12.5px;
		background: #fff;
		color: var(--ink);
	}
	.row .cb {
		display: grid;
		place-items: center;
	}

	.rsvp-sel {
		font-size: 11.5px;
		font-weight: 600;
		border-radius: 999px !important;
		text-align: center;
		padding: 5px 6px;
	}
	.rsvp-sel.yes {
		background: var(--sage-soft);
		color: var(--sage-deep);
		border-color: var(--sage);
	}
	.rsvp-sel.no {
		background: var(--terra-bg);
		color: var(--terra);
		border-color: var(--terra);
	}
	.rsvp-sel.pending {
		color: var(--muted);
	}

	.actions {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.actions .inline {
		display: contents;
	}
	.actions select {
		font-size: 11.5px;
		padding: 5px 6px;
	}

	.addmember {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.addmember input {
		flex: 1;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
		font: inherit;
		font-size: 13px;
	}

	@media (max-width: 900px) {
		.members .row {
			grid-template-columns: 1fr 1fr 1fr;
			row-gap: 4px;
		}
		.members .row.head {
			display: none;
		}
	}

	/* ---------------- Add-household modal ---------------- */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(33, 31, 26, 0.4);
		display: grid;
		place-items: center;
		padding: 20px;
		z-index: 100;
	}
	.modal {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 24px 24px 20px;
		width: 100%;
		max-width: 520px;
		box-shadow: 0 24px 60px rgba(33, 31, 26, 0.22);
		max-height: 90vh;
		overflow: auto;
	}
	.modal h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 24px;
		margin: 0 0 16px;
		color: var(--ink);
	}
	.modal .f {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;
	}
	.modal .f > span {
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
	}
	.modal input,
	.modal select,
	.modal textarea {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 11px;
		font: inherit;
		font-size: 14px;
		background: #fff;
		color: var(--ink);
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
	}
	.modal .grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 16px;
	}
	.modal .btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 520px) {
		.modal .grid2 {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	// Detail panel for the selected household: its guests (inline editing),
	// contact details, invite + RSVP link, and the destructive actions.
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import InvitePanel from '$lib/components/InvitePanel.svelte';
	import type { HouseholdSummary } from '$lib/guest-report';

	export interface PanelMember {
		id: number;
		name: string;
		side: 'G' | 'B' | 'X';
		relationshipGroup: string;
		relation: string | null;
		role: string | null;
		attendanceType: 'day' | 'evening';
		isChild: boolean;
		isPlusOne: boolean;
		rsvpStatus: 'pending' | 'yes' | 'no';
	}
	export interface PanelHousehold {
		id: number;
		name: string;
		token: string;
		address: string | null;
		email: string | null;
		phone: string | null;
		personalMessage: string | null;
		inviteSentAt: string | null;
		members: PanelMember[];
	}

	let {
		household,
		summary,
		relationshipGroups,
		others,
		base
	}: {
		household: PanelHousehold;
		summary: HouseholdSummary;
		relationshipGroups: string[];
		others: { id: number; name: string }[]; // move-to targets
		base: string;
	} = $props();

	const h = $derived(household);
	const SIDE: Record<string, string> = { B: "Bride's side", G: "Groom's side", X: 'Both sides' };
	const invitedTo = $derived(
		summary.invited.day && summary.invited.eve
			? 'Day & evening'
			: summary.invited.eve
				? 'Evening'
				: 'Day'
	);

	// Fields whose change moves counts/labels elsewhere → refetch after saving.
	const REFRESH = new Set(['side', 'relationshipGroup', 'attendanceType', 'isChild', 'isPlusOne', 'rsvpStatus', 'name', 'address', 'email', 'phone']);
	async function save(kind: 'group' | 'guest', id: number, field: string, value: string | boolean) {
		await fetch('/dashboard/guests/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind, id, field, value })
		});
		if (REFRESH.has(field)) await invalidateAll();
	}

	const NEW_GROUP = '__new__';
	async function onRelChange(memberId: number, current: string, e: Event) {
		const sel = e.currentTarget as HTMLSelectElement;
		const v = sel.value;
		if (v === NEW_GROUP) {
			const name = window.prompt('New relationship group name:')?.trim();
			sel.value = current;
			if (!name) return;
			await save('guest', memberId, 'relationshipGroup', name);
			return;
		}
		await save('guest', memberId, 'relationshipGroup', v);
	}

	const confirmSubmit = (message: string) => (e: Event) => {
		if (!confirm(message)) e.preventDefault();
	};
</script>

<div class="panel">
	<header class="ph">
		<input class="h-name" value={h.name} placeholder="Household name"
			onchange={(e) => save('group', h.id, 'name', e.currentTarget.value)} />
		<span class={`status ${summary.rsvp.status}`}>{summary.rsvp.label}</span>
	</header>
	<p class="ph-sub">{h.members.length} {h.members.length === 1 ? 'guest' : 'guests'} · {SIDE[summary.side]} · {invitedTo}</p>

	<section class="sec">
		<p class="kicker">Guests</p>
		<div class="guests">
			{#each h.members as m (m.id)}
				<div class="guest">
					<div class="g-top">
						<input class="g-name" value={m.name} placeholder="Name"
							onchange={(e) => save('guest', m.id, 'name', e.currentTarget.value)} />
						<input class="g-role" value={m.role ?? ''} placeholder="Role" title="Wedding-party role, e.g. Best Man"
							onchange={(e) => save('guest', m.id, 'role', e.currentTarget.value)} />
						<form method="POST" action="?/removeGuest" use:enhance onsubmit={confirmSubmit(`Remove ${m.name}?`)}>
							<input type="hidden" name="id" value={m.id} />
							<button class="x" type="submit" title="Remove guest" aria-label="Remove guest">×</button>
						</form>
					</div>
					<div class="g-row">
						<select value={m.side} onchange={(e) => save('guest', m.id, 'side', e.currentTarget.value)} aria-label="Side">
							<option value="B">Bride</option><option value="G">Groom</option><option value="X">Both</option>
						</select>
						<select class="grow" value={m.relationshipGroup} onchange={(e) => onRelChange(m.id, m.relationshipGroup, e)} aria-label="Relationship group">
							{#each relationshipGroups as rg}<option value={rg}>{rg}</option>{/each}
							{#if !relationshipGroups.includes(m.relationshipGroup)}<option value={m.relationshipGroup}>{m.relationshipGroup}</option>{/if}
							<option value={NEW_GROUP}>+ New group…</option>
						</select>
						<input class="rel" value={m.relation ?? ''} placeholder="Relation"
							onchange={(e) => save('guest', m.id, 'relation', e.currentTarget.value)} />
					</div>
					<div class="g-row toggles">
						<span class="seg" role="group" aria-label="Invited to">
							<button type="button" class:on={m.attendanceType === 'day'} onclick={() => save('guest', m.id, 'attendanceType', 'day')}>Day</button>
							<button type="button" class:on={m.attendanceType === 'evening'} onclick={() => save('guest', m.id, 'attendanceType', 'evening')}>Evening</button>
						</span>
						<span class="seg" role="group" aria-label="Flags">
							<button type="button" class:on={m.isChild} aria-pressed={m.isChild} onclick={() => save('guest', m.id, 'isChild', !m.isChild)}>Child</button>
							<button type="button" class:on={m.isPlusOne} aria-pressed={m.isPlusOne} title="Unnamed plus-one slot" onclick={() => save('guest', m.id, 'isPlusOne', !m.isPlusOne)}>+1</button>
						</span>
						<span class="seg rsvp" role="group" aria-label="RSVP (admin override)">
							<button type="button" class="yes" class:on={m.rsvpStatus === 'yes'} onclick={() => save('guest', m.id, 'rsvpStatus', 'yes')}>Yes</button>
							<button type="button" class="no" class:on={m.rsvpStatus === 'no'} onclick={() => save('guest', m.id, 'rsvpStatus', 'no')}>No</button>
							<button type="button" class:on={m.rsvpStatus === 'pending'} title="Awaiting" onclick={() => save('guest', m.id, 'rsvpStatus', 'pending')}>—</button>
						</span>
						{#if others.length}
							<form method="POST" action="?/moveGuest" use:enhance class="move">
								<input type="hidden" name="id" value={m.id} />
								<select name="newGroupId" aria-label="Move to another household" onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}>
									<option value="">Move…</option>
									{#each others as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
								</select>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<form method="POST" action="?/addGuest" use:enhance class="addmember">
			<input type="hidden" name="groupId" value={h.id} />
			<input name="name" placeholder="Add a guest to this household…" />
			<button type="submit">+ Add</button>
		</form>
	</section>

	<section class="sec">
		<p class="kicker">Contact</p>
		<textarea rows="2" placeholder="Postal address for the invitation…" value={h.address ?? ''}
			onchange={(e) => save('group', h.id, 'address', e.currentTarget.value)}></textarea>
		<div class="two">
			<input type="email" placeholder="Email" value={h.email ?? ''} onchange={(e) => save('group', h.id, 'email', e.currentTarget.value)} />
			<input placeholder="Phone" value={h.phone ?? ''} onchange={(e) => save('group', h.id, 'phone', e.currentTarget.value)} />
		</div>
	</section>

	<section class="sec">
		<InvitePanel id={h.id} token={h.token} name={h.name} personalMessage={h.personalMessage} inviteSentAt={h.inviteSentAt} {base} />
	</section>

	<footer class="pf">
		<form method="POST" action="?/resetRsvps" use:enhance onsubmit={confirmSubmit(`Reset every RSVP in ${h.name} back to awaiting? Meal choices and messages are kept.`)}>
			<input type="hidden" name="id" value={h.id} />
			<button type="submit" class="link">Reset RSVPs</button>
		</form>
		<form method="POST" action="?/regenerateToken" use:enhance onsubmit={confirmSubmit('Generate a new RSVP link? Any printed QR codes for this household will stop working.')}>
			<input type="hidden" name="id" value={h.id} />
			<button type="submit" class="link">New link ↻</button>
		</form>
		<form method="POST" action="?/removeGroup" use:enhance class="right" onsubmit={confirmSubmit(`Delete ${h.name} and all ${h.members.length} guest(s)? This can't be undone.`)}>
			<input type="hidden" name="id" value={h.id} />
			<button type="submit" class="link danger">Delete household</button>
		</form>
	</footer>
</div>

<style>
	.panel { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px 14px; display: grid; gap: 16px; }
	.ph { display: flex; align-items: center; gap: 10px; }
	.h-name { flex: 1; min-width: 0; font-family: var(--serif); font-weight: 600; font-size: 22px; color: var(--ink); border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 2px 6px; margin-left: -6px; }
	.h-name:hover, .h-name:focus { border-color: var(--line); background: #fff; outline: none; }
	.status { flex: none; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: #f0ede5; color: #8a8678; }
	.status.replied { background: var(--sage-soft); color: var(--sage-deep); }
	.status.declined { background: var(--terra-bg); color: var(--terra); }
	.ph-sub { margin: -10px 0 0; font-size: 12px; color: var(--muted); }

	.sec { display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid var(--line2); }
	.kicker { margin: 0; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
	.guests { display: grid; gap: 8px; }
	.guest { border: 1px solid var(--line2); border-radius: 10px; padding: 10px 12px; display: grid; gap: 8px; background: var(--bg); }
	.g-top { display: flex; align-items: center; gap: 8px; }
	.g-name { flex: 1; min-width: 0; font-weight: 600; font-size: 14px; color: var(--ink); border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 4px 6px; margin-left: -6px; }
	.g-name:hover, .g-name:focus { border-color: var(--line); background: #fff; outline: none; }
	.g-role { width: 90px; font-size: 11.5px; border: 1px solid var(--line); border-radius: 6px; padding: 4px 7px; background: #fff; }
	.x { background: none; border: 0; color: var(--faint); font-size: 16px; cursor: pointer; line-height: 1; padding: 0 2px; }
	.x:hover { color: var(--terra); }
	.g-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.g-row select, .g-row input { border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; font: inherit; font-size: 12px; background: #fff; min-width: 0; }
	.g-row .grow { flex: 1; min-width: 140px; }
	.g-row .rel { width: 110px; }
	.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; background: #fff; }
	.seg button { border: 0; background: transparent; padding: 5px 9px; font: inherit; font-size: 11px; color: var(--muted); cursor: pointer; }
	.seg button + button { border-left: 1px solid var(--line2); }
	.seg button.on { background: var(--sage-soft); color: var(--sage-deep); font-weight: 600; }
	.seg.rsvp button.yes.on { background: var(--sage-deep); color: #fff; }
	.seg.rsvp button.no.on { background: var(--terra); color: #fff; }
	.move { margin-left: auto; }
	.move select { font-size: 11px; padding: 4px 6px; color: var(--muted); }
	.addmember { display: flex; gap: 8px; }
	.addmember input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 13px; }
	.addmember button { border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--sage-deep); font: inherit; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; padding: 0 14px; cursor: pointer; }
	.addmember button:hover { border-color: var(--sage); }

	.sec textarea, .sec .two input { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; background: #fff; color: var(--ink); width: 100%; box-sizing: border-box; resize: vertical; }
	.two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

	.pf { display: flex; gap: 14px; align-items: center; padding-top: 12px; border-top: 1px solid var(--line2); }
	.pf .right { margin-left: auto; }
	.link { background: none; border: 0; padding: 0; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; }
	.link:hover { color: var(--ink); text-decoration: underline; }
	.link.danger { color: var(--terra); }
</style>

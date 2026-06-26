import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

const GROUP_TEXT = new Set(['name']);
// Guest-CRM contact fields on the household — admin-only, not part of the seed,
// so editing them does not detach the row from its seed identity.
const GROUP_CONTACT = new Set(['address', 'email', 'phone']);
const GUEST_TEXT = new Set(['name', 'relation', 'role']);
const GUEST_ENUM_SIDE = new Set(['G', 'B', 'X']);
const GUEST_ENUM_ATTEND = new Set(['day', 'evening']);
const GUEST_ENUM_RSVP = new Set(['pending', 'yes', 'no']);
const GUEST_BOOL = new Set(['isChild', 'isPlusOne']);

// Field-level autosave for guest list + household editing.
// Any admin edit detaches the row from the seed by clearing seed_key — the
// admin's value then takes precedence over any subsequent reseed.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { kind, id, field, value } = await request.json();
	if (kind !== 'group' && kind !== 'guest') throw error(400, 'bad kind');
	await recordAudit(locals, {
		action: 'update',
		entity: kind === 'group' ? 'invite' : 'guest',
		entityId: Number(id),
		summary: `Edited ${kind} ${field}`
	});

	if (kind === 'group') {
		if (GROUP_TEXT.has(field)) {
			const v = String(value ?? '').trim() || 'Household';
			await db
				.update(inviteGroups)
				.set({ [field]: v, seedKey: null })
				.where(eq(inviteGroups.id, Number(id)));
			return json({ ok: true });
		}
		if (GROUP_CONTACT.has(field)) {
			const v = String(value ?? '').trim();
			await db
				.update(inviteGroups)
				.set({ [field]: v || null })
				.where(eq(inviteGroups.id, Number(id)));
			return json({ ok: true });
		}
		throw error(400, 'bad field');
	}

	if (kind === 'guest') {
		if (GUEST_TEXT.has(field)) {
			const v = String(value ?? '').trim();
			await db
				.update(guests)
				.set({ [field]: v || null, seedKey: null })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		if (field === 'side') {
			const v = String(value ?? '');
			if (!GUEST_ENUM_SIDE.has(v)) throw error(400, 'bad side');
			await db
				.update(guests)
				.set({ side: v as 'G' | 'B' | 'X', seedKey: null })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		if (field === 'attendanceType') {
			const v = String(value ?? '');
			if (!GUEST_ENUM_ATTEND.has(v)) throw error(400, 'bad attendance');
			await db
				.update(guests)
				.set({ attendanceType: v as 'day' | 'evening', seedKey: null })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		if (field === 'rsvpStatus') {
			// Admin override for RSVPs taken by phone/in person. Not seeded, so we
			// leave seed_key intact.
			const v = String(value ?? '');
			if (!GUEST_ENUM_RSVP.has(v)) throw error(400, 'bad rsvp');
			await db
				.update(guests)
				.set({ rsvpStatus: v as 'pending' | 'yes' | 'no' })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		if (field === 'relationshipGroup') {
			const v = String(value ?? '').trim() || 'Other';
			await db
				.update(guests)
				.set({ relationshipGroup: v, seedKey: null })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		if (GUEST_BOOL.has(field)) {
			await db
				.update(guests)
				.set({ [field]: !!value, seedKey: null })
				.where(eq(guests.id, Number(id)));
			return json({ ok: true });
		}
		throw error(400, 'bad field');
	}

	throw error(400, 'bad kind');
};

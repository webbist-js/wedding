import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const GROUP_TEXT = new Set(['name']);
const GUEST_TEXT = new Set(['name', 'relation', 'role']);
const GUEST_ENUM_SIDE = new Set(['G', 'B', 'X']);
const GUEST_ENUM_ATTEND = new Set(['day', 'evening']);
const GUEST_BOOL = new Set(['isChild', 'isPlusOne']);

// Field-level autosave for guest list + household editing.
// Any admin edit detaches the row from the seed by clearing seed_key — the
// admin's value then takes precedence over any subsequent reseed.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { kind, id, field, value } = await request.json();

	if (kind === 'group') {
		if (!GROUP_TEXT.has(field)) throw error(400, 'bad field');
		const v = String(value ?? '').trim() || 'Household';
		await db
			.update(inviteGroups)
			.set({ [field]: v, seedKey: null })
			.where(eq(inviteGroups.id, Number(id)));
		return json({ ok: true });
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

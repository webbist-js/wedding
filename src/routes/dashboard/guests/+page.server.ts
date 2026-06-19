import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests, seatAssignments } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { summarise, type GuestRow } from '$lib/server/queries';
import { randomBytes } from 'node:crypto';

function makeToken(): string {
	return randomBytes(12).toString('base64url');
}

export const load: PageServerLoad = async () => {
	const allGroups = await db.select().from(inviteGroups).orderBy(asc(inviteGroups.name));
	const allGuests = await db.select().from(guests).orderBy(asc(guests.id));
	const summary = summarise(allGuests as unknown as GuestRow[]);
	const relationshipGroups = [
		...new Set(allGuests.map((g) => g.relationshipGroup).filter(Boolean))
	].sort();
	const households = allGroups.map((g) => ({
		...g,
		members: allGuests.filter((m) => m.groupId === g.id)
	}));
	return { households, summary, relationshipGroups };
};

export const actions: Actions = {
	addGroup: async ({ request }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim() || 'New household';
		await db.insert(inviteGroups).values({ name, token: makeToken() });
	},
	removeGroup: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		const memberIds = (await db.select().from(guests).where(eq(guests.groupId, id))).map(
			(m) => m.id
		);
		for (const mid of memberIds) {
			await db.delete(seatAssignments).where(eq(seatAssignments.guestId, mid));
		}
		await db.delete(guests).where(eq(guests.groupId, id));
		await db.delete(inviteGroups).where(eq(inviteGroups.id, id));
	},
	addGuest: async ({ request }) => {
		const f = await request.formData();
		const groupId = Number(f.get('groupId'));
		const name = String(f.get('name') ?? '').trim() || 'New guest';
		await db.insert(guests).values({
			groupId,
			name,
			side: 'G',
			relationshipGroup: 'Other',
			attendanceType: 'day',
			isChild: false,
			isPlusOne: false
		});
	},
	removeGuest: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		await db.delete(seatAssignments).where(eq(seatAssignments.guestId, id));
		await db.delete(guests).where(eq(guests.id, id));
	},
	moveGuest: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		const newGroupId = Number(f.get('newGroupId'));
		if (newGroupId) {
			await db.update(guests).set({ groupId: newGroupId }).where(eq(guests.id, id));
		}
	},
	regenerateToken: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		await db.update(inviteGroups).set({ token: makeToken() }).where(eq(inviteGroups.id, id));
	}
};

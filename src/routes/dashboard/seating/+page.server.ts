import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { guests, seatAssignments, seatingTables, settings } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { TABLE_KINDS, isTableKind, COUPLE } from '$lib/seating';

async function setSetting(key: string, value: string) {
	const [existing] = await db.select().from(settings).where(eq(settings.key, key));
	if (existing) await db.update(settings).set({ value }).where(eq(settings.key, key));
	else await db.insert(settings).values({ key, value });
}

export const load: PageServerLoad = async () => {
	const all = await db.select().from(guests);
	const seats = await db.select().from(seatAssignments);
	const tables = await db
		.select()
		.from(seatingTables)
		.orderBy(asc(seatingTables.sort), asc(seatingTables.number));
	const setRows = await db.select().from(settings);
	const s = Object.fromEntries(setRows.map((r) => [r.key, r.value]));
	const seatMap = new Map(seats.map((x) => [x.guestId, x.tableNo]));

	return {
		seatMode: s.seatMode ?? 'day',
		tables,
		guests: all.map((g) => ({ ...g, tableNo: seatMap.get(g.id) ?? null })),
		couple: {
			bride: s.seatBride ? Number(s.seatBride) : null,
			groom: s.seatGroom ? Number(s.seatGroom) : null
		}
	};
};

export const actions: Actions = {
	// Assign / unassign a guest OR a member of the couple to a table number.
	assign: async ({ request }) => {
		const f = await request.formData();
		const who = String(f.get('who') ?? ''); // '', 'bride' or 'groom'
		const raw = f.get('tableNo');
		const tableNo = raw ? Number(raw) : null;

		const coupleMember = COUPLE.find((c) => c.key === who);
		if (coupleMember) {
			await setSetting(coupleMember.settingKey, tableNo ? String(tableNo) : '');
			return;
		}

		const guestId = Number(f.get('guestId'));
		if (!guestId) return;
		if (tableNo == null) {
			await db.delete(seatAssignments).where(eq(seatAssignments.guestId, guestId));
		} else {
			await db
				.insert(seatAssignments)
				.values({ guestId, tableNo })
				.onConflictDoUpdate({ target: seatAssignments.guestId, set: { tableNo } });
		}
	},

	addTable: async ({ request }) => {
		const f = await request.formData();
		const kindRaw = String(f.get('kind') ?? 'round');
		const kind = isTableKind(kindRaw) ? kindRaw : 'round';
		const existing = await db.select().from(seatingTables);
		const nextNumber = existing.reduce((m, t) => Math.max(m, t.number), 0) + 1;
		const nextSort = existing.reduce((m, t) => Math.max(m, t.sort), 0) + 1;
		await db.insert(seatingTables).values({
			number: nextNumber,
			kind,
			seats: TABLE_KINDS[kind].seats,
			sort: nextSort
		});
	},

	updateTable: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		if (!id) return;
		const kindRaw = String(f.get('kind') ?? 'round');
		const kind = isTableKind(kindRaw) ? kindRaw : 'round';
		const seats = Math.max(1, Math.min(40, Number(f.get('seats')) || 1));
		const label = String(f.get('label') ?? '').trim() || null;
		await db.update(seatingTables).set({ kind, seats, label }).where(eq(seatingTables.id, id));
	},

	removeTable: async ({ request }) => {
		const f = await request.formData();
		const id = Number(f.get('id'));
		if (!id) return;
		const [row] = await db.select().from(seatingTables).where(eq(seatingTables.id, id));
		if (!row) return;
		// Free anyone sitting there so we don't leave orphaned assignments.
		await db.delete(seatAssignments).where(eq(seatAssignments.tableNo, row.number));
		const s = Object.fromEntries((await db.select().from(settings)).map((r) => [r.key, r.value]));
		if (s.seatBride && Number(s.seatBride) === row.number) await setSetting('seatBride', '');
		if (s.seatGroom && Number(s.seatGroom) === row.number) await setSetting('seatGroom', '');
		await db.delete(seatingTables).where(eq(seatingTables.id, id));
	},

	setMode: async ({ request }) => {
		const f = await request.formData();
		const mode = String(f.get('seatMode') ?? 'day') === 'all' ? 'all' : 'day';
		await setSetting('seatMode', mode);
	},

	clear: async () => {
		await db.delete(seatAssignments);
		await setSetting('seatBride', '');
		await setSetting('seatGroom', '');
	}
};

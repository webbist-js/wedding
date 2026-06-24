import { db } from './db/index';
import { seatAssignments, seatingTables, settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { COUPLE } from '$lib/seating';

// An occupant of a seat: either a guest row or a member of the couple (whose
// seat lives in the seatBride / seatGroom settings as "tableNo:seatNo").
export type Occupant = { kind: 'guest'; id: number } | { kind: 'couple'; key: 'bride' | 'groom' };

export interface SeatPos {
	tableNo: number;
	seatNo: number | null;
}

export function parseOccupant(s: unknown): Occupant | null {
	const [k, v] = String(s ?? '').split(':');
	if (k === 'guest' && v) return { kind: 'guest', id: Number(v) };
	if (k === 'couple' && (v === 'bride' || v === 'groom')) return { kind: 'couple', key: v };
	return null;
}

const settingKeyFor = (key: 'bride' | 'groom') => (key === 'bride' ? 'seatBride' : 'seatGroom');

async function getSetting(key: string): Promise<string> {
	const [r] = await db.select().from(settings).where(eq(settings.key, key));
	return r?.value ?? '';
}

export async function setSetting(key: string, value: string) {
	const [existing] = await db.select().from(settings).where(eq(settings.key, key));
	if (existing) await db.update(settings).set({ value }).where(eq(settings.key, key));
	else await db.insert(settings).values({ key, value });
}

export function parseCoupleSeat(v: string | undefined): SeatPos | null {
	if (!v) return null;
	const [t, s] = v.split(':');
	return { tableNo: Number(t), seatNo: s !== undefined && s !== '' ? Number(s) : null };
}

function sameOccupant(a: Occupant, b: Occupant) {
	return a.kind === b.kind && (a.kind === 'guest'
		? a.id === (b as { id: number }).id
		: a.key === (b as { key: string }).key);
}

async function currentSeatOf(o: Occupant): Promise<SeatPos | null> {
	if (o.kind === 'guest') {
		const [r] = await db.select().from(seatAssignments).where(eq(seatAssignments.guestId, o.id));
		return r ? { tableNo: r.tableNo, seatNo: r.seatNo } : null;
	}
	return parseCoupleSeat(await getSetting(settingKeyFor(o.key)));
}

async function writeSeat(o: Occupant, pos: SeatPos | null) {
	if (o.kind === 'guest') {
		if (!pos) {
			await db.delete(seatAssignments).where(eq(seatAssignments.guestId, o.id));
			return;
		}
		await db
			.insert(seatAssignments)
			.values({ guestId: o.id, tableNo: pos.tableNo, seatNo: pos.seatNo })
			.onConflictDoUpdate({
				target: seatAssignments.guestId,
				set: { tableNo: pos.tableNo, seatNo: pos.seatNo }
			});
	} else {
		await setSetting(settingKeyFor(o.key), pos ? `${pos.tableNo}:${pos.seatNo ?? ''}` : '');
	}
}

// Who currently occupies (tableNo, seatNo), excluding `except`. A null seatNo
// only matches a null seatNo (overflow slot).
async function occupantAt(
	tableNo: number,
	seatNo: number | null,
	except?: Occupant
): Promise<Occupant | null> {
	const rows = await db
		.select()
		.from(seatAssignments)
		.where(eq(seatAssignments.tableNo, tableNo));
	for (const r of rows) {
		if (r.seatNo === seatNo) {
			const o: Occupant = { kind: 'guest', id: r.guestId };
			if (!except || !sameOccupant(o, except)) return o;
		}
	}
	for (const c of COUPLE) {
		const pos = await currentSeatOf({ kind: 'couple', key: c.key });
		if (pos && pos.tableNo === tableNo && pos.seatNo === seatNo) {
			const o: Occupant = { kind: 'couple', key: c.key };
			if (!except || !sameOccupant(o, except)) return o;
		}
	}
	return null;
}

// Place an occupant at (tableNo, seatNo). null tableNo unseats them. If the
// target seat is taken, the sitting occupant swaps into the mover's old seat
// (or is unseated if the mover came from the pool).
export async function placeOccupant(o: Occupant, tableNo: number | null, seatNo: number | null) {
	if (tableNo == null) {
		await writeSeat(o, null);
		return;
	}
	const prev = await currentSeatOf(o);
	const displaced = seatNo != null ? await occupantAt(tableNo, seatNo, o) : null;
	await writeSeat(o, { tableNo, seatNo });
	if (displaced) await writeSeat(displaced, prev ?? null);
}

// Lowest free seat 1..capacity at a table, or null if it's full.
export async function firstFreeSeat(tableNo: number): Promise<number | null> {
	const [t] = await db.select().from(seatingTables).where(eq(seatingTables.number, tableNo));
	const cap = t?.seats ?? 0;
	const taken = new Set<number>();
	const rows = await db.select().from(seatAssignments).where(eq(seatAssignments.tableNo, tableNo));
	for (const r of rows) if (r.seatNo != null) taken.add(r.seatNo);
	for (const c of COUPLE) {
		const pos = await currentSeatOf({ kind: 'couple', key: c.key });
		if (pos && pos.tableNo === tableNo && pos.seatNo != null) taken.add(pos.seatNo);
	}
	for (let i = 1; i <= cap; i++) if (!taken.has(i)) return i;
	return null;
}

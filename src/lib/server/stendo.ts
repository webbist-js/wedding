// Server-side answers for The Stendo Vol. 02 (/stendo).
//
// One row per person, keyed by their name (case/spacing-insensitive). No login:
// it's a link shared with twelve friends, and the name is the identity, so
// picking your name on a new phone brings your answers back. The public page
// only ever sees totals; the per-person table (including who asked for Katie &
// Alex's top-up) is only returned to a signed-in organiser.

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { stenCpResponses } from '$lib/server/db/schema';
import { STEN_VOTERS } from '$lib/sten-voters';
import { cleanName, nameKey, sanitizeResponse, tally, type Response, type Tally } from '$lib/stendo';

type Row = typeof stenCpResponses.$inferSelect;

function toResponse(row: Row): Response & { updatedAt: string | null } {
	const clean = sanitizeResponse({
		village: row.village,
		accom: row.accom,
		twinOk: !!row.twinOk,
		budget: row.budget,
		offer: !!row.offer,
		notes: row.notes ?? ''
	});
	return { name: row.name, ...clean, updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null };
}

export async function allResponses() {
	const rows = await db.select().from(stenCpResponses);
	return rows.map(toResponse).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

export async function getResponse(rawName: unknown) {
	const key = nameKey(cleanName(rawName));
	if (!key) return null;
	const [row] = await db.select().from(stenCpResponses).where(eq(stenCpResponses.nameKey, key));
	return row ? toResponse(row) : null;
}

export async function saveResponse(rawName: unknown, body: unknown) {
	const name = cleanName(rawName);
	if (!name) throw new Error('name required');
	const clean = sanitizeResponse(body);
	const now = new Date();
	const values = {
		nameKey: nameKey(name),
		name,
		village: clean.village,
		accom: clean.accom,
		twinOk: clean.twinOk ? 1 : 0,
		budget: clean.budget,
		offer: clean.offer ? 1 : 0,
		notes: clean.notes,
		updatedAt: now
	};
	await db
		.insert(stenCpResponses)
		.values({ ...values, createdAt: now })
		.onConflictDoUpdate({ target: stenCpResponses.nameKey, set: values });
	return { name, ...clean };
}

export async function summary(): Promise<{ tally: Tally; names: string[]; responded: string[] }> {
	const rows = await allResponses();
	const seen = new Map<string, string>(STEN_VOTERS.map((n) => [nameKey(n), n]));
	for (const r of rows) if (!seen.has(nameKey(r.name))) seen.set(nameKey(r.name), r.name);
	return {
		tally: tally(rows),
		names: [...seen.values()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
		responded: rows.filter((r) => r.village || r.accom).map((r) => r.name)
	};
}

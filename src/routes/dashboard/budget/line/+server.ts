import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { budgetLines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { VENUE_BUDGET_CATEGORY } from '$lib/server/db/data';

const NUMERIC = new Set(['budgeted', 'confirmed', 'paid']);
const TEXT = new Set(['category', 'status', 'section']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, field, value } = await request.json();
	if (!NUMERIC.has(field) && !TEXT.has(field)) throw error(400, 'bad field');

	const [row] = await db
		.select()
		.from(budgetLines)
		.where(eq(budgetLines.id, Number(id)));
	if (!row) throw error(404);

	// Guard the venue line — confirmed is synced from the Venue tab, and its
	// category/section are fixed so the sync key stays stable.
	if (
		row.category === VENUE_BUDGET_CATEGORY &&
		(field === 'confirmed' || field === 'category' || field === 'section')
	) {
		throw error(400, 'Venue line is synced from the Venue tab');
	}

	const set: Record<string, number | string> = {};
	set[field] = NUMERIC.has(field) ? Number(value) || 0 : String(value);
	await db
		.update(budgetLines)
		.set(set)
		.where(eq(budgetLines.id, Number(id)));
	return json({ ok: true });
};

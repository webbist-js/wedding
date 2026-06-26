import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { budgetLines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';

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

	const set: Record<string, number | string> = {};
	set[field] = NUMERIC.has(field) ? Number(value) || 0 : String(value);
	await db
		.update(budgetLines)
		.set(set)
		.where(eq(budgetLines.id, Number(id)));
	await recordAudit(locals, { action: 'update', entity: 'budget_line', entityId: Number(id), summary: `${row.category}: ${field}` });
	return json({ ok: true });
};

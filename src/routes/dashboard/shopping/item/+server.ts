import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { shoppingItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Field-level autosave for a shopping item.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, field, value } = await request.json();
	const set: Record<string, string | number | boolean> = {};
	if (field === 'label') set.label = String(value ?? '').trim() || 'Item';
	else if (field === 'notes') set.notes = String(value ?? '').trim() || (null as unknown as string);
	else if (field === 'qty') set.qty = Math.max(1, Math.round(Number(value) || 1));
	else if (field === 'cost') set.cost = Math.max(0, Number(value) || 0);
	else if (field === 'bought') set.bought = !!value;
	else throw error(400, 'bad field');

	await db.update(shoppingItems).set(set).where(eq(shoppingItems.id, Number(id)));
	return json({ ok: true });
};

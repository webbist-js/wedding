import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { inviteGroups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, message } = await request.json();
	const value = typeof message === 'string' ? message.trim() : '';
	await db
		.update(inviteGroups)
		.set({ personalMessage: value || null })
		.where(eq(inviteGroups.id, Number(id)));
	return json({ ok: true });
};

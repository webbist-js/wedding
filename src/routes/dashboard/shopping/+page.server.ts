import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { shoppingItems } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => ({
	items: await db.select().from(shoppingItems).orderBy(asc(shoppingItems.sort), asc(shoppingItems.id))
});

export const actions: Actions = {
	add: async ({ request }) => {
		const f = await request.formData();
		const label = String(f.get('label') ?? '').trim() || 'New item';
		const existing = await db.select().from(shoppingItems);
		const maxSort = existing.reduce((m, i) => Math.max(m, i.sort), 0);
		await db.insert(shoppingItems).values({ label, qty: 1, cost: 0, sort: maxSort + 1 });
	},
	remove: async ({ request }) => {
		const f = await request.formData();
		await db.delete(shoppingItems).where(eq(shoppingItems.id, Number(f.get('id'))));
	}
};

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { suppliers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';

const FIELDS = new Set(['category', 'name', 'contact', 'status', 'notes']);

// Field-level autosave for a supplier row. Pings Slack once when a supplier
// transitions into "booked" (mirrors the old form action).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, field, value } = await request.json();
	if (!FIELDS.has(field)) throw error(400, 'bad field');

	const [prev] = await db.select().from(suppliers).where(eq(suppliers.id, Number(id)));
	if (!prev) throw error(404);

	const v = String(value ?? '');
	await db
		.update(suppliers)
		.set(field === 'category' ? { category: v || 'New' } : { [field]: v || null })
		.where(eq(suppliers.id, Number(id)));

	if (field === 'status' && v === 'booked' && prev.status !== 'booked') {
		const base = env.PUBLIC_BASE_URL ?? '';
		await notifySupplierBooked({
			category: prev.category,
			name: prev.name || null,
			contact: prev.contact || null,
			dashboardUrl: base ? `${base}/dashboard/suppliers` : undefined
		});
	}
	return json({ ok: true });
};

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { vendors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { notifySupplierBooked } from '$lib/server/slack';
import { recordAudit } from '$lib/server/audit';

const TEXT = new Set(['category', 'name', 'contact', 'phone', 'email', 'website', 'address', 'stage', 'followUpDate']);
const NUM = new Set(['quotedAmount', 'depositAmount', 'priority']);
const BOOL = new Set(['depositPaid']);

// Field-level autosave for a vendor row. Fires the Slack "chosen supplier"
// ping once when deposit_paid flips false -> true.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const { id, field, value } = await request.json();
	if (!TEXT.has(field) && !NUM.has(field) && !BOOL.has(field)) throw error(400, 'bad field');

	const [prev] = await db.select().from(vendors).where(eq(vendors.id, Number(id)));
	if (!prev) throw error(404);

	let set: Record<string, unknown>;
	if (BOOL.has(field)) set = { [field]: !!value };
	else if (NUM.has(field)) set = { [field]: value === '' || value == null ? null : Number(value) };
	else if (field === 'category') set = { category: String(value ?? '') || 'New' };
	else if (field === 'stage') set = { stage: String(value ?? '') || 'Lead' };
	else set = { [field]: String(value ?? '') || null };

	await db.update(vendors).set(set).where(eq(vendors.id, Number(id)));

	await recordAudit(locals, {
		action: 'update',
		entity: 'vendor',
		entityId: Number(id),
		summary: `${prev.category}${prev.name ? ' · ' + prev.name : ''}: ${field}`
	});

	if (field === 'depositPaid' && !!value && !prev.depositPaid) {
		const base = env.PUBLIC_BASE_URL ?? '';
		await notifySupplierBooked({
			category: prev.category,
			name: prev.name || null,
			contact: prev.contact || null,
			dashboardUrl: base ? `${base}/dashboard/vendors` : undefined
		});
	}
	return json({ ok: true });
};

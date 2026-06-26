import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { appointments, vendors } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { notifyAppointment } from '$lib/server/slack';
import { recordAudit } from '$lib/server/audit';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			location: appointments.location,
			notes: appointments.notes,
			supplierId: appointments.vendorId,
			supplierName: vendors.name,
			supplierCategory: vendors.category
		})
		.from(appointments)
		.leftJoin(vendors, eq(appointments.vendorId, vendors.id))
		.orderBy(asc(appointments.date), asc(appointments.time));

	const supplierList = await db
		.select({ id: vendors.id, category: vendors.category, name: vendors.name })
		.from(vendors)
		.orderBy(asc(vendors.category));

	return { appointments: rows, suppliers: supplierList };
};

function vals(f: FormData) {
	const supplierId = String(f.get('supplierId') ?? '');
	return {
		title: String(f.get('title') ?? '').trim() || 'Appointment',
		date: String(f.get('date') ?? '').trim(),
		time: String(f.get('time') ?? '').trim() || null,
		location: String(f.get('location') ?? '').trim() || null,
		notes: String(f.get('notes') ?? '').trim() || null,
		vendorId: supplierId ? Number(supplierId) : null
	};
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.authed) throw error(401);
		const f = await request.formData();
		const v = vals(f);
		if (!v.date) return; // a date is required
		const [appt] = await db.insert(appointments).values({ ...v, createdAt: new Date() }).returning({ id: appointments.id });
		await recordAudit(locals, { action: 'create', entity: 'appointment', entityId: appt.id, summary: v.title });

		// Best-effort Slack ping that a new appointment was booked.
		let supplierName: string | null = null;
		if (v.vendorId) {
			const [s] = await db
				.select({ category: vendors.category, name: vendors.name })
				.from(vendors)
				.where(eq(vendors.id, v.vendorId));
			if (s) supplierName = s.name ? `${s.category} · ${s.name}` : s.category;
		}
		const base = env.PUBLIC_BASE_URL ?? '';
		await notifyAppointment({
			kind: 'booked',
			title: v.title,
			dateISO: v.date,
			time: v.time,
			supplierName,
			location: v.location,
			notes: v.notes,
			dashboardUrl: base ? `${base}/dashboard/calendar` : undefined
		});
	},
	update: async ({ request, locals }) => {
		if (!locals.authed) throw error(401);
		const f = await request.formData();
		const id = Number(f.get('id'));
		const v = vals(f);
		if (!v.date) return;
		await db.update(appointments).set(v).where(eq(appointments.id, id));
		await recordAudit(locals, { action: 'update', entity: 'appointment', entityId: id, summary: v.title });
	},
	remove: async ({ request, locals }) => {
		if (!locals.authed) throw error(401);
		const f = await request.formData();
		const id = Number(f.get('id'));
		await db.delete(appointments).where(eq(appointments.id, id));
		await recordAudit(locals, { action: 'delete', entity: 'appointment', entityId: id, summary: 'Removed an appointment' });
	}
};

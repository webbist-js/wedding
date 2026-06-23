import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { appointments, suppliers } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { notifyAppointment } from '$lib/server/slack';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			location: appointments.location,
			notes: appointments.notes,
			supplierId: appointments.supplierId,
			supplierName: suppliers.name,
			supplierCategory: suppliers.category
		})
		.from(appointments)
		.leftJoin(suppliers, eq(appointments.supplierId, suppliers.id))
		.orderBy(asc(appointments.date), asc(appointments.time));

	const supplierList = await db
		.select({ id: suppliers.id, category: suppliers.category, name: suppliers.name })
		.from(suppliers)
		.orderBy(asc(suppliers.category));

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
		supplierId: supplierId ? Number(supplierId) : null
	};
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.authed) throw error(401);
		const f = await request.formData();
		const v = vals(f);
		if (!v.date) return; // a date is required
		await db.insert(appointments).values({ ...v, createdAt: new Date() });

		// Best-effort Slack ping that a new appointment was booked.
		let supplierName: string | null = null;
		if (v.supplierId) {
			const [s] = await db
				.select({ category: suppliers.category, name: suppliers.name })
				.from(suppliers)
				.where(eq(suppliers.id, v.supplierId));
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
	},
	remove: async ({ request, locals }) => {
		if (!locals.authed) throw error(401);
		const f = await request.formData();
		await db.delete(appointments).where(eq(appointments.id, Number(f.get('id'))));
	}
};

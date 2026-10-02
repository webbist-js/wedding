import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { vendors, appointments, notes, budgetLines, payments } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';

// Read-only loader; every supplier mutation goes through ./edit so the Budget
// expander and this page share one code path.

export const load: PageServerLoad = async () => ({
	suppliers: await db.select().from(vendors).orderBy(asc(vendors.sort), asc(vendors.id)),
	appointments: await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			vendorId: appointments.vendorId
		})
		.from(appointments)
		.orderBy(asc(appointments.date), asc(appointments.time)),
	// Cross-linked notes filed against a supplier — also surface in the Notes hub.
	notes: await db
		.select()
		.from(notes)
		.where(eq(notes.entityType, 'vendor'))
		.orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id)),
	payments: await db.select().from(payments).orderBy(asc(payments.id)),
	// Budget lines a supplier can be filed under.
	lineOptions: await db
		.select({ id: budgetLines.id, category: budgetLines.category, section: budgetLines.section })
		.from(budgetLines)
		.orderBy(asc(budgetLines.sort))
});

import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index';
import { vendors, appointments, notes, budgetLines, payments } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { recordAudit } from '$lib/server/audit';
import { linkedConfirmed } from '$lib/money';

export const load: PageServerLoad = async () => ({
  vendors: await db.select().from(vendors).orderBy(asc(vendors.sort)),
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
  // Cross-linked notes filed against a vendor — also surface in the Notes hub.
  notes: await db
    .select()
    .from(notes)
    .where(eq(notes.entityType, 'vendor'))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id)),
  payments: await db.select().from(payments).orderBy(asc(payments.id))
});

export const actions: Actions = {
  add: async ({ locals }) => {
    const [row] = await db
      .insert(vendors)
      .values({ category: 'New', stage: 'Lead', sort: 999 })
      .returning({ id: vendors.id });
    await recordAudit(locals, { action: 'create', entity: 'vendor', entityId: row.id, summary: 'Added a vendor' });
  },
  remove: async ({ request, locals }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const [v] = await db.select({ category: vendors.category }).from(vendors).where(eq(vendors.id, id));
    // Detach any calendar appointments from this vendor before deletion so we
    // preserve the appointments themselves while satisfying the FK constraint.
    await db.update(appointments).set({ vendorId: null }).where(eq(appointments.vendorId, id));
    // Money safety: freeze the derived confirmed figure into any linked budget
    // line, unlink it, and re-attach this vendor's payments to that line (or
    // leave them vendor-less if no line) — spend history survives the delete.
    const [vRow] = await db.select().from(vendors).where(eq(vendors.id, id));
    const [linked] = await db.select().from(budgetLines).where(eq(budgetLines.vendorId, id));
    if (linked && vRow) {
      await db
        .update(budgetLines)
        .set({
          vendorId: null,
          confirmed: linkedConfirmed(vRow),
          status: vRow.depositPaid ? 'Deposit' : linked.status
        })
        .where(eq(budgetLines.id, linked.id));
    }
    await db
      .update(payments)
      .set({ vendorId: null, budgetLineId: linked?.id ?? null })
      .where(eq(payments.vendorId, id));
    await db.delete(vendors).where(eq(vendors.id, id));
    await recordAudit(locals, { action: 'delete', entity: 'vendor', entityId: id, summary: `Removed ${v?.category ?? 'a vendor'}` });
  }
};

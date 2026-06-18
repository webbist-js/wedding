import { db } from './index';
import {
  inviteGroups,
  guests,
  seatAssignments,
  budgetLines,
  timelinePhases,
  timelineItems,
  suppliers,
  quoteLines,
  stationeryItems,
  settings
} from './schema';
import {
  SEED_GUESTS,
  SEED_QUOTE,
  SEED_SUPPLIERS,
  SEED_TIMELINE,
  SEED_BUDGET,
  SEED_STATIONERY,
  SEED_SETTINGS
} from './data';
import { buildInviteGroups } from './seed-helpers';

export async function seed(): Promise<void> {
  // Delete all rows in FK-safe order (children before parents).
  await db.delete(seatAssignments);
  await db.delete(guests);
  await db.delete(inviteGroups);
  await db.delete(budgetLines);
  await db.delete(timelineItems);
  await db.delete(timelinePhases);
  await db.delete(suppliers);
  await db.delete(quoteLines);
  await db.delete(stationeryItems);
  await db.delete(settings);

  // Invite groups — capture generated ids by key.
  const built = buildInviteGroups(SEED_GUESTS);
  const idByKey = new Map<string, number>();
  for (const g of built) {
    const [row] = await db
      .insert(inviteGroups)
      .values({ name: g.name, token: g.token })
      .returning({ id: inviteGroups.id });
    idByKey.set(g.key, row.id);
  }

  // Guests — linked to their group id.
  for (const guest of SEED_GUESTS) {
    const groupId = idByKey.get(guest.inviteGroup);
    if (groupId === undefined) {
      throw new Error(`No invite group id for key "${guest.inviteGroup}"`);
    }
    await db.insert(guests).values({
      groupId,
      name: guest.name,
      side: guest.side,
      relationshipGroup: guest.relationshipGroup,
      relation: guest.relation ?? null,
      role: guest.role ?? null,
      attendanceType: guest.attendanceType,
      isChild: guest.isChild ?? false,
      meal: guest.meal ?? null,
      dietaryNotes: guest.dietaryNotes ?? null
    });
  }

  // Quote lines.
  for (const [i, q] of SEED_QUOTE.entries()) {
    await db.insert(quoteLines).values({
      label: q.label,
      section: q.section,
      scope: q.scope,
      price: q.price,
      qty: q.qty ?? null,
      included: q.included ?? false,
      confirmed: q.confirmed ?? false,
      bond: q.bond ?? false,
      sort: i
    });
  }

  // Suppliers.
  for (const [i, s] of SEED_SUPPLIERS.entries()) {
    await db.insert(suppliers).values({
      category: s.category,
      name: s.name ?? null,
      contact: s.contact ?? null,
      status: s.status,
      notes: s.notes ?? null,
      sort: i
    });
  }

  // Timeline phases + their items.
  for (const [pi, phase] of SEED_TIMELINE.entries()) {
    const [phaseRow] = await db
      .insert(timelinePhases)
      .values({ title: phase.title, window: phase.window, sort: pi })
      .returning({ id: timelinePhases.id });
    for (const [ii, item] of phase.items.entries()) {
      await db.insert(timelineItems).values({
        phaseId: phaseRow.id,
        label: item.label,
        done: item.done,
        sort: ii
      });
    }
  }

  // Budget lines.
  for (const [i, b] of SEED_BUDGET.entries()) {
    await db.insert(budgetLines).values({
      category: b.category,
      budgeted: b.budgeted,
      confirmed: b.confirmed,
      paid: b.paid,
      status: b.status,
      sort: i
    });
  }

  // Stationery items.
  for (const [i, label] of SEED_STATIONERY.entries()) {
    await db.insert(stationeryItems).values({ label, done: false, sort: i });
  }

  // Settings.
  for (const [key, value] of Object.entries(SEED_SETTINGS)) {
    await db.insert(settings).values({ key, value });
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => {
      console.log('Seeded.');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

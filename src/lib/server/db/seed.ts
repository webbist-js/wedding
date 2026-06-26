import { and, eq } from 'drizzle-orm';
import { db } from './index';
import {
	inviteGroups,
	guests,
	seatAssignments,
	budgetLines,
	timelinePhases,
	timelineItems,
	vendors,
	quoteLines,
	stationeryItems,
	settings,
	notes,
	seatingTables
} from './schema';
import {
	SEED_GUESTS,
	SEED_QUOTE,
	SEED_VENDORS,
	SEED_TIMELINE,
	SEED_BUDGET,
	SEED_STATIONERY,
	SEED_NOTES,
	SEED_TABLES,
	SEED_SETTINGS,
	type SeedGuest
} from './data';
import { buildInviteGroups } from './seed-helpers';

/**
 * Idempotent seed that PRESERVES tokens and user-entered data across runs.
 *
 * - invite_groups + guests are upserted by `seed_key`. Tokens, RSVP responses,
 *   personal messages, household notes, and any plus-one names the guest
 *   typed in stay intact when reseeding.
 * - Older rows that pre-date the seed_key column are backfilled by name match
 *   before any new inserts run, so a single reseed migrates legacy data
 *   without wiping it.
 * - Static reference data (budget defaults, suppliers, timeline, quote lines,
 *   stationery checklist, settings) is only inserted when its table is empty,
 *   so the couple's edits in the admin dashboard are never overwritten.
 */
export async function seed(): Promise<void> {
	const built = buildInviteGroups(SEED_GUESTS);

	// Snapshot existing guests so we can backfill seed_keys on legacy rows by
	// matching any one of a group's seed members to an existing guest by name.
	// (Matching by group name alone is fragile — adding a new household member
	// changes the auto-generated group display name.)
	const existingGuestsAtStart = await db.select().from(guests);
	const groupIdByGuestName = new Map<string, number>();
	for (const g of existingGuestsAtStart) {
		groupIdByGuestName.set(g.name.toLowerCase().trim(), g.groupId);
	}

	// ---- Invite groups ----
	const idByKey = new Map<string, number>();
	for (const g of built) {
		// 1) exact match on seed_key (the steady state)
		let [existing] = await db
			.select()
			.from(inviteGroups)
			.where(eq(inviteGroups.seedKey, g.key));

		// 2) legacy backfill via any member overlap.
		if (!existing) {
			const seedMembers = SEED_GUESTS.filter((s) => s.inviteGroup === g.key);
			for (const sm of seedMembers) {
				const gid = groupIdByGuestName.get(sm.name.toLowerCase().trim());
				if (gid === undefined) continue;
				const [grp] = await db.select().from(inviteGroups).where(eq(inviteGroups.id, gid));
				if (grp && grp.seedKey == null) {
					await db
						.update(inviteGroups)
						.set({ seedKey: g.key })
						.where(eq(inviteGroups.id, gid));
					existing = { ...grp, seedKey: g.key };
					break;
				}
			}
		}

		if (existing) {
			// Update the seed-owned field (display name) but never the token /
			// personal_message / allergies_note / message / responded_at.
			if (existing.name !== g.name) {
				await db.update(inviteGroups).set({ name: g.name }).where(eq(inviteGroups.id, existing.id));
			}
			idByKey.set(g.key, existing.id);
		} else {
			const [row] = await db
				.insert(inviteGroups)
				.values({ seedKey: g.key, name: g.name, token: g.token })
				.returning({ id: inviteGroups.id });
			idByKey.set(g.key, row.id);
		}
	}

	// ---- Guests ----
	for (const guest of SEED_GUESTS) {
		const groupId = idByKey.get(guest.inviteGroup);
		if (groupId === undefined) {
			throw new Error(`No invite group id for key "${guest.inviteGroup}"`);
		}
		const key = guestSeedKey(guest);

		// 1) exact match on seed_key
		let [existing] = await db.select().from(guests).where(eq(guests.seedKey, key));

		// 2) legacy backfill: match by group + original seed name
		if (!existing) {
			const candidates = await db
				.select()
				.from(guests)
				.where(and(eq(guests.groupId, groupId), eq(guests.name, guest.name)));
			const orphan = candidates.find((row) => row.seedKey == null);
			if (orphan) {
				await db.update(guests).set({ seedKey: key }).where(eq(guests.id, orphan.id));
				existing = { ...orphan, seedKey: key };
			}
		}

		if (existing) {
			// Update seed-owned fields (the structural facts about the guest), but
			// preserve everything the guest themselves wrote: rsvpStatus, meal,
			// dietaryNotes, and — for plus-ones who've responded — the name and
			// relation they filled in.
			const isPending = existing.rsvpStatus === 'pending';
			const update: Partial<typeof guests.$inferInsert> = {
				groupId,
				side: guest.side,
				relationshipGroup: guest.relationshipGroup,
				role: guest.role ?? null,
				attendanceType: guest.attendanceType,
				isChild: guest.isChild ?? false,
				isPlusOne: guest.isPlusOne ?? false
			};
			if (isPending) {
				update.name = guest.name;
				update.relation = guest.relation ?? null;
			}
			await db.update(guests).set(update).where(eq(guests.id, existing.id));
		} else {
			await db.insert(guests).values({
				groupId,
				seedKey: key,
				name: guest.name,
				side: guest.side,
				relationshipGroup: guest.relationshipGroup,
				relation: guest.relation ?? null,
				role: guest.role ?? null,
				attendanceType: guest.attendanceType,
				isChild: guest.isChild ?? false,
				isPlusOne: guest.isPlusOne ?? false,
				meal: guest.meal ?? null,
				dietaryNotes: guest.dietaryNotes ?? null
			});
		}
	}

	// ---- Orphan cleanup: drop seeded rows that no longer exist in the source ----
	// Safe-by-default: skip if RSVP responses exist so we never silently lose data.

	const desiredGuestKeys = new Set(SEED_GUESTS.map((g) => guestSeedKey(g)));
	const allCurrentGuests = await db.select().from(guests);
	for (const og of allCurrentGuests) {
		if (og.seedKey == null) continue;
		if (desiredGuestKeys.has(og.seedKey)) continue;
		if (og.rsvpStatus !== 'pending') {
			console.warn(`Skipping orphan guest "${og.name}" — has responded.`);
			continue;
		}
		await db.delete(seatAssignments).where(eq(seatAssignments.guestId, og.id));
		await db.delete(guests).where(eq(guests.id, og.id));
	}

	const desiredGroupKeys = new Set(built.map((g) => g.key));
	const allCurrentGroups = await db.select().from(inviteGroups);
	for (const og of allCurrentGroups) {
		if (og.seedKey == null) continue;
		if (desiredGroupKeys.has(og.seedKey)) continue;
		if (og.respondedAt != null) {
			console.warn(`Skipping orphan group "${og.name}" — has responses.`);
			continue;
		}
		const remaining = await db.select().from(guests).where(eq(guests.groupId, og.id));
		for (const rg of remaining) {
			await db.delete(seatAssignments).where(eq(seatAssignments.guestId, rg.id));
			await db.delete(guests).where(eq(guests.id, rg.id));
		}
		await db.delete(inviteGroups).where(eq(inviteGroups.id, og.id));
	}

	// ---- Reference data: only seed when empty, so dashboard edits survive ----

	if ((await db.select().from(quoteLines).limit(1)).length === 0) {
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
	}

	if ((await db.select().from(vendors).limit(1)).length === 0) {
		for (const [i, v] of SEED_VENDORS.entries()) {
			await db.insert(vendors).values({
				category: v.category,
				name: v.name ?? null,
				contact: v.contact ?? null,
				stage: v.stage,
				depositPaid: v.depositPaid ?? false,
				sort: i
			});
		}
	}

	if ((await db.select().from(timelinePhases).limit(1)).length === 0) {
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
	}

	if ((await db.select().from(budgetLines).limit(1)).length === 0) {
		for (const [i, b] of SEED_BUDGET.entries()) {
			await db.insert(budgetLines).values({
				category: b.category,
				section: b.section,
				budgeted: b.budgeted,
				confirmed: b.confirmed,
				paid: b.paid,
				status: b.status,
				sort: i
			});
		}
	}

	if ((await db.select().from(stationeryItems).limit(1)).length === 0) {
		for (const [i, label] of SEED_STATIONERY.entries()) {
			await db.insert(stationeryItems).values({ label, done: false, sort: i });
		}
	}

	// Seating tables: default 7 round-of-10, only when none exist yet.
	if ((await db.select().from(seatingTables).limit(1)).length === 0) {
		for (const [i, t] of SEED_TABLES.entries()) {
			await db.insert(seatingTables).values({
				number: t.number,
				kind: t.kind,
				seats: t.seats,
				label: t.label ?? null,
				sort: i
			});
		}
	}

	// Notes: only seed the starter research notes when the table is empty, so the
	// couple's own notes (and their edits) are never overwritten on reseed.
	if ((await db.select().from(notes).limit(1)).length === 0) {
		const now = new Date();
		for (const [i, n] of SEED_NOTES.entries()) {
			await db.insert(notes).values({
				body: n.body,
				category: n.category,
				pinned: n.pinned ?? false,
				sort: i,
				createdAt: now,
				updatedAt: now
			});
		}
	}

	// Settings: upsert per key so missing entries are filled but existing values stay.
	for (const [key, value] of Object.entries(SEED_SETTINGS)) {
		const [existing] = await db.select().from(settings).where(eq(settings.key, key));
		if (!existing) await db.insert(settings).values({ key, value });
	}
}

function guestSeedKey(seed: SeedGuest): string {
	return `${seed.inviteGroup}/${slugify(seed.name)}`;
}

function slugify(s: string): string {
	return (
		s
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-') || 'x'
	);
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

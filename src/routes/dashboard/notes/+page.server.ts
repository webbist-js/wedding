import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { notes, vendors, inviteGroups, budgetLines, timelineItems } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { ENTITY_KINDS, type EntityType, isEntityType } from '$lib/notes';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(notes)
		.orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id));

	// Build id→label maps only for the entity kinds actually referenced, so a
	// note can show (and link back to) the thing it was flagged against.
	const needed = new Set(rows.map((r) => r.entityType).filter(isEntityType));
	const labels: Partial<Record<EntityType, Record<number, string>>> = {};

	if (needed.has('vendor')) {
		const s = await db.select({ id: vendors.id, category: vendors.category, name: vendors.name }).from(vendors);
		labels.vendor = Object.fromEntries(
			s.map((r) => [r.id, r.name ? `${r.category} · ${r.name}` : r.category])
		);
	}
	if (needed.has('guest_group')) {
		const g = await db.select({ id: inviteGroups.id, name: inviteGroups.name }).from(inviteGroups);
		labels.guest_group = Object.fromEntries(g.map((r) => [r.id, r.name]));
	}
	if (needed.has('budget')) {
		const b = await db.select({ id: budgetLines.id, category: budgetLines.category }).from(budgetLines);
		labels.budget = Object.fromEntries(b.map((r) => [r.id, r.category]));
	}
	if (needed.has('timeline')) {
		const t = await db.select({ id: timelineItems.id, label: timelineItems.label }).from(timelineItems);
		labels.timeline = Object.fromEntries(t.map((r) => [r.id, r.label]));
	}

	const enriched = rows.map((r) => {
		let contextLabel: string | null = null;
		let contextHref: string | null = null;
		if (isEntityType(r.entityType)) {
			const kind = ENTITY_KINDS[r.entityType];
			contextHref = kind.href;
			if (r.entityId != null && labels[r.entityType]?.[r.entityId]) {
				contextLabel = labels[r.entityType]![r.entityId];
			} else {
				contextLabel = kind.label;
			}
		}
		return { ...r, contextLabel, contextHref };
	});

	return { notes: enriched };
};

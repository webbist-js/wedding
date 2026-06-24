// Shared, client-safe notes vocabulary used by the Notes hub, the reusable
// <Notes> widget and the edit endpoint. No server-only imports here.

export const NOTE_CATEGORIES = [
	'General',
	'Venue',
	'Budget',
	'Guests',
	'Seating',
	'Suppliers',
	'Calendar',
	'Timeline',
	'Invites',
	'Stationery'
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export function isNoteCategory(v: unknown): v is NoteCategory {
	return typeof v === 'string' && (NOTE_CATEGORIES as readonly string[]).includes(v);
}

// Entity kinds a note can cross-link to. `category` is the Notes-hub section a
// linked note files under; `section`/`href` give the deep link back to where it
// was flagged. Add a new entry here to make another dashboard page link-able.
export interface EntityKind {
	label: string;
	category: NoteCategory;
	href: string;
}

export const ENTITY_KINDS = {
	supplier: { label: 'Supplier', category: 'Suppliers', href: '/dashboard/suppliers' },
	budget: { label: 'Budget line', category: 'Budget', href: '/dashboard/budget' },
	guest_group: { label: 'Household', category: 'Guests', href: '/dashboard/guests' },
	timeline: { label: 'Timeline task', category: 'Timeline', href: '/dashboard/timeline' },
	venue: { label: 'Venue', category: 'Venue', href: '/dashboard/venue' }
} as const satisfies Record<string, EntityKind>;

export type EntityType = keyof typeof ENTITY_KINDS;

export function isEntityType(v: unknown): v is EntityType {
	return typeof v === 'string' && v in ENTITY_KINDS;
}

// The category a note should be filed under, derived from its entity link when
// present (so a supplier note always lands under "Suppliers").
export function categoryForEntity(entityType: string | null | undefined): NoteCategory | null {
	if (entityType && isEntityType(entityType)) return ENTITY_KINDS[entityType].category;
	return null;
}

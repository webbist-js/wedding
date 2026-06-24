// Shared, client-safe seating vocabulary used by the seating page and its server.

// Table arrangements. `seats` is the default capacity when the kind is chosen
// (still editable per table); `shape` drives the little layout glyph in the UI.
export const TABLE_KINDS = {
	round: { label: 'Round (individual)', seats: 10, shape: 'round' },
	long: { label: 'Long banquet', seats: 12, shape: 'long' },
	square: { label: 'Square', seats: 8, shape: 'square' },
	oval: { label: 'Oval', seats: 10, shape: 'oval' },
	sweetheart: { label: 'Sweetheart (just the two)', seats: 2, shape: 'sweetheart' },
	head: { label: 'Head / top table', seats: 8, shape: 'long' }
} as const;

export type TableKind = keyof typeof TABLE_KINDS;

export function isTableKind(v: unknown): v is TableKind {
	return typeof v === 'string' && v in TABLE_KINDS;
}

export function kindLabel(kind: string): string {
	return isTableKind(kind) ? TABLE_KINDS[kind].label : kind;
}

export function kindShape(kind: string): string {
	return isTableKind(kind) ? TABLE_KINDS[kind].shape : 'round';
}

// The couple themselves — seatable like guests, but they live outside the guest
// list. Their table is stored in the `seatBride` / `seatGroom` settings keys.
export const COUPLE = [
	{ key: 'bride', name: 'Katie', side: 'B' as const, settingKey: 'seatBride' as const },
	{ key: 'groom', name: 'Alex', side: 'G' as const, settingKey: 'seatGroom' as const }
] as const;

export type CoupleKey = (typeof COUPLE)[number]['key'];

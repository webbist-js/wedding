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

// Seat coordinates (centre %, within a table's box) for n seats of a shape.
export function seatPositions(shape: string, n: number): { x: number; y: number }[] {
	const pos: { x: number; y: number }[] = [];
	const spread = (i: number, count: number) => (count <= 1 ? 50 : 11 + (i * 78) / (count - 1));
	if (shape === 'long') {
		const top = Math.ceil(n / 2);
		for (let i = 0; i < top; i++) pos.push({ x: spread(i, top), y: 14 });
		for (let i = 0; i < n - top; i++) pos.push({ x: spread(i, n - top), y: 86 });
		return pos;
	}
	if (shape === 'sweetheart') {
		for (let i = 0; i < n; i++) pos.push({ x: n === 1 ? 50 : spread(i, n), y: 52 });
		return pos;
	}
	const rx = shape === 'oval' ? 45 : 40;
	const ry = shape === 'oval' ? 30 : 40;
	for (let i = 0; i < n; i++) {
		const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
		pos.push({ x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) });
	}
	return pos;
}

export function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.slice(0, 2)
		.join('');
}

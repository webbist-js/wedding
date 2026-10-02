// Pure reporting over the guest list: per-household summaries for the table
// (side, who's invited to what, RSVP progress, contact routes, sub-line) and
// the page-level report (RSVP totals, headline stats, needs-attention counts).
// No DB access — tested in tests/guest-report.test.ts.

export interface ReportMember {
	name: string;
	side: 'G' | 'B' | 'X';
	relationshipGroup: string;
	attendanceType: 'day' | 'evening';
	isChild: boolean;
	isPlusOne: boolean;
	rsvpStatus: 'pending' | 'yes' | 'no';
}

export interface ReportHousehold {
	id: number;
	name: string;
	address: string | null;
	email: string | null;
	phone: string | null;
	inviteSentAt: string | null;
	members: ReportMember[];
}

export type HouseholdStatus = 'awaiting' | 'replied' | 'declined';

export interface HouseholdSummary {
	side: 'B' | 'G' | 'X'; // X = mixed / both sides
	invited: { day: number; eve: number };
	rsvp: {
		label: string;
		status: HouseholdStatus;
		dots: ('yes' | 'no' | 'pending')[];
		yes: number;
		no: number;
		pending: number;
	};
	contact: { post: boolean; email: boolean; tel: boolean };
	subline: string;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

export function householdSummary(h: ReportHousehold): HouseholdSummary {
	const ms = h.members;
	const n = ms.length;

	const sides = new Set(ms.map((m) => m.side).filter((s) => s !== 'X'));
	const side: 'B' | 'G' | 'X' = sides.size === 1 ? ([...sides][0] as 'B' | 'G') : 'X';

	const yes = ms.filter((m) => m.rsvpStatus === 'yes').length;
	const no = ms.filter((m) => m.rsvpStatus === 'no').length;
	const pending = n - yes - no;
	let label: string;
	let status: HouseholdStatus;
	if (n === 0) {
		label = 'No guests';
		status = 'awaiting';
	} else if (pending === n) {
		label = 'Awaiting';
		status = 'awaiting';
	} else if (pending > 0) {
		label = `${n - pending} of ${n}`;
		status = 'awaiting';
	} else if (yes === n) {
		label = 'Attending';
		status = 'replied';
	} else if (no === n) {
		label = 'Declined';
		status = 'declined';
	} else {
		label = `${yes} attending`;
		status = 'replied';
	}

	// Sub-line: the household's relationship group, then (for more than one
	// guest) first names of the named guests, children and plus-one slots.
	const groupCounts = new Map<string, number>();
	for (const m of ms) groupCounts.set(m.relationshipGroup, (groupCounts.get(m.relationshipGroup) ?? 0) + 1);
	const group = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
	const parts: string[] = [];
	if (group) parts.push(group);
	if (n > 1) {
		const named = ms.filter((m) => !m.isPlusOne).map((m) => firstName(m.name));
		if (named.length) parts.push(named.join(', '));
		const kids = ms.filter((m) => m.isChild).length;
		if (kids) parts.push(`${kids} ${kids === 1 ? 'child' : 'children'}`);
	}
	const plusOnes = ms.filter((m) => m.isPlusOne).length;
	if (plusOnes) parts.push(`+${plusOnes}`);

	return {
		side,
		invited: {
			day: ms.filter((m) => m.attendanceType === 'day').length,
			eve: ms.filter((m) => m.attendanceType === 'evening').length
		},
		rsvp: { label, status, dots: ms.map((m) => m.rsvpStatus), yes, no, pending },
		contact: { post: !!h.address?.trim(), email: !!h.email?.trim(), tel: !!h.phone?.trim() },
		subline: parts.join(' · ')
	};
}

export interface GuestReport {
	rsvp: { yes: number; no: number; pending: number; total: number; replied: number };
	stats: {
		guests: number;
		day: number;
		evening: number;
		households: number;
		children: number;
		plusOnes: number;
		bride: number;
		groom: number;
	};
	attention: { noAddress: number; noContact: number; inviteNotSent: number };
}

export function guestReport(households: ReportHousehold[]): GuestReport {
	const all = households.flatMap((h) => h.members);
	const yes = all.filter((m) => m.rsvpStatus === 'yes').length;
	const no = all.filter((m) => m.rsvpStatus === 'no').length;
	return {
		rsvp: { yes, no, pending: all.length - yes - no, total: all.length, replied: yes + no },
		stats: {
			guests: all.length,
			day: all.filter((m) => m.attendanceType === 'day').length,
			evening: all.filter((m) => m.attendanceType === 'evening').length,
			households: households.length,
			children: all.filter((m) => m.isChild).length,
			plusOnes: all.filter((m) => m.isPlusOne).length,
			bride: all.filter((m) => m.side === 'B').length,
			groom: all.filter((m) => m.side === 'G').length
		},
		attention: {
			noAddress: households.filter((h) => !h.address?.trim()).length,
			noContact: households.filter((h) => !h.email?.trim() && !h.phone?.trim()).length,
			inviteNotSent: households.filter((h) => !h.inviteSentAt).length
		}
	};
}

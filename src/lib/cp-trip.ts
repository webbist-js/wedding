// The Stendo Vol. 03: we booked Center Parcs Whinfell Forest (/stendo).
//
// Booking facts, who sleeps where, and every bit of money maths. Pure and
// deterministic so it runs on the server and in the browser, and so the tests
// can pin every figure. All money is integer pence. Persistence lives in
// $lib/server/cp-trip.ts.
//
// Three money concepts, kept apart on purpose:
//   original: the confirmed baseline below (what everyone owes today);
//   proposed: what the Fancy House Tax calculator shows (never stored as owed);
//   agreed:   a redistribution every affected group signed up to and Alex
//             published. Only agreed figures ever reach the payment tracker.

// ---------------------------------------------------------------- booking ---

export const BOOKING = {
	village: 'Whinfell Forest',
	place: 'Penrith, Cumbria',
	arrive: '2027-03-19',
	depart: '2027-03-22',
	nights: 3,
	totalPence: 355_700,
	deadline: '2027-01-08',
	// March and January are both GMT in the UK, so UTC is UK time here.
	arriveAt: Date.UTC(2027, 2, 19, 0, 0, 0),
	deadlineEndsAt: Date.UTC(2027, 0, 8, 23, 59, 59)
} as const;

/** Where everyone sends their share: Alex's account. */
export const BANK = { sortCode: '11-73-40', account: '10908769' } as const;

// ----------------------------------------------------------------- people ---

export type HouseId = 'h1' | 'h2' | 'h3';
export type GroupId = 'kie-elisa' | 'alex-katie' | 'oliver-phoebe' | 'mule' | 'chris-jenn' | 'adam-lysanne' | 'chris-hayley';
export type ContributorId = 'chris-jenn' | 'adam-lysanne' | 'oliver-phoebe';

export type Group = {
	id: GroupId;
	label: string;
	house: HouseId;
	adults: number;
	kids?: string[];
	/** True when this group sleeps in a twin room (two singles that push together). */
	twin?: boolean;
	/** Paid Center Parcs for the whole booking up front, so their own share is settled. */
	paidUpfront?: boolean;
};

export const GROUPS: Group[] = [
	{ id: 'kie-elisa', label: 'Kie & Elisa', house: 'h1', adults: 2 },
	{ id: 'alex-katie', label: 'Alex & Katie', house: 'h1', adults: 2, paidUpfront: true },
	{ id: 'mule', label: 'Mule', house: 'h1', adults: 1, twin: true },
	{ id: 'chris-jenn', label: 'Chris & Jenn', house: 'h2', adults: 2 },
	{ id: 'adam-lysanne', label: 'Adam & Lysanne', house: 'h2', adults: 2, twin: true },
	{ id: 'chris-hayley', label: 'Chris & Hayley & Theo', house: 'h3', adults: 2, kids: ['Theo'] },
	{ id: 'oliver-phoebe', label: 'Oliver & Phoebe', house: 'h3', adults: 2, twin: true }
];

export const group = (id: GroupId) => GROUPS.find((g) => g.id === id)!;
export const isGroupId = (v: unknown): v is GroupId => GROUPS.some((g) => g.id === v);

/** Individuals, for the activity poll. There are two Chrises, so each carries their other half. */
export type Person = { id: string; name: string; tag: string; group: GroupId };
export const PEOPLE: Person[] = [
	{ id: 'kie', name: 'Kie', tag: 'Kie', group: 'kie-elisa' },
	{ id: 'elisa', name: 'Elisa', tag: 'Elisa', group: 'kie-elisa' },
	{ id: 'alex', name: 'Alex', tag: 'Alex', group: 'alex-katie' },
	{ id: 'katie', name: 'Katie', tag: 'Katie', group: 'alex-katie' },
	{ id: 'oliver', name: 'Oliver', tag: 'Oli', group: 'oliver-phoebe' },
	{ id: 'phoebe', name: 'Phoebe', tag: 'Phoebe', group: 'oliver-phoebe' },
	{ id: 'mule', name: 'Mule', tag: 'Mule', group: 'mule' },
	{ id: 'chris-j', name: 'Chris', tag: 'Chris (Jenn’s)', group: 'chris-jenn' },
	{ id: 'jenn', name: 'Jenn', tag: 'Jenn', group: 'chris-jenn' },
	{ id: 'adam', name: 'Adam', tag: 'Adam', group: 'adam-lysanne' },
	{ id: 'lysanne', name: 'Lysanne', tag: 'Lysanne', group: 'adam-lysanne' },
	{ id: 'chris-h', name: 'Chris', tag: 'Chris (Hayley’s)', group: 'chris-hayley' },
	{ id: 'hayley', name: 'Hayley', tag: 'Hayley', group: 'chris-hayley' }
];
export const person = (id: string) => PEOPLE.find((p) => p.id === id);
export const ADULTS = GROUPS.reduce((n, g) => n + g.adults, 0); // 13
export const KIDS = GROUPS.flatMap((g) => g.kids ?? []); // ['Theo']

// ----------------------------------------------------------------- houses ---

export type House = {
	id: HouseId;
	number: number;
	nickname: string;
	costPence: number; // what the lodge cost on the booking
	accommodationPence: number; // the part split between occupants
	amenities: string[];
	blurb: string;
	note?: string;
};

export const HOUSES: House[] = [
	{
		id: 'h1',
		number: 1,
		nickname: 'The Big Fancy One',
		costPence: 224_900,
		accommodationPence: 217_000,
		amenities: ['Hot tub', 'Sauna', 'Games room'],
		blurb: 'The main social hub. Everyone is welcome here, all weekend, wherever you’re sleeping.'
	},
	{
		id: 'h2',
		number: 2,
		nickname: 'The Sensible One',
		costPence: 65_900,
		accommodationPence: 65_900,
		amenities: [],
		blurb: 'Picked to keep the weekend affordable. No hot tub of its own, but the one at House 1 is everyone’s.'
	},
	{
		id: 'h3',
		number: 3,
		nickname: 'The Family One',
		costPence: 64_900,
		accommodationPence: 64_900,
		amenities: [],
		blurb: 'Chris, Hayley and Theo’s family base, shared with Oli & Phoebe. Room for Theo’s naps and early nights.',
		note: 'Oli & Phoebe take the twin room, so Theo sleeps in a travel cot with Chris & Hayley.'
	}
];
export const house = (id: HouseId) => HOUSES.find((h) => h.id === id)!;
export const groupsIn = (id: HouseId) => GROUPS.filter((g) => g.house === id);
export const HOUSE1_ADULTS = groupsIn('h1').reduce((n, g) => n + g.adults, 0); // 7

/** Paid on the House 1 booking for Alex & Katie alone. Never shared. */
export const EXTRAS = [
	{ label: 'Gym pass', pence: 1_500, group: 'alex-katie' as GroupId },
	{ label: 'Bike hire', pence: 6_400, group: 'alex-katie' as GroupId }
];

/** Alex & Katie's private gifts towards three bookings. Fixed; never redistributed. */
export const GIFTS: { from: GroupId; to: GroupId; pence: number }[] = [
	{ from: 'alex-katie', to: 'chris-jenn', pence: 10_000 },
	{ from: 'alex-katie', to: 'adam-lysanne', pence: 10_000 }
];

/**
 * House 1 was booked for seven adults at £310 a head. Oli & Phoebe have since
 * moved to House 3, and Alex & Katie take on their two empty places.
 */
export const HOUSE1_PER_HEAD = 31_000;
export const HOUSE1_ABSORBER: GroupId = 'alex-katie';

/**
 * On top of that, Kie & Elisa pay a round £550 and Mule £300; Alex & Katie
 * pick up the difference as the Big House Tax. Each entry is how far below
 * the £310 a head that group sits.
 */
export const BIG_HOUSE_TAX_PAYER: GroupId = 'alex-katie';
export const BIG_HOUSE_TAX: { group: GroupId; pence: number }[] = [
	{ group: 'kie-elisa', pence: 7_000 },
	{ group: 'mule', pence: 1_000 }
];
export const BIG_HOUSE_TAX_TOTAL = BIG_HOUSE_TAX.reduce((s, x) => s + x.pence, 0);
const bigHouseTaxFor = (id: GroupId) =>
	id === BIG_HOUSE_TAX_PAYER ? BIG_HOUSE_TAX_TOTAL : 0 - (BIG_HOUSE_TAX.find((x) => x.group === id)?.pence ?? 0) || 0;

// ------------------------------------------------------------------ money ---

/**
 * Split `total` pence across `weights` with the largest-remainder method.
 * Floors every share, then hands the leftover pennies, one each, to the
 * largest fractional parts. Ties go to the earlier entry, so the result is
 * the same every time.
 */
export function allocate(total: number, weights: number[]): { shares: number[]; extraPenny: boolean[] } {
	const sum = weights.reduce((a, b) => a + b, 0);
	if (!sum) return { shares: weights.map(() => 0), extraPenny: weights.map(() => false) };
	const exact = weights.map((w) => (total * w) / sum);
	const shares = exact.map(Math.floor);
	let left = total - shares.reduce((a, b) => a + b, 0);
	const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
	const extraPenny = weights.map(() => false);
	for (const { i } of order) {
		if (left <= 0) break;
		shares[i] += 1;
		extraPenny[i] = true;
		left -= 1;
	}
	return { shares, extraPenny };
}

export type Line = {
	group: GroupId;
	accommodation: number; // their share of their own lodge (House 1: £310 a head)
	absorbed: number; // + House 1's empty places (Alex & Katie only)
	bigHouseTax: number; // + Alex & Katie's top-up, − what it saves the others
	extras: number; // gym + bikes (Alex & Katie only)
	giftsGiven: number; // + paid on others' behalf
	giftsReceived: number; // − covered by Alex & Katie
	contribution: number; // + voluntary Fancy House Tax paid
	relief: number; // − Fancy House Tax received
	total: number;
};

export type Contributions = Record<ContributorId, number>;
/** Who can chip in: both House 2 couples, and Oli & Phoebe now they've moved out of House 1. */
export const NO_CONTRIBUTIONS: Contributions = { 'chris-jenn': 0, 'adam-lysanne': 0, 'oliver-phoebe': 0 };
export const CONTRIBUTORS: ContributorId[] = ['chris-jenn', 'adam-lysanne', 'oliver-phoebe'];
export const HOUSE1_GROUPS = groupsIn('h1').map((g) => g.id);
/**
 * Where the Fancy House Tax goes: 60% to Alex & Katie (who carry Oli & Phoebe's
 * empty places and the Big House Tax) and 40% to Kie & Elisa. Mule's reduced
 * £300 doesn't move. These two are also the groups who need to approve.
 */
export const RELIEF_SPLIT: { group: GroupId; percent: number }[] = [
	{ group: 'alex-katie', percent: 60 },
	{ group: 'kie-elisa', percent: 40 }
];
export const RELIEF_GROUPS: GroupId[] = RELIEF_SPLIT.map((r) => r.group);
/** How a sum chipped in splits between the House 1 couples, to the penny. */
export function splitSaving(pence: number): { group: GroupId; pence: number }[] {
	const { shares } = allocate(pence, RELIEF_SPLIT.map((r) => r.percent));
	return RELIEF_SPLIT.map((r, i) => ({ group: r.group, pence: shares[i] }));
}
export const isContributor = (id: unknown): id is ContributorId => CONTRIBUTORS.includes(id as ContributorId);
export const isHouse1 = (id: unknown): boolean => HOUSE1_GROUPS.includes(id as GroupId);
export const isReliefGroup = (id: unknown): boolean => RELIEF_GROUPS.includes(id as GroupId);

export const STEP_PENCE = 500; // calculator steps in £5
export const MAX_CONTRIBUTION_PENCE = 25_000; // £250 per couple: even three maxed-out offers keep every House 1 share above £0

export class ContributionError extends Error {}

/** Throws unless `pence` is a whole number of pence from £0 to the cap. */
export function assertContribution(pence: unknown): number {
	if (typeof pence !== 'number' || !Number.isSafeInteger(pence)) throw new ContributionError('Contribution must be a whole number of pence');
	if (pence < 0) throw new ContributionError('Contributions can’t be negative');
	if (pence > MAX_CONTRIBUTION_PENCE) throw new ContributionError(`Contributions are capped at ${gbp(MAX_CONTRIBUTION_PENCE)} per couple`);
	return pence;
}

/** "12.5", "£12.50", "12" → pence. Null for anything that isn't a sane non-negative amount. */
export function poundsToPence(input: string): number | null {
	const s = input.trim().replace(/^£/, '').replace(/,/g, '');
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
	const [whole, frac = ''] = s.split('.');
	const pence = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
	return Number.isSafeInteger(pence) ? pence : null;
}

export type Breakdown = {
	lines: Line[];
	total: number;
	contributions: Contributions;
	pot: number; // total voluntary contribution
	/** Groups that took one extra penny of relief so the split adds up exactly. */
	rounding: GroupId[];
};

/**
 * Everyone's balance for a given pair of voluntary House 2 contributions.
 * With no contributions this is the confirmed baseline.
 */
export function breakdown(contributions: Contributions = NO_CONTRIBUTIONS): Breakdown {
	const c = Object.fromEntries(CONTRIBUTORS.map((id) => [id, assertContribution(contributions[id])])) as Contributions;
	const pot = CONTRIBUTORS.reduce((n, id) => n + c[id], 0);

	const accommodation = new Map<GroupId, number>();
	const absorbed = new Map<GroupId, number>();
	for (const h of HOUSES) {
		const occ = groupsIn(h.id);
		if (h.id === 'h1') {
			// £310 a head for whoever's in it; the empty places fall to Alex & Katie.
			for (const g of occ) accommodation.set(g.id, g.adults * HOUSE1_PER_HEAD);
			absorbed.set(HOUSE1_ABSORBER, h.accommodationPence - occ.reduce((n, g) => n + g.adults * HOUSE1_PER_HEAD, 0));
		} else {
			const { shares } = allocate(h.accommodationPence, occ.map((g) => g.adults));
			occ.forEach((g, i) => accommodation.set(g.id, shares[i]));
		}
	}

	const reliefAlloc = allocate(pot, RELIEF_SPLIT.map((r) => r.percent));
	const relief = new Map(RELIEF_GROUPS.map((id, i) => [id, reliefAlloc.shares[i]]));
	const rounding = RELIEF_GROUPS.filter((_, i) => reliefAlloc.extraPenny[i]);

	const lines: Line[] = GROUPS.map((g) => {
		const acc = accommodation.get(g.id)!;
		const abs = absorbed.get(g.id) ?? 0;
		const r = relief.get(g.id) ?? 0;
		const bht = bigHouseTaxFor(g.id);
		if (acc + bht - r < 0) throw new ContributionError(`${g.label}’s share of House 1 can’t go below £0`);
		const extras = EXTRAS.filter((e) => e.group === g.id).reduce((s, e) => s + e.pence, 0);
		const giftsGiven = GIFTS.filter((x) => x.from === g.id).reduce((s, x) => s + x.pence, 0);
		const giftsReceived = GIFTS.filter((x) => x.to === g.id).reduce((s, x) => s + x.pence, 0);
		const contribution = isContributor(g.id) ? c[g.id] : 0;
		return {
			group: g.id,
			accommodation: acc,
			absorbed: abs,
			bigHouseTax: bht,
			extras,
			giftsGiven,
			giftsReceived,
			contribution,
			relief: r,
			total: acc + abs + bht + extras + giftsGiven - giftsReceived + contribution - r
		};
	});
	const total = lines.reduce((s, l) => s + l.total, 0);
	if (total !== BOOKING.totalPence) throw new Error(`Balances add up to ${total}p, not ${BOOKING.totalPence}p`);
	return { lines, total, contributions: c, pot, rounding };
}

export const ORIGINAL = breakdown();
export const lineFor = (b: Breakdown, id: GroupId) => b.lines.find((l) => l.group === id)!;

/** Proposed minus original, per group. Positive means they'd pay more. */
export function deltas(proposed: Breakdown, base: Breakdown = ORIGINAL): Record<GroupId, number> {
	return Object.fromEntries(GROUPS.map((g) => [g.id, lineFor(proposed, g.id).total - lineFor(base, g.id).total])) as Record<GroupId, number>;
}

// -------------------------------------------------------------- consensus ---

/**
 * One row per paying group. House 2 couples record their own pledge (and only
 * their own: nobody can pledge on someone else's behalf). The couples who'd get
 * the savings (RELIEF_GROUPS) record which pair of amounts they approved.
 * Everyone else's share never moves, so they don't take part.
 */
export type Consent = {
	group: GroupId;
	pledge: number | null; // House 2 only
	approved: Contributions | null; // RELIEF_GROUPS only: the exact amounts they said yes to
	updatedAt: string | null;
};

export type Agreement = {
	version: number;
	contributions: Contributions;
	publishedAt: string;
};

export const BASELINE_AGREEMENT: Agreement = { version: 0, contributions: NO_CONTRIBUTIONS, publishedAt: '2026-11-10T00:00:00.000Z' };

export const sameContributions = (a: Contributions | null | undefined, b: Contributions | null | undefined) =>
	!!a && !!b && CONTRIBUTORS.every((id) => a[id] === b[id]);

export type ApprovalState = 'approved' | 'waiting' | 'outdated';

export type ProposalStatus = {
	/** The amounts on the table, once every chipping-in couple has answered. */
	proposal: Contributions | null;
	pledges: Record<ContributorId, number | null>;
	approvals: Record<GroupId, ApprovalState>;
	/** Everyone affected has said yes to exactly these amounts. */
	ready: boolean;
	/** The proposal matches what's already agreed: nothing to publish. */
	matchesAgreed: boolean;
	waitingOn: GroupId[];
};

export function proposalStatus(consents: Consent[], agreed: Agreement): ProposalStatus {
	const byGroup = new Map(consents.map((c) => [c.group, c]));
	const pledges = Object.fromEntries(CONTRIBUTORS.map((id) => [id, byGroup.get(id)?.pledge ?? null])) as Record<ContributorId, number | null>;
	const proposal = CONTRIBUTORS.every((id) => pledges[id] !== null) ? (pledges as Contributions) : null;
	const approvals = Object.fromEntries(
		RELIEF_GROUPS.map((id) => {
			const a = byGroup.get(id)?.approved ?? null;
			return [id, !a ? 'waiting' : proposal && sameContributions(a, proposal) ? 'approved' : 'outdated'];
		})
	) as Record<GroupId, ApprovalState>;
	const waitingOn = [
		...CONTRIBUTORS.filter((id) => pledges[id] === null),
		...RELIEF_GROUPS.filter((id) => approvals[id] !== 'approved')
	];
	const matchesAgreed = !!proposal && sameContributions(proposal, agreed.contributions);
	return { proposal, pledges, approvals, ready: !!proposal && waitingOn.length === 0, matchesAgreed, waitingOn };
}

/**
 * The only way a proposal becomes owed money. Refuses unless every House 2
 * chipping-in couple pledged and Alex & Katie and Kie & Elisa approved those exact amounts.
 */
export function publishAgreement(consents: Consent[], current: Agreement, now: Date): Agreement {
	const s = proposalStatus(consents, current);
	if (!s.proposal || !s.ready) throw new Error('Not everyone has agreed to this proposal yet');
	if (s.matchesAgreed) throw new Error('This is already the agreed split');
	breakdown(s.proposal); // validates
	return { version: current.version + 1, contributions: s.proposal, publishedAt: now.toISOString() };
}

export const currentAgreement = (agreements: Agreement[]) =>
	agreements.reduce<Agreement>((latest, a) => (a.version > latest.version ? a : latest), BASELINE_AGREEMENT);

// --------------------------------------------------------------- payments ---

export type Payment = { id: number; group: GroupId; pence: number; receivedOn: string; note: string; createdAt: string };
export type PayStatus = 'not-paid' | 'partial' | 'paid' | 'overpaid';

export type Account = {
	group: GroupId;
	owed: number;
	paid: number;
	outstanding: number; // never negative
	refundDue: number; // paid more than owed (e.g. after an agreed reduction)
	status: PayStatus;
	/** Paid the booking up front: settled whatever the agreed split says. */
	upfront: boolean;
	overdue: boolean;
	payments: Payment[];
	/** How this group's agreed amount moved over time, oldest first. */
	history: { version: number; owed: number; at: string }[];
};

export type Ledger = { accounts: Account[]; owed: number; collected: number; outstanding: number; refunds: number; overdue: boolean };

/** Is the payment deadline behind us? */
export const pastDeadline = (now: number) => now > BOOKING.deadlineEndsAt;

/**
 * Balances against the agreed split only. Payments are an append-only list:
 * a new agreement changes what's owed, never what was received.
 */
export function ledger(agreements: Agreement[], payments: Payment[], now: number): Ledger {
	const versions = [BASELINE_AGREEMENT, ...agreements.filter((a) => a.version > 0)].sort((a, b) => a.version - b.version);
	const current = versions[versions.length - 1];
	const b = breakdown(current.contributions);
	const late = pastDeadline(now);
	const accounts = GROUPS.map((g) => {
		const owed = lineFor(b, g.id).total;
		const mine = payments.filter((p) => p.group === g.id);
		const upfront = !!g.paidUpfront;
		const paid = (upfront ? owed : 0) + mine.reduce((s, p) => s + p.pence, 0);
		const outstanding = Math.max(0, owed - paid);
		const refundDue = Math.max(0, paid - owed);
		const status: PayStatus = paid <= 0 ? 'not-paid' : paid < owed ? 'partial' : paid === owed ? 'paid' : 'overpaid';
		const history: Account['history'] = [];
		for (const v of versions) {
			const amount = lineFor(breakdown(v.contributions), g.id).total;
			if (!history.length || history[history.length - 1].owed !== amount) history.push({ version: v.version, owed: amount, at: v.publishedAt });
		}
		return { group: g.id, owed, paid, outstanding, refundDue, status, upfront, overdue: late && outstanding > 0, payments: mine, history };
	});
	return {
		accounts,
		owed: accounts.reduce((s, a) => s + a.owed, 0),
		collected: accounts.reduce((s, a) => s + a.paid, 0),
		outstanding: accounts.reduce((s, a) => s + a.outstanding, 0),
		refunds: accounts.reduce((s, a) => s + a.refundDue, 0),
		overdue: accounts.some((a) => a.overdue)
	};
}

/** Admin payment entry. Negative amounts are corrections or refunds. */
export function validatePayment(input: { group: unknown; pence: unknown; receivedOn: unknown; note?: unknown }) {
	if (!isGroupId(input.group)) throw new Error('Unknown group');
	const pence = input.pence;
	if (typeof pence !== 'number' || !Number.isSafeInteger(pence) || pence === 0 || Math.abs(pence) > BOOKING.totalPence)
		throw new Error('Amount must be a non-zero number of pence');
	const receivedOn = typeof input.receivedOn === 'string' ? input.receivedOn : '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn) || Number.isNaN(Date.parse(receivedOn))) throw new Error('Date must be YYYY-MM-DD');
	const note = typeof input.note === 'string' ? input.note.trim().slice(0, 200) : '';
	return { group: input.group, pence, receivedOn, note };
}

// ------------------------------------------------------------- formatting ---

const fmt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWhole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** 108900 → "£1,089.00" */
export const gbp = (pence: number) => `${pence < 0 ? '−' : ''}£${fmt.format(Math.abs(pence) / 100)}`;
/** Drops ".00" for round pounds: 50000 → "£500", 29571 → "£295.71". */
export const gbpShort = (pence: number) =>
	pence % 100 === 0 ? `${pence < 0 ? '−' : ''}£${fmtWhole.format(Math.abs(pence) / 100)}` : gbp(pence);
/** +£50.00 / −£28.57 / £0.00 */
export const signed = (pence: number) => (pence > 0 ? `+${gbp(pence)}` : pence < 0 ? gbp(pence) : gbp(0));

// ------------------------------------------------------------- countdowns ---

export type Countdown = { past: boolean; days: number; hours: number; minutes: number; seconds: number };
export function countdown(target: number, now: number): Countdown {
	const ms = target - now;
	const past = ms <= 0;
	const t = Math.max(0, Math.floor(ms / 1000));
	return { past, days: Math.floor(t / 86_400), hours: Math.floor((t % 86_400) / 3_600), minutes: Math.floor((t % 3_600) / 60), seconds: t % 60 };
}
/** Whole calendar days until a UK date (negative once it's gone). */
export function daysUntil(isoDate: string, now: number) {
	const [y, m, d] = isoDate.split('-').map(Number);
	const today = new Date(now);
	const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	return Math.round((Date.UTC(y, m - 1, d) - startOfToday) / 86_400_000);
}

// ------------------------------------------------------------- share text ---

/** Group-chat text for a "what if". Pass `only` to include just that group's row. */
export function proposalSummary(c: Contributions, only?: GroupId): string {
	const b = breakdown(c);
	const d = deltas(b);
	const rows = GROUPS.filter((g) => !only || g.id === only).map((g) => `${g.label}: ${gbp(lineFor(ORIGINAL, g.id).total)} → ${gbp(lineFor(b, g.id).total)} (${signed(d[g.id])})`);
	const split = splitSaving(b.pot).map((x) => `${group(x.group).label} save ${gbp(x.pence)}`).join(', ');
	return [
		'Center Parcs: Fancy House Tax idea (hypothetical, nothing agreed yet)',
		CONTRIBUTORS.filter((id) => c[id] > 0).map((id) => `${group(id).label} chip in ${gbp(c[id])}`).join(', ') + '.',
		`House 1 saves ${gbp(b.pot)}: ${split}.`,
		'',
		...rows,
		...(only ? [] : ['', `Total still ${gbp(b.total)}.`])
	].join('\n');
}

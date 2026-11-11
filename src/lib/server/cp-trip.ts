// Persistence for the booked Center Parcs trip (/stendo). The rules live in
// $lib/cp-trip.ts; this file only reads and writes rows.
//
// Identity is the same trust system as the rest of the Stendo pages: no
// passwords, you pick your own group. Every pledge and approval is stored
// against a group with a timestamp, and nothing becomes owed until Alex
// (a signed-in dashboard user) publishes a proposal everyone said yes to.

import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { cpTripAgreements, cpTripConsents, cpTripInterest, cpTripNotes, cpTripPayments } from '$lib/server/db/schema';
import {
	assertContribution, currentAgreement, isContributor, isGroupId, isReliefGroup, ledger, person, proposalStatus, publishAgreement,
	sameContributions, validatePayment, type Agreement, type Consent, type Contributions, type GroupId, type Payment
} from '$lib/cp-trip';
import { ACTIVITY_IDS } from '$lib/cp-whinfell';

export const NOTE_KEYS = ['payment', 'arrival', 'parking', 'lodges', 'shopping', 'plans'] as const;
export type NoteKey = (typeof NOTE_KEYS)[number];

async function consents(): Promise<Consent[]> {
	const rows = await db.select().from(cpTripConsents);
	return rows
		.filter((r) => isGroupId(r.groupId))
		.map((r) => ({
			group: r.groupId as GroupId,
			pledge: isContributor(r.groupId) ? r.pledgePence : null,
			approved: isReliefGroup(r.groupId) && r.approvedCj !== null && r.approvedAl !== null && r.approvedOp !== null ? { 'chris-jenn': r.approvedCj, 'adam-lysanne': r.approvedAl, 'oliver-phoebe': r.approvedOp } : null,
			updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null
		}));
}

async function agreements(): Promise<Agreement[]> {
	const rows = await db.select().from(cpTripAgreements);
	return rows.map((r) => ({
		version: r.version,
		contributions: { 'chris-jenn': r.contributionCj, 'adam-lysanne': r.contributionAl, 'oliver-phoebe': r.contributionOp },
		publishedAt: r.publishedAt.toISOString()
	}));
}

async function payments(): Promise<Payment[]> {
	const rows = await db.select().from(cpTripPayments);
	return rows
		.filter((r) => isGroupId(r.groupId))
		.map((r) => ({ id: r.id, group: r.groupId as GroupId, pence: r.amountPence, receivedOn: r.receivedOn, note: r.note, createdAt: r.createdAt.toISOString() }))
		.sort((a, b) => a.receivedOn.localeCompare(b.receivedOn) || a.id - b.id);
}

async function interest(): Promise<Record<string, string[]>> {
	const rows = await db.select().from(cpTripInterest);
	const out: Record<string, string[]> = Object.fromEntries(ACTIVITY_IDS.map((id) => [id, []]));
	for (const r of rows) if (out[r.activityId] && person(r.personId)) out[r.activityId].push(r.personId);
	return out;
}

async function notes(): Promise<Record<NoteKey, string>> {
	const rows = await db.select().from(cpTripNotes);
	const out = Object.fromEntries(NOTE_KEYS.map((k) => [k, ''])) as Record<NoteKey, string>;
	for (const r of rows) if ((NOTE_KEYS as readonly string[]).includes(r.key)) out[r.key as NoteKey] = r.body;
	return out;
}

/** Everything the page needs. Public: the group is twelve friends sharing a link. */
export async function tripState() {
	const [c, a, p, i, n] = await Promise.all([consents(), agreements(), payments(), interest(), notes()]);
	const agreed = currentAgreement(a);
	return {
		consents: c,
		agreements: a.sort((x, y) => x.version - y.version),
		agreed,
		status: proposalStatus(c, agreed),
		ledger: ledger(a, p, Date.now()),
		interest: i,
		notes: n
	};
}
export type TripState = Awaited<ReturnType<typeof tripState>>;

async function upsertConsent(group: GroupId, values: { pledgePence?: number | null; approvedCj?: number | null; approvedAl?: number | null; approvedOp?: number | null }) {
	const now = new Date();
	await db
		.insert(cpTripConsents)
		.values({ groupId: group, ...values, updatedAt: now })
		.onConflictDoUpdate({ target: cpTripConsents.groupId, set: { ...values, updatedAt: now } });
}

/** A chipping-in couple (House 2, or Oli & Phoebe) sets or withdraws their own pledge. */
export async function pledge(group: unknown, pence: unknown) {
	if (!isContributor(group)) throw new Error('Only Chris & Jenn, Adam & Lysanne and Oli & Phoebe can chip in');
	await upsertConsent(group, { pledgePence: pence === null ? null : assertContribution(pence) });
}

/** A House 1 group approves the amounts currently on the table, or withdraws. */
export async function approve(group: unknown, amounts: Contributions | null) {
	if (!isGroupId(group) || !isReliefGroup(group)) throw new Error('Only House 1 approves this');
	if (amounts === null) return upsertConsent(group, { approvedCj: null, approvedAl: null, approvedOp: null });
	const current = proposalStatus(await consents(), currentAgreement(await agreements()));
	// You can only say yes to what's actually been pledged right now.
	if (!current.proposal || !sameContributions(current.proposal, amounts)) throw new Error('Those amounts have changed — have another look');
	await upsertConsent(group, { approvedCj: amounts['chris-jenn'], approvedAl: amounts['adam-lysanne'], approvedOp: amounts['oliver-phoebe'] });
}

export async function publish() {
	const [c, a] = await Promise.all([consents(), agreements()]);
	const next = publishAgreement(c, currentAgreement(a), new Date());
	await db.insert(cpTripAgreements).values({
		version: next.version,
		contributionCj: next.contributions['chris-jenn'],
		contributionAl: next.contributions['adam-lysanne'],
		contributionOp: next.contributions['oliver-phoebe'],
		consentsJson: JSON.stringify(c),
		publishedAt: new Date(next.publishedAt)
	});
	return next;
}

export async function recordPayment(input: { group: unknown; pence: unknown; receivedOn: unknown; note?: unknown }) {
	const p = validatePayment(input);
	await db.insert(cpTripPayments).values({ groupId: p.group, amountPence: p.pence, receivedOn: p.receivedOn, note: p.note, createdAt: new Date() });
}

export async function setInterest(personId: unknown, activityId: unknown, on: boolean) {
	if (typeof personId !== 'string' || !person(personId)) throw new Error('Unknown person');
	if (typeof activityId !== 'string' || !ACTIVITY_IDS.includes(activityId)) throw new Error('Unknown activity');
	if (on) {
		await db.insert(cpTripInterest).values({ personId, activityId, createdAt: new Date() }).onConflictDoNothing();
	} else {
		await db.delete(cpTripInterest).where(and(eq(cpTripInterest.personId, personId), eq(cpTripInterest.activityId, activityId)));
	}
}

export async function setNote(key: unknown, body: unknown) {
	if (typeof key !== 'string' || !(NOTE_KEYS as readonly string[]).includes(key)) throw new Error('Unknown section');
	const text = typeof body === 'string' ? body.trim().slice(0, 2000) : '';
	const now = new Date();
	await db
		.insert(cpTripNotes)
		.values({ key, body: text, updatedAt: now })
		.onConflictDoUpdate({ target: cpTripNotes.key, set: { body: text, updatedAt: now } });
}

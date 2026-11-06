// Server-side voting for The Sten Is Right (/the-sten-is-right).
//
// One ballot per contestant name (no login — anyone with the link can vote,
// which is the point: it's shared with the crew). A random per-browser cookie
// says which ballot this browser is currently holding; typing a name that's
// already on the board moves that ballot to this browser (see claimBallot).
// Each ballot holds up to VOTES_TOTAL (3) votes as a JSON {houseId: count} map.
// Totals shown on the page are aggregated over every ballot in SQL-land JS —
// there are ~a dozen voters, so reading all rows and summing is trivial.

import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { stenDoBallots } from '$lib/server/db/schema';
import { HOUSE_IDS, VOTES_TOTAL, cleanName, nameKey } from '$lib/sten-do';

export { cleanName, nameKey };

export const STENDO_COOKIE = 'stendo_vid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export type Picks = Record<string, number>;

/** Read the caller's voter id from the cookie, minting + setting one if absent. */
export function getOrCreateVoterId(cookies: Cookies): string {
	const existing = cookies.get(STENDO_COOKIE);
	if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
	const id = randomBytes(16).toString('hex');
	cookies.set(STENDO_COOKIE, id, {
		// Scope to the game's route so it rides along with the page, feed and vote
		// calls but doesn't leak onto the rest of the wedding site.
		path: '/the-sten-is-right',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_MAX_AGE
		// `secure` is left to SvelteKit: true in prod (https), false on localhost.
	});
	return id;
}

/** Clamp an arbitrary picks blob to valid house ids and a 3-vote budget. */
export function sanitizePicks(raw: unknown): Picks {
	const out: Picks = {};
	if (!raw || typeof raw !== 'object') return out;
	let spent = 0;
	for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!HOUSE_IDS.has(id)) continue;
		const n = Math.floor(Number(value));
		if (!Number.isFinite(n) || n <= 0) continue;
		const room = VOTES_TOTAL - spent;
		if (room <= 0) break;
		const give = Math.min(n, room);
		out[id] = give;
		spent += give;
	}
	return out;
}

function parsePicks(json: string | null | undefined): Picks {
	if (!json) return {};
	try {
		const v = JSON.parse(json);
		return v && typeof v === 'object' ? (v as Picks) : {};
	} catch {
		return {};
	}
}

export type Aggregate = { totals: Picks; voterCount: number };

/** Sum every ballot into per-house totals and a count of people who've voted. */
export async function aggregate(): Promise<Aggregate> {
	const rows = await db
		.select({ picks: stenDoBallots.picks })
		.from(stenDoBallots);
	const totals: Picks = {};
	let voterCount = 0;
	for (const row of rows) {
		const picks = parsePicks(row.picks);
		let voted = false;
		for (const id in picks) {
			const v = picks[id] || 0;
			if (v > 0) {
				totals[id] = (totals[id] || 0) + v;
				voted = true;
			}
		}
		if (voted) voterCount++;
	}
	return { totals, voterCount };
}

/** This voter's own saved ballot (empty if they haven't voted yet). */
export async function getBallot(voterId: string): Promise<{ picks: Picks; name: string }> {
	const [row] = await db
		.select({ picks: stenDoBallots.picks, name: stenDoBallots.name })
		.from(stenDoBallots)
		.where(eq(stenDoBallots.voterId, voterId));
	if (!row) return { picks: {}, name: '' };
	return { picks: parsePicks(row.picks), name: row.name ?? '' };
}

// ---- names as identity ----
// The cookie only identifies a browser. People switch phones or lose cookies,
// so the typed name is what really identifies a ballot: entering a name that
// already has a ballot hands that ballot to this browser (with its picks)
// instead of starting a second one.

/** Every distinct contestant name so far, alphabetical — feeds the picker. */
export async function listNames(): Promise<string[]> {
	const rows = await db.select({ name: stenDoBallots.name }).from(stenDoBallots);
	const seen = new Map<string, string>();
	for (const r of rows) {
		const k = nameKey(r.name);
		if (k && !seen.has(k)) seen.set(k, cleanName(r.name));
	}
	return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

export type BallotRow = {
	id: number;
	voterId: string;
	name: string | null;
	picks: string;
	updatedAt: Date | null;
};

/**
 * What to do so that `voterId` ends up holding the ballot for `name`.
 *  - keep:   this browser already holds a ballot under that name.
 *  - claim:  someone (this person on another device) already used that name —
 *            point the ballot at this browser. This browser's own previous
 *            ballot, if any, is released: deleted when empty, otherwise kept
 *            under its old name with a fresh voter id so its votes still count.
 *  - rename: a brand-new name and this browser already has a ballot — treat it
 *            as a correction ("Gregg" → "Greg") rather than a second voter.
 *  - insert: a brand-new name on a brand-new browser.
 */
export type ClaimPlan =
	| { kind: 'keep'; target: BallotRow }
	| { kind: 'claim'; target: BallotRow; release: { row: BallotRow; empty: boolean } | null }
	| { kind: 'rename'; target: BallotRow }
	| { kind: 'insert' };

export function planClaim(rows: BallotRow[], voterId: string, name: string): ClaimPlan {
	const key = nameKey(name);
	const mine = rows.find((r) => r.voterId === voterId) ?? null;
	if (mine && nameKey(mine.name) === key) return { kind: 'keep', target: mine };
	// If an old duplicate exists, the most recently touched ballot wins.
	const match = rows
		.filter((r) => nameKey(r.name) === key)
		.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))[0];
	if (match) {
		const release = mine
			? { row: mine, empty: !Object.values(parsePicks(mine.picks)).some((v) => v > 0) }
			: null;
		return { kind: 'claim', target: match, release };
	}
	return mine ? { kind: 'rename', target: mine } : { kind: 'insert' };
}

/**
 * Make `voterId` hold the ballot for `name` (see planClaim) and, if `picks` is
 * given, store them on it. Returns the ballot's name and sanitised picks.
 */
export async function claimBallot(
	voterId: string,
	rawName: unknown,
	picks?: unknown
): Promise<{ name: string; picks: Picks; claimed: boolean }> {
	const name = cleanName(rawName);
	if (!name) throw new Error('name required');
	const now = new Date();
	return db.transaction(async (tx) => {
		const rows = await tx
			.select({
				id: stenDoBallots.id,
				voterId: stenDoBallots.voterId,
				name: stenDoBallots.name,
				picks: stenDoBallots.picks,
				updatedAt: stenDoBallots.updatedAt
			})
			.from(stenDoBallots);
		const plan = planClaim(rows, voterId, name);

		if (plan.kind === 'insert') {
			const clean = sanitizePicks(picks);
			await tx.insert(stenDoBallots).values({
				voterId,
				name,
				picks: JSON.stringify(clean),
				createdAt: now,
				updatedAt: now
			});
			return { name, picks: clean, claimed: false };
		}

		if (plan.kind === 'claim' && plan.release) {
			// Free up this browser's old ballot first — voter_id is unique.
			if (plan.release.empty)
				await tx.delete(stenDoBallots).where(eq(stenDoBallots.id, plan.release.row.id));
			else
				await tx
					.update(stenDoBallots)
					.set({ voterId: randomBytes(16).toString('hex') })
					.where(eq(stenDoBallots.id, plan.release.row.id));
		}

		// Keep an existing ballot's spelling when claiming it; otherwise use what was typed.
		const finalName = plan.kind === 'claim' ? cleanName(plan.target.name) || name : name;
		const finalPicks = picks === undefined ? parsePicks(plan.target.picks) : sanitizePicks(picks);
		await tx
			.update(stenDoBallots)
			.set({ voterId, name: finalName, picks: JSON.stringify(finalPicks), updatedAt: now })
			.where(eq(stenDoBallots.id, plan.target.id));
		return { name: finalName, picks: finalPicks, claimed: plan.kind === 'claim' };
	});
}

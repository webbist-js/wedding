// Server-side voting for The Sten Is Right (/the-sten-is-right).
//
// One ballot per voter, identified by a random per-browser cookie (no login —
// anyone with the link can vote, which is the point: it's shared with the crew).
// Each ballot holds up to VOTES_TOTAL (3) votes as a JSON {houseId: count} map.
// Totals shown on the page are aggregated over every ballot in SQL-land JS —
// there are ~a dozen voters, so reading all rows and summing is trivial.

import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { stenDoBallots } from '$lib/server/db/schema';
import { HOUSE_IDS, VOTES_TOTAL } from '$lib/sten-do';

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

/** Upsert this voter's ballot; returns the sanitised picks that were stored. */
export async function saveBallot(voterId: string, name: unknown, picks: unknown): Promise<Picks> {
	const clean = sanitizePicks(picks);
	const nm = (typeof name === 'string' ? name : '').trim().slice(0, 24) || 'Someone';
	const picksJson = JSON.stringify(clean);
	const now = new Date();
	await db
		.insert(stenDoBallots)
		.values({ voterId, name: nm, picks: picksJson, createdAt: now, updatedAt: now })
		.onConflictDoUpdate({
			target: stenDoBallots.voterId,
			set: { name: nm, picks: picksJson, updatedAt: now }
		});
	return clean;
}

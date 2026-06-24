import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url }) => {
	// Prefer the configured public URL; otherwise use the request origin so links
	// are correct on whatever host we're served from (never hard-coded localhost in prod).
	const base = env.PUBLIC_BASE_URL || url.origin;

	const allGroups = await db.select().from(inviteGroups).orderBy(asc(inviteGroups.name));
	const total = allGroups.length;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(Math.max(1, Number(url.searchParams.get('page') ?? 1)), pageCount);
	const groups = allGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const allGuests = await db.select().from(guests);
	// Only the lightweight inline SVG is rendered per card; the print-resolution
	// PNG is generated on demand by /dashboard/invites/qr (keeps this load fast).
	const rows = await Promise.all(
		groups.map(async (g) => {
			const members = allGuests.filter((m) => m.groupId === g.id);
			const rsvpUrl = `${base}/rsvp/${g.token}`;
			const qr = await QRCode.toString(rsvpUrl, { type: 'svg', margin: 1, width: 160 });
			const slug =
				g.name
					.toLowerCase()
					.normalize('NFKD')
					.replace(/[^\w\s-]/g, '')
					.trim()
					.replace(/\s+/g, '-') || `group-${g.id}`;
			const responded = members.filter((m) => m.rsvpStatus !== 'pending').length;
			return {
				id: g.id,
				token: g.token,
				name: g.name,
				personalMessage: g.personalMessage ?? '',
				url: rsvpUrl,
				qr,
				slug,
				members,
				responded,
				total: members.length
			};
		})
	);

	return { rows, page, pageCount, total, pageSize: PAGE_SIZE };
};

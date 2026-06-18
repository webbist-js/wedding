import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { inviteGroups, guests } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';

export const load: PageServerLoad = async () => {
	const base = env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
	const groups = await db.select().from(inviteGroups).orderBy(asc(inviteGroups.name));
	const allGuests = await db.select().from(guests);
	const rows = await Promise.all(
		groups.map(async (g) => {
			const members = allGuests.filter((m) => m.groupId === g.id);
			const url = `${base}/rsvp/${g.token}`;
			const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 160 });
			// Higher-resolution PNG for the download button (print-ready).
			const qrPng = await QRCode.toDataURL(url, {
				width: 1024,
				margin: 1,
				errorCorrectionLevel: 'M'
			});
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
				name: g.name,
				personalMessage: g.personalMessage ?? '',
				url,
				qr,
				qrPng,
				slug,
				members,
				responded,
				total: members.length
			};
		})
	);
	return { rows };
};

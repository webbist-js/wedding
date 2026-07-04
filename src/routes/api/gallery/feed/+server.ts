import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { GALLERY_COOKIE, verifyGalleryAccess } from '$lib/server/gallery';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!verifyGalleryAccess(cookies.get(GALLERY_COOKIE), env.SESSION_SECRET ?? '')) {
		throw error(401);
	}
	const rows = await db
		.select()
		.from(galleryItems)
		.where(eq(galleryItems.hidden, false))
		.orderBy(desc(galleryItems.id));

	return json(
		{
			items: rows.map((r) => ({
				id: r.id,
				url: r.blobUrl,
				kind: r.kind,
				name: r.uploaderName,
				caption: r.caption,
				at: r.createdAt?.getTime() ?? null
			}))
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};

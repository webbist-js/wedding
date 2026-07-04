import type { Actions, PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { getOrCreateUploadToken, regenerateUploadToken } from '$lib/server/gallery';
import { recordAudit } from '$lib/server/audit';

export const load: PageServerLoad = async ({ url }) => {
	const token = await getOrCreateUploadToken();
	const items = await db.select().from(galleryItems).orderBy(desc(galleryItems.id));
	const base = env.PUBLIC_BASE_URL || url.origin;
	return {
		items: items.map((i) => ({
			id: i.id,
			url: i.blobUrl,
			kind: i.kind,
			name: i.uploaderName,
			caption: i.caption,
			hidden: i.hidden,
			size: i.size,
			at: i.createdAt?.getTime() ?? null
		})),
		snapsUrl: `${base}/snaps/${token}`,
		galleryUrl: `${base}/gallery`,
		totalBytes: items.reduce((n, i) => n + (i.size ?? 0), 0)
	};
};

export const actions: Actions = {
	regenerate: async ({ locals }) => {
		await regenerateUploadToken();
		await recordAudit(locals, {
			action: 'update',
			entity: 'gallery',
			summary: 'Regenerated the gallery QR token — old printed QRs are dead'
		});
		return { regenerated: true };
	}
};

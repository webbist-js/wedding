import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import { recordAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authed) throw error(401);
	const { id, op } = await request.json();
	if (typeof id !== 'number' || !['hide', 'unhide', 'delete'].includes(op)) {
		throw error(400, 'bad request');
	}
	const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
	if (!item) throw error(404);

	if (op === 'delete') {
		// Remove the blob first — if that fails we keep the row so it stays visible
		// in the dashboard rather than leaking an orphaned blob we can't see.
		await del(item.blobUrl);
		await db.delete(galleryItems).where(eq(galleryItems.id, id));
		await recordAudit(locals, {
			action: 'delete',
			entity: 'gallery',
			entityId: id,
			summary: `Deleted a gallery ${item.kind}${item.uploaderName ? ` from ${item.uploaderName}` : ''}`
		});
	} else {
		await db.update(galleryItems).set({ hidden: op === 'hide' }).where(eq(galleryItems.id, id));
		await recordAudit(locals, {
			action: 'update',
			entity: 'gallery',
			entityId: id,
			summary: `${op === 'hide' ? 'Hid' : 'Unhid'} a gallery ${item.kind}`
		});
	}
	return json({ ok: true });
};

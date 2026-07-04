import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { head } from '@vercel/blob';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import {
	isValidUploadToken,
	isAllowedPathname,
	kindFromContentType
} from '$lib/server/gallery';

// Client-side completion path (onUploadCompleted doesn't fire on localhost).
// Metadata comes from head() — the blob store's word, not the client's — so
// nobody can register a URL they didn't actually upload to our store.
export const POST: RequestHandler = async ({ request }) => {
	const { token, url, name, caption } = await request.json();
	if (!(await isValidUploadToken(token))) throw error(403, 'invalid token');
	if (typeof url !== 'string') throw error(400, 'missing url');

	let blob;
	try {
		blob = await head(url);
	} catch {
		throw error(400, 'no such upload');
	}
	if (!isAllowedPathname(blob.pathname)) throw error(400, 'unexpected path');
	const kind = kindFromContentType(blob.contentType);
	if (!kind) throw error(400, 'unsupported type');

	await db
		.insert(galleryItems)
		.values({
			blobUrl: blob.url,
			blobPathname: blob.pathname,
			kind,
			contentType: blob.contentType,
			size: blob.size,
			uploaderName: typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : null,
			caption: typeof caption === 'string' && caption.trim() ? caption.trim().slice(0, 280) : null,
			createdAt: new Date()
		})
		.onConflictDoNothing({ target: galleryItems.blobPathname });

	return json({ ok: true });
};

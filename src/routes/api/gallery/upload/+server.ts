import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db } from '$lib/server/db/index';
import { galleryItems } from '$lib/server/db/schema';
import {
	ALLOWED_CONTENT_TYPES,
	MAX_UPLOAD_BYTES,
	isValidUploadToken,
	isAllowedPathname,
	kindFromContentType
} from '$lib/server/gallery';

// Vercel Blob client-upload handshake. The phone asks for a scoped upload
// token here; we only grant one when the request carries the secret QR token,
// and the grant itself carries the size cap + content-type allowlist so a
// tampered client can't exceed them.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as HandleUploadBody;

	const jsonResponse = await handleUpload({
		body,
		request,
		onBeforeGenerateToken: async (pathname, clientPayload) => {
			let payload: { token?: string; name?: string; caption?: string } = {};
			try {
				payload = JSON.parse(clientPayload ?? '{}');
			} catch {
				// fall through to the token check below
			}
			if (!(await isValidUploadToken(payload.token))) {
				throw new Error('That QR code is not valid any more.');
			}
			if (!isAllowedPathname(pathname)) {
				throw new Error('Unexpected upload path.');
			}
			return {
				allowedContentTypes: ALLOWED_CONTENT_TYPES,
				maximumSizeInBytes: MAX_UPLOAD_BYTES,
				addRandomSuffix: true,
				tokenPayload: JSON.stringify({
					name: payload.name?.slice(0, 80) ?? null,
					caption: payload.caption?.slice(0, 280) ?? null
				})
			};
		},
		// Fires in production once the blob lands (not on localhost — the client
		// register call is the sole path in dev, belt-and-braces in prod).
		onUploadCompleted: async ({ blob, tokenPayload }) => {
			const meta = JSON.parse(tokenPayload ?? '{}');
			const kind = kindFromContentType(blob.contentType);
			if (!kind) return;
			await db
				.insert(galleryItems)
				.values({
					blobUrl: blob.url,
					blobPathname: blob.pathname,
					kind,
					contentType: blob.contentType,
					uploaderName: meta.name ?? null,
					caption: meta.caption ?? null,
					createdAt: new Date()
				})
				.onConflictDoNothing({ target: galleryItems.blobPathname });
		}
	});

	return json(jsonResponse);
};

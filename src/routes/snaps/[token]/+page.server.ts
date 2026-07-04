import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { GALLERY_COOKIE, isValidUploadToken, signGalleryAccess } from '$lib/server/gallery';

export const load: PageServerLoad = async ({ params, cookies }) => {
	if (!(await isValidUploadToken(params.token))) {
		// Playful 404 — the printed QR was regenerated or the URL was mangled.
		throw error(404, 'This QR has retired. Grab a drink and ask the happy couple!');
	}
	// Arriving via the QR proves you're in the room — unlock the gallery too.
	cookies.set(GALLERY_COOKIE, signGalleryAccess(env.SESSION_SECRET ?? ''), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 3 * 86_400
	});
	return { token: params.token };
};

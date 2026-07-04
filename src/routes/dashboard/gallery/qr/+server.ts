import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';
import { getOrCreateUploadToken } from '$lib/server/gallery';

// Print-resolution QR for the venue. Error correction 'H' — table cards get
// wine on them.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.authed) throw error(401);
	const token = await getOrCreateUploadToken();
	const base = env.PUBLIC_BASE_URL || url.origin;
	const png = await QRCode.toBuffer(`${base}/snaps/${token}`, {
		width: 1024,
		margin: 1,
		errorCorrectionLevel: 'H'
	});
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'content-disposition': 'attachment; filename="gallery-qr.png"',
			'cache-control': 'no-store'
		}
	});
};

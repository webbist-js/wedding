import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';

// On-demand print-resolution QR PNG for the "Download QR" button, so the invites
// page load doesn't have to render 1024px PNGs for every household up front.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.authed) throw error(401);
	const token = url.searchParams.get('token');
	if (!token) throw error(400, 'missing token');

	const base = env.PUBLIC_BASE_URL || url.origin;
	const target = `${base}/rsvp/${token}`;
	const png = await QRCode.toBuffer(target, { width: 1024, margin: 1, errorCorrectionLevel: 'M' });

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'private, max-age=3600'
		}
	});
};

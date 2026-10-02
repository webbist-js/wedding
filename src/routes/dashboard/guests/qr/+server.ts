import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';

// QR PNG for a household's RSVP link. `size` defaults to print resolution
// (1024px) for the Download button; the guest list asks for small thumbnails
// (e.g. 180) so cards stay light.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.authed) throw error(401);
	const token = url.searchParams.get('token');
	if (!token) throw error(400, 'missing token');
	const size = Math.min(2048, Math.max(96, Number(url.searchParams.get('size') ?? 1024) || 1024));

	const base = env.PUBLIC_BASE_URL || url.origin;
	const target = `${base}/rsvp/${token}`;
	const png = await QRCode.toBuffer(target, { width: size, margin: 1, errorCorrectionLevel: 'M' });

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'private, max-age=3600'
		}
	});
};

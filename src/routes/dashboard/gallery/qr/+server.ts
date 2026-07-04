import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import QRCode from 'qrcode';
import { getOrCreateUploadToken } from '$lib/server/gallery';

const INK = '#211f1a';

// Circular-styled QR as print-quality SVG: round modules, circular finder
// eyes, and a deterministic ring of decorative dots that gives the whole mark
// a circular silhouette. The data grid itself stays square (QR requirement);
// error-correction H gives plenty of headroom for the styling.
function circularQrSvg(target: string): string {
	const qr = QRCode.create(target, { errorCorrectionLevel: 'H' });
	const n = qr.modules.size;
	const dark = (r: number, c: number) => qr.modules.get(r, c) === 1;
	const inFinder = (r: number, c: number) =>
		(r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

	const T = Math.ceil(n * 1.5); // circular canvas, QR centred
	const off = (T - n) / 2;
	const centre = T / 2;
	const parts: string[] = [];

	// Data modules as dots.
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			if (dark(r, c) && !inFinder(r, c)) {
				parts.push(`<circle cx="${off + c + 0.5}" cy="${off + r + 0.5}" r="0.5"/>`);
			}
		}
	}

	// Finder eyes: ring + filled centre (scanners tolerate circular finders well).
	for (const [fr, fc] of [
		[0, 0],
		[0, n - 7],
		[n - 7, 0]
	]) {
		const cx = off + fc + 3.5;
		const cy = off + fr + 3.5;
		parts.push(
			`<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="${INK}" stroke-width="1"/>`,
			`<circle cx="${cx}" cy="${cy}" r="1.6"/>`
		);
	}

	// Decorative dots fill the annulus between the QR (plus a 3-module quiet
	// zone) and the circular boundary. Deterministic hash, not Math.random, so
	// every download of the same code is print-identical.
	const R = centre - 1;
	const quietHalf = n / 2 + 3;
	for (let gy = 0; gy < T; gy++) {
		for (let gx = 0; gx < T; gx++) {
			const dx = gx + 0.5 - centre;
			const dy = gy + 0.5 - centre;
			const insideQuiet = Math.abs(dx) < quietHalf && Math.abs(dy) < quietHalf;
			if (!insideQuiet && Math.hypot(dx, dy) < R) {
				const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
				if (h % 5 < 2) parts.push(`<circle cx="${gx + 0.5}" cy="${gy + 0.5}" r="0.5"/>`);
			}
		}
	}

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="1024" height="1024">` +
		`<rect width="${T}" height="${T}" fill="#ffffff"/>` +
		`<g fill="${INK}">${parts.join('')}</g>` +
		`</svg>`
	);
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.authed) throw error(401);
	const token = await getOrCreateUploadToken();
	const base = env.PUBLIC_BASE_URL || url.origin;
	const target = `${base}/snaps/${token}`;

	// Plain square PNG fallback for print shops that won't take SVG.
	if (url.searchParams.get('format') === 'png') {
		const png = await QRCode.toBuffer(target, {
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
	}

	return new Response(circularQrSvg(target), {
		headers: {
			'content-type': 'image/svg+xml',
			'content-disposition': 'attachment; filename="gallery-qr.svg"',
			'cache-control': 'no-store'
		}
	});
};

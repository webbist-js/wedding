import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

// /the-stendo was the house vote; it now lives in the archive and /stendo is the
// Center Parcs plan. The bare link goes to the new page; everything under it
// (Switzerland, the old voting API) keeps working from the archive. The ballot
// cookie is re-scoped so returning voters keep their old picks.
export const fallback: RequestHandler = ({ cookies, params, url }) => {
	const voterId = cookies.get('stendo_vid');
	if (voterId && /^[a-f0-9]{32}$/.test(voterId)) {
		cookies.set('stendo_vid', voterId, {
			path: '/stendo/archive', httpOnly: true, sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 180
		});
	}
	const rest = params.path ?? '';
	throw redirect(308, (rest ? `/stendo/archive/${rest}` : '/stendo') + url.search);
};

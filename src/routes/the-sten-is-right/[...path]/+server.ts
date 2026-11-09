import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

// Preserve shared links, old API requests and the browser's existing ballot.
export const fallback: RequestHandler = ({ cookies, url }) => {
    const voterId = cookies.get('stendo_vid');
    if (voterId && /^[a-f0-9]{32}$/.test(voterId)) {
        cookies.set('stendo_vid', voterId, {
            path: '/stendo/archive', httpOnly: true, sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 180
        });
    }
    throw redirect(308, '/stendo/archive' + url.pathname.slice('/the-sten-is-right'.length) + url.search);
};

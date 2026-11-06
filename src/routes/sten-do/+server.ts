import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

// Old name for The Sten Is Right — keep any already-shared links working.
export const GET: RequestHandler = () => {
	throw redirect(308, '/the-sten-is-right');
};

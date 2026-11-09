import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

// Old name for the Sten Do page — keep any already-shared links working.
export const GET: RequestHandler = () => {
	throw redirect(308, '/stendo');
};

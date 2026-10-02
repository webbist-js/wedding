import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Vendors moved under Money as "Suppliers" — keep old bookmarks working.
export const load: PageServerLoad = async () => {
	throw redirect(301, '/dashboard/suppliers');
};

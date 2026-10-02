import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Invites live on each household card in the Guest list now.
export const load: PageServerLoad = async () => {
	throw redirect(301, '/dashboard/guests');
};

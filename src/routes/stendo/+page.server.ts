import type { PageServerLoad } from './$types';
import { summary, allResponses } from '$lib/server/stendo';

// Totals for everyone; the per-person table only for a signed-in organiser.
export const load: PageServerLoad = async ({ locals }) => {
	const [s, rows] = await Promise.all([summary(), locals.authed ? allResponses() : Promise.resolve(null)]);
	return { ...s, organiser: rows };
};

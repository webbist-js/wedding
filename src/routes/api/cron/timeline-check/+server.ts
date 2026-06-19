import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runTimelineCheck } from '$lib/server/timeline-check';

// External cron entry point — hit this once a day from your scheduler of choice
// (system cron, GitHub Actions, Vercel Cron, etc.).
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/timeline-check
//
// If CRON_SECRET isn't set we accept any request (handy for local testing).
async function handle(authHeader: string | null) {
	if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
		throw error(401, 'Unauthorized');
	}
	const result = await runTimelineCheck();
	return json({ ok: true, ...result });
}

export const GET: RequestHandler = ({ request }) => handle(request.headers.get('authorization'));
export const POST: RequestHandler = ({ request }) => handle(request.headers.get('authorization'));

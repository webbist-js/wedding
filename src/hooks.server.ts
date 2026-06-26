import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifySession } from '$lib/server/auth';
import { startTimelineScheduler } from '$lib/server/timeline-check';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE = 'session';

// Fail fast rather than silently signing sessions with an empty key, which would
// let anyone who guesses the secret is unset forge a valid dashboard cookie.
if (!env.SESSION_SECRET) {
	throw new Error('SESSION_SECRET is not set — refusing to start with an insecure session key.');
}

// Boot the in-process daily timeline checker (idempotent — safe to call here).
// Long-lived deployments (DigitalOcean droplet) get reminders for free; serverless
// hosts should also hit /api/cron/timeline-check from an external cron.
startTimelineScheduler();

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE);
	const session = verifySession(token, env.SESSION_SECRET ?? '');
	if (session) {
		const [u] = await db.select().from(users).where(eq(users.slug, session.slug));
		event.locals.user = u ? { id: u.id, slug: u.slug, name: u.name } : null;
	} else {
		event.locals.user = null;
	}
	event.locals.authed = !!event.locals.user;

	if (event.url.pathname.startsWith('/dashboard') && !event.locals.authed) {
		throw redirect(303, '/login');
	}
	return resolve(event);
};

import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifySession } from '$lib/server/auth';

const COOKIE = 'session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE);
	event.locals.authed = verifySession(token, env.SESSION_SECRET ?? '');

	if (event.url.pathname.startsWith('/dashboard') && !event.locals.authed) {
		throw redirect(303, '/login');
	}
	return resolve(event);
};

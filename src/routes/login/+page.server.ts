import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signSession } from '$lib/server/auth';
import { resolvePasscodeSlug } from '$lib/server/users';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const passcode = String(data.get('passcode') ?? '');
		const slug = await resolvePasscodeSlug(passcode, {
			alex: env.PASSCODE_HASH_ALEX,
			katie: env.PASSCODE_HASH_KATIE
		});
		if (!slug) return fail(401, { error: 'That passcode is not right.' });
		cookies.set('session', signSession(env.SESSION_SECRET ?? '', slug), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 90
		});
		throw redirect(303, '/dashboard');
	}
};

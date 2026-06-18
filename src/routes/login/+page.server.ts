import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifyPasscode, signSession } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const passcode = String(data.get('passcode') ?? '');
		const ok = await verifyPasscode(passcode, env.ADMIN_PASSCODE_HASH ?? '');
		if (!ok) return fail(401, { error: 'That passcode is not right.' });
		cookies.set('session', signSession(env.SESSION_SECRET ?? ''), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 90
		});
		throw redirect(303, '/dashboard');
	}
};

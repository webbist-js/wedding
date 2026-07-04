import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'node:crypto';
import { GALLERY_COOKIE, signGalleryAccess, verifyGalleryAccess } from '$lib/server/gallery';

export const load: PageServerLoad = async ({ cookies }) => {
	return {
		unlocked: verifyGalleryAccess(cookies.get(GALLERY_COOKIE), env.SESSION_SECRET ?? '')
	};
};

export const actions: Actions = {
	unlock: async ({ request, cookies }) => {
		const form = await request.formData();
		const guess = String(form.get('password') ?? '');
		const actual = env.GALLERY_PASSWORD ?? '';
		// Fail closed when GALLERY_PASSWORD is unset; QR arrivals still get in.
		const a = Buffer.from(guess);
		const b = Buffer.from(actual);
		const ok = actual.length > 0 && a.length === b.length && timingSafeEqual(a, b);
		if (!ok) return fail(403, { wrong: true });
		cookies.set(GALLERY_COOKIE, signGalleryAccess(env.SESSION_SECRET ?? ''), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 3 * 86_400
		});
		return { unlocked: true };
	}
};

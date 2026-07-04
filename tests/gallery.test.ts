import { describe, it, expect } from 'vitest';
import {
	signGalleryAccess,
	verifyGalleryAccess,
	kindFromContentType,
	isAllowedPathname
} from '../src/lib/server/gallery';

const SECRET = 'test-secret';
const DAY = 86_400_000;

describe('gallery access cookie', () => {
	it('round-trips a signed token', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET)).toBe(true);
	});
	it('rejects a tampered token', () => {
		expect(verifyGalleryAccess(signGalleryAccess(SECRET) + 'x', SECRET)).toBe(false);
	});
	it('rejects a token signed with another secret', () => {
		expect(verifyGalleryAccess(signGalleryAccess('other'), SECRET)).toBe(false);
	});
	it('rejects a missing token', () => {
		expect(verifyGalleryAccess(undefined, SECRET)).toBe(false);
	});
	it('rejects a token older than 3 days', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET, Date.now() + 4 * DAY)).toBe(false);
	});
	it('accepts a token younger than 3 days', () => {
		const token = signGalleryAccess(SECRET);
		expect(verifyGalleryAccess(token, SECRET, Date.now() + 2 * DAY)).toBe(true);
	});
});

describe('kindFromContentType', () => {
	it('maps images to photo', () => {
		expect(kindFromContentType('image/jpeg')).toBe('photo');
		expect(kindFromContentType('image/heic')).toBe('photo');
	});
	it('maps videos to video', () => {
		expect(kindFromContentType('video/mp4')).toBe('video');
	});
	it('returns null for anything else', () => {
		expect(kindFromContentType('application/pdf')).toBeNull();
		expect(kindFromContentType(null)).toBeNull();
	});
});

describe('isAllowedPathname', () => {
	it('accepts the prod prefix', () => {
		expect(isAllowedPathname('gallery/abc-123.jpg')).toBe(true);
	});
	it('accepts the dev prefix', () => {
		expect(isAllowedPathname('dev/gallery/abc.mp4')).toBe(true);
	});
	it('rejects foreign pathnames', () => {
		expect(isAllowedPathname('avatars/x.jpg')).toBe(false);
		expect(isAllowedPathname('galleryx/x.jpg')).toBe(false);
	});
});

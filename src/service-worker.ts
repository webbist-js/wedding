/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
// Build assets are hashed by SvelteKit — safe to cache aggressively.
// `files` are everything under /static (manifest, icons, robots.txt).
const ASSETS = [...build, ...files];

// Paths we DON'T want the SW to cache: they're either auth-gated or per-token
// dynamic content that must always go to the network so we never serve cached
// private data to the wrong user.
const NO_CACHE_PREFIXES = ['/dashboard', '/rsvp/', '/login', '/logout'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(ASSETS);
		})()
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Don't intercept cross-origin (Google Fonts, OSM map iframe, etc.)
	if (url.origin !== self.location.origin) return;

	// Don't intercept auth-gated or per-token dynamic routes.
	if (NO_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Hashed build assets and static files — cache-first.
			if (ASSETS.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			// Everything else — network-first, fall back to cache when offline.
			try {
				const response = await fetch(request);
				if (response.status === 200) {
					cache.put(request, response.clone());
				}
				return response;
			} catch (err) {
				const cached = await cache.match(request);
				if (cached) return cached;
				throw err;
			}
		})()
	);
});

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// DOM regression tests need Svelte's browser runtime for event handlers.
	...(process.env.VITEST ? { resolve: { conditions: ['browser'] } } : {}),
	server: {
		allowedHosts: ['d636-2a10-d586-b3be-1-9c3d-b966-ddf6-d517.ngrok-free.app']
	},
	preview: {
		allowedHosts: ['d636-2a10-d586-b3be-1-9c3d-b966-ddf6-d517.ngrok-free.app']
	},
	test: { include: ['tests/**/*.test.ts'], environment: 'node' }
});

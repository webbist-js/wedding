import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	// Node serverless runtime on Vercel. The hourly in-process reminder scheduler
	// is replaced in production by Vercel Cron hitting /api/cron/timeline-check
	// (see vercel.json) — serverless functions don't keep timers alive.
	kit: { adapter: adapter({ runtime: 'nodejs22.x' }) }
};

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Resolve env via SvelteKit's $env/dynamic/private when running inside Vite/Kit,
// and fall back to process.env when run under plain tsx (e.g. `npm run db:seed`),
// where the `$env` alias is not available.
async function resolveEnv(): Promise<Record<string, string | undefined>> {
	try {
		const mod = await import('$env/dynamic/private');
		return mod.env;
	} catch {
		return process.env;
	}
}

const env = await resolveEnv();

const client = createClient({
	url: env.DATABASE_URL ?? 'file:./local.db',
	authToken: env.DATABASE_AUTH_TOKEN // undefined for local file, set for Turso
});

export const db = drizzle(client, { schema });
export { schema };

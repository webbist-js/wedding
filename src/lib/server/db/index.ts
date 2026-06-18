import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = createClient({
	url: env.DATABASE_URL ?? 'file:./local.db',
	authToken: env.DATABASE_AUTH_TOKEN // undefined for local file, set for Turso
});

export const db = drizzle(client, { schema });
export { schema };

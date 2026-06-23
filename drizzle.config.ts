import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./local.db',
    // Required when migrating against a remote Turso DB; ignored for local files.
    authToken: process.env.DATABASE_AUTH_TOKEN
  }
});

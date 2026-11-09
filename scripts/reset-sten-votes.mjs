// One-time, recoverable reset. Usage: node scripts/reset-sten-votes.mjs [--production]
import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@libsql/client';
const production = process.argv.includes('--production');
const env = production ? parseEnv(fs.readFileSync('.env', 'utf8')) : {};
const url = production ? env.TURSO_URL : 'file:./local.db';
if (!url || (production && !url.startsWith('libsql://'))) throw new Error('Expected configured Turso production database');
const client = createClient({url, authToken: production ? env.TURSO_TOKEN : undefined});
const tx = await client.transaction('write');
try {
 const archive = await tx.execute("SELECT name FROM sqlite_master WHERE name = 'sten_do_ballots_before_20261106'");
 if (archive.rows.length) {
  console.log('Reset already applied; leaving current ballots intact.');
 } else {
  const before = await tx.execute('SELECT count(*) AS n FROM sten_do_ballots');
  await tx.executeMultiple(fs.readFileSync('scripts/prod-data-fixes/2026-11-06-reset-sten-votes.sql','utf8'));
  const after = await tx.execute("SELECT count(*) AS n FROM sten_do_ballots WHERE picks != '{}'");
  if (Number(after.rows[0].n) !== 0) throw new Error('Reset verification failed');
  console.log(`Archived and cleared ${before.rows[0].n} ballots; contestant names preserved.`);
 }
 await tx.commit();
} catch (err) { await tx.rollback(); throw err; }
finally { tx.close(); client.close(); }

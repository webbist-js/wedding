// One-time reset for the reviewed STENDO launch. All previous rows remain archived.
import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createClient } from '@libsql/client';
import { stripTypeScriptTypes } from 'node:module';
async function loadSource(path) {
    const source = stripTypeScriptTypes(fs.readFileSync(path, 'utf8'));
    return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
const { WEDDING_PARTY } = await loadSource('src/lib/wedding-party.ts');
const { WEDDING } = await loadSource('src/lib/wedding-info.ts');
const STEN_VOTERS = [...WEDDING.coupleName.split(' & '), ...WEDDING_PARTY.flatMap(couple => couple.members.map(member => member.name))];
const production = process.argv.includes('--production');
const env = production ? parseEnv(fs.readFileSync('.env', 'utf8')) : {};
const url = production ? env.TURSO_URL : 'file:./local.db';
if (!url || (production && !url.startsWith('libsql://'))) throw new Error('Expected configured wedding Turso database');
if (STEN_VOTERS.length !== 12 || new Set(STEN_VOTERS).size !== 12) throw new Error('Expected twelve unique adult voters');
const client = createClient({ url, authToken: production ? env.TURSO_TOKEN : undefined });
const tx = await client.transaction('write');
try {
    const archive = await tx.execute("SELECT name FROM sqlite_master WHERE name = 'sten_ballots_before_party_launch_20261106'");
    if (archive.rows.length) {
        console.log('Launch reset already applied; preserving current votes.');
    } else {
        await tx.execute('CREATE TABLE sten_ballots_before_party_launch_20261106 AS SELECT * FROM sten_do_ballots');
        await tx.execute('DELETE FROM sten_do_ballots');
        for (const name of STEN_VOTERS) {
            await tx.execute({ sql: "INSERT INTO sten_do_ballots (voter_id, name, picks, created_at, updated_at) VALUES (?, ?, '{}', unixepoch(), unixepoch())", args: [randomBytes(16).toString('hex'), name] });
        }
        const rows = await tx.execute('SELECT name, picks FROM sten_do_ballots ORDER BY name');
        if (rows.rows.length !== 12 || rows.rows.some(row => row.picks !== '{}')) throw new Error('Reset validation failed');
        console.log('Archived old ballots; created 12 named ballots with zero votes:', rows.rows.map(row => row.name).join(', '));
    }
    await tx.commit();
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }

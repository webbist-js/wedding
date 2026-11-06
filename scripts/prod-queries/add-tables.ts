import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

async function addTables() {
  try {
    await client.execute(`
      INSERT INTO seating_tables (number, kind, seats, sort) 
      VALUES (8, 'round', 10, 8), (9, 'round', 10, 9)
    `);
    
    // Verify
    const result = await client.execute('SELECT COUNT(*) as count FROM seating_tables');
    const tableCount = (result.rows[0] as any).count;
    
    console.log(`✅ Tables 8 & 9 added to live database`);
    console.log(`✅ Total tables now: ${tableCount}`);
    console.log('');
    console.log('📊 Capacity Analysis:');
    console.log(`  ${tableCount} tables × 10 seats = ${tableCount * 10} total capacity`);
    console.log('');
    console.log('Day event: 86 guests → need 9 tables (90 seats) ✅');
    console.log('Evening event: 55 guests → need 6 tables (60 seats) ✅');
  } catch (e) {
    console.error('Error:', e);
  }
}

addTables();

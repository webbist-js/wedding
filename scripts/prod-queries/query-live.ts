import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

async function getNumbers() {
  // Total households
  const households = await client.execute('SELECT COUNT(*) as count FROM invite_groups');
  
  // Breakdown by day/evening
  const breakdown = await client.execute(`
    SELECT 
      attendance_type,
      COUNT(DISTINCT group_id) as households,
      COUNT(*) as guests
    FROM guests
    GROUP BY attendance_type
  `);
  
  // Number of tables
  const tables = await client.execute('SELECT COUNT(DISTINCT number) as count FROM seating_tables');
  
  console.log('🎉 Wedding Printing Numbers (LIVE DATABASE):');
  console.log('');
  console.log(`📬 Total Households (Envelopes): ${(households.rows[0] as any).count}`);
  console.log('');
  console.log('By Event Type:');
  
  for (const row of breakdown.rows) {
    const type = (row as any).attendance_type === 'day' ? '☀️ Day' : '🌙 Evening';
    console.log(`  ${type}: ${(row as any).households} households, ${(row as any).guests} guests`);
  }
  
  console.log('');
  console.log(`🪑 Number of Tables: ${(tables.rows[0] as any).count}`);
  console.log(`📇 Table Numbers to Print: ${(tables.rows[0] as any).count}`);
  console.log(`📸 Camera Game Cards: 3 × ${(tables.rows[0] as any).count} = ${3 * (tables.rows[0] as any).count}`);
}

getNumbers().catch(console.error);

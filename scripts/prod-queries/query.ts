import { drizzle } from 'drizzle-orm/turso';
import { createClient } from '@libsql/client';
import * as schema from '../../src/lib/server/db/schema.js';
import { sql, eq, and } from 'drizzle-orm';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

const db = drizzle(client, { schema });

async function getNumbers() {
  // Total households
  const households = await db
    .select({ count: sql`count(*)` })
    .from(schema.inviteGroups);
  
  // Breakdown by day/evening
  const breakdown = await db
    .select({
      type: schema.guests.attendanceType,
      count: sql`count(distinct ${schema.guests.groupId})`
    })
    .from(schema.guests)
    .groupBy(schema.guests.attendanceType);
  
  // Total day guests (for menu count)
  const dayGuests = await db
    .select({ count: sql`count(*)` })
    .from(schema.guests)
    .where(eq(schema.guests.attendanceType, 'day'));
  
  // Evening guests
  const eveningGuests = await db
    .select({ count: sql`count(*)` })
    .from(schema.guests)
    .where(eq(schema.guests.attendanceType, 'evening'));
  
  // Number of tables
  const tables = await db
    .select({ count: sql`count(distinct number)` })
    .from(schema.seatingTables);

  console.log('🎉 Wedding Printing Numbers:');
  console.log('');
  console.log(`📬 Total Households (Envelopes): ${(households[0] as any).count}`);
  console.log('');
  
  console.log('By Event Type:');
  for (const row of breakdown) {
    console.log(`  ${row.type === 'day' ? '☀️ Day' : '🌙 Evening'}: ${(row as any).count} households`);
  }
  console.log('');
  
  console.log(`👥 Day Guests (for menus): ${(dayGuests[0] as any).count}`);
  console.log(`👥 Evening Guests: ${(eveningGuests[0] as any).count}`);
  console.log('');
  console.log(`🪑 Number of Tables: ${(tables[0] as any).count}`);
  console.log(`📇 Table Numbers to Print: ${(tables[0] as any).count} (one per table)`);
  console.log(`📸 Camera Game Cards: 3 × ${(tables[0] as any).count} = ${3 * (tables[0] as any).count} cards`);
}

getNumbers().catch(console.error);

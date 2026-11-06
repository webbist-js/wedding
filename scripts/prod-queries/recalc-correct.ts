import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

async function recalculate() {
  // Correct 13 overseas households
  const overseasHouseholds = [
    'Bart Sakowski',
    'Ben Hooker',
    'Christopher & Erik Lauzon',
    'Derrick & Paul',
    'Dimitris Messinis',
    'Emily Roesler',
    'Kellan Bolger',
    'Mark Norman',
    'Pierre Burgy',
    'Raul Balestra',
    'Richard Nsama',
    'Rosie Hackett & Francesco Lorusso',
    'Vlad Ocneanu'
  ];
  
  const placeholders = overseasHouseholds.map(() => '?').join(',');
  
  // Total households (excluding overseas)
  const totalHouseholds = await client.execute(`
    SELECT COUNT(*) as count FROM invite_groups 
    WHERE name NOT IN (${placeholders})
  `, overseasHouseholds);
  
  // Day/evening breakdown (excluding overseas)
  const breakdown = await client.execute(`
    SELECT 
      g.attendance_type,
      COUNT(DISTINCT g.group_id) as households,
      COUNT(*) as guests
    FROM guests g
    JOIN invite_groups ig ON g.group_id = ig.id
    WHERE ig.name NOT IN (${placeholders})
    GROUP BY g.attendance_type
  `, overseasHouseholds);
  
  console.log('📊 CORRECTED PRINTING NUMBERS (13 Overseas Households Removed):\n');
  
  const totalHH = (totalHouseholds.rows[0] as any).count;
  console.log(`📬 Total Envelopes: ${totalHH}`);
  console.log('');
  
  let dayHH = 0, dayGuests = 0, eveningHH = 0, eveningGuests = 0;
  
  for (const row of breakdown.rows) {
    const r = row as any;
    if (r.attendance_type === 'day') {
      dayHH = r.households;
      dayGuests = r.guests;
      console.log(`☀️  Day: ${dayHH} households, ${dayGuests} guests`);
    } else {
      eveningHH = r.households;
      eveningGuests = r.guests;
      console.log(`🌙 Evening: ${eveningHH} households, ${eveningGuests} guests`);
    }
  }
  
  console.log('\n📋 PRINTING QUANTITIES:');
  console.log(`  Envelopes: ${totalHH}`);
  console.log(`    • Day invite cards: ${dayHH}`);
  console.log(`    • Evening invite cards: ${eveningHH}`);
  console.log(`  Day menus: ${dayGuests}`);
  console.log(`  Table numbers: 9`);
  console.log(`  Camera game cards: 27 (3 × 9)`);
  console.log(`  Guestbook cards: 2`);
}

recalculate().catch(console.error);

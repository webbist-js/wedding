import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

async function findOverseas() {
  const overseasNames = [
    'Bart', 'Ben', 'Chris', 'Erik', 'Derrick', 'Paul', 'Dimi', 'Emily', 'James', 
    'Kellan', 'Mark', 'Pierre', 'Raul', 'Richard', 'Rosie', 'Francesco', 'Vlad'
  ];
  
  const query = `
    SELECT 
      g.id,
      g.name,
      ig.name as household,
      g.attendance_type,
      COUNT(*) OVER (PARTITION BY g.group_id) as household_size
    FROM guests g
    JOIN invite_groups ig ON g.group_id = ig.id
    WHERE ${overseasNames.map(n => `g.name LIKE '%${n}%'`).join(' OR ')}
    ORDER BY g.name
  `;
  
  const result = await client.execute(query);
  
  console.log('🌍 Overseas Guests Found:');
  console.log('');
  
  const dayGuests: any[] = [];
  const eveningGuests: any[] = [];
  const households = new Set();
  
  for (const row of result.rows) {
    const guest = row as any;
    console.log(`${guest.name} - ${guest.household} (${guest.attendance_type})`);
    
    if (guest.attendance_type === 'day') {
      dayGuests.push(guest);
    } else {
      eveningGuests.push(guest);
    }
    households.add(guest.household);
  }
  
  console.log('');
  console.log(`Day guests: ${dayGuests.length}`);
  console.log(`Evening guests: ${eveningGuests.length}`);
  console.log(`Households affected: ${households.size}`);
}

findOverseas().catch(console.error);

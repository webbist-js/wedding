import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

async function listOverseas() {
  const overseasHouseholds = [
    'Bart Sakowski', 'Rose Holt & Ben Newman', 'Ben Hooker',
    'Chris Bennett, Hayley Bennett & Theo', 'Chris Todd & Jen Todd',
    'Christopher & Erik Lauzon', 'Derrick & Paul', 'Dimitris Messinis',
    'Emily Cossey', 'Emily Roesler', 'Rosie Hackett & Francesco Lorusso',
    'Kellan Bolger', 'Mark Norman', 'Rosmary', 'Paula',
    'Pierre Burgy', 'Raul Balestra', 'Richard Nsama', 'Vlad Ocneanu'
  ];
  
  const placeholders = overseasHouseholds.map(() => '?').join(',');
  
  const result = await client.execute(`
    SELECT 
      ig.name as household,
      MAX(CASE WHEN g.attendance_type = 'day' THEN 1 ELSE 0 END) as has_day,
      MAX(CASE WHEN g.attendance_type = 'evening' THEN 1 ELSE 0 END) as has_evening,
      COUNT(*) as guest_count
    FROM invite_groups ig
    LEFT JOIN guests g ON g.group_id = ig.id
    WHERE ig.name IN (${placeholders})
    GROUP BY ig.id, ig.name
    ORDER BY ig.name
  `, overseasHouseholds);
  
  console.log('🌍 OVERSEAS HOUSEHOLDS (19 total)\n');
  
  let dayCount = 0, eveningCount = 0;
  
  result.rows.forEach((row, index) => {
    const r = row as any;
    const type = r.has_day ? (r.has_evening ? 'Day + Evening' : '☀️ Day') : '🌙 Evening';
    if (r.has_day) dayCount++;
    if (r.has_evening) eveningCount++;
    console.log(`${index + 1}. ${r.household} - ${type}`);
  });
  
  console.log('\n📊 Summary:');
  console.log(`Day event households: ${dayCount}`);
  console.log(`Evening event households: ${eveningCount}`);
}

listOverseas().catch(console.error);

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();

  console.log('--- Event 5 Info ---');
  const ev = await client.query(`SELECT id, current_round, status FROM events WHERE id = '5'`);
  console.log(ev.rows[0]);

  console.log('\n--- Recent Judge Scores ---');
  const scores = await client.query(`SELECT * FROM judge_scores WHERE event_id = '5' ORDER BY created_at DESC LIMIT 5`);
  console.log(scores.rows);

  console.log('\n--- Registrations with Scores ---');
  if (scores.rows.length > 0) {
    const regId = scores.rows[0].registration_id;
    const reg = await client.query(`SELECT id, full_name, status, round_number, car_category FROM registrations WHERE id = $1`, [regId]);
    console.log('Registration details for the scored user:', reg.rows[0]);
    
    // Check if round numbers match
    console.log(`Score round: ${scores.rows[0].round_number}, Reg round: ${reg.rows[0].round_number}`);
    
    if (scores.rows[0].round_number !== reg.rows[0].round_number) {
        console.log('MISMATCH! Score was given for a round different than registration round.');
    }
  } else {
    console.log('No scores found.');
  }
  
  console.log('\n--- Counts per Round ---');
  const rounds = await client.query(`SELECT round_number, count(*) FROM registrations WHERE event_id='5' GROUP BY round_number`);
  console.log(rounds.rows);

  client.release();
  await pool.end();
}
check().catch(console.error);

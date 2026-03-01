require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();

  // 1. Check gate1 columns in registrations
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'registrations'
    AND column_name IN ('gate1_status','gate1_notes','gate1_checked_at','gate1_officer_id','round_number')
    ORDER BY column_name
  `);
  console.log('✅ registrations columns:', cols.rows.map(r => r.column_name).join(', '));

  // 2. Check judge_scores table
  const js = await client.query(`SELECT COUNT(*) FROM judge_scores`);
  console.log('✅ judge_scores table exists, rows:', js.rows[0].count);

  // 3. Check entry_log table
  const el = await client.query(`SELECT COUNT(*) FROM entry_log`);
  console.log('✅ entry_log table exists, rows:', el.rows[0].count);

  // 4. Check events current_round
  const ev = await client.query(`SELECT id, name, current_round, status FROM events WHERE id = 5`);
  console.log('✅ Event 5:', ev.rows[0]);

  // 5. Round distribution
  const rounds = await client.query(`
    SELECT round_number, COUNT(*) as count FROM registrations
    WHERE event_id = 5 GROUP BY round_number ORDER BY round_number
  `);
  console.log('✅ Round distribution:', rounds.rows);

  client.release();
  await pool.end();
}
check().catch(console.error);

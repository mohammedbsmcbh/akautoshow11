require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  const queries = [
    `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gate1_status TEXT DEFAULT NULL`,
    `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gate1_notes TEXT DEFAULT NULL`,
    `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gate1_checked_at TIMESTAMPTZ DEFAULT NULL`,
    `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gate1_officer_id TEXT DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS judge_scores (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       event_id TEXT NOT NULL,
       round_number INTEGER NOT NULL,
       registration_id UUID NOT NULL,
       judge_id TEXT NOT NULL,
       score NUMERIC(4,2) NOT NULL CHECK (score >= 1 AND score <= 10),
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(event_id, round_number, registration_id, judge_id)
    )`,
    `CREATE TABLE IF NOT EXISTS entry_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       registration_id UUID NOT NULL,
       event_id TEXT NOT NULL,
       action TEXT NOT NULL,
       officer_id TEXT,
       recorded_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('OK:', q.slice(0, 70).replace(/\n/g, ' '));
    } catch (e) {
      console.error('ERR:', e.message);
    }
  }
  client.release();
  await pool.end();
  console.log('DONE');
}

run();

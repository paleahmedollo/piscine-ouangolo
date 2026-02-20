const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-eu-west-3.pooler.supabase.com',
  port: 5432,
  user: 'postgres.dqjmwgeohjmjjnvfzvyt',
  password: 'Ouangolo@2024',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connecte...');

  // Fix events table: add price and deposit_paid
  await client.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_paid DECIMAL(12,2) DEFAULT 0
  `);
  console.log('events: price + deposit_paid ajoutes OK');

  console.log('Done!');
  await client.end();
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

/**
 * Script de migration pour corriger les tables DB afin qu'elles correspondent aux modeles Sequelize
 * A executer UNE SEULE FOIS apres setupDb.js
 */
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
  console.log('Connecte - migration des tables...');

  // 1. Fix payrolls table: ajouter paid_by
  console.log('\n--- Fix payrolls ---');
  await client.query(`
    ALTER TABLE payrolls
    ADD COLUMN IF NOT EXISTS paid_by INT REFERENCES users(id)
  `);
  console.log('payrolls: paid_by ajoute OK');

  // 2. Fix expenses table: ajouter reference + payroll_id
  console.log('\n--- Fix expenses ---');
  await client.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS payroll_id INT REFERENCES payrolls(id)
  `);
  console.log('expenses: reference + payroll_id ajoutes OK');

  // 3. Fix incidents table: ajouter les nouvelles colonnes
  console.log('\n--- Fix incidents ---');
  await client.query(`
    ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS title VARCHAR(150),
    ADD COLUMN IF NOT EXISTS incident_date DATE,
    ADD COLUMN IF NOT EXISTS incident_time TIME,
    ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'piscine',
    ADD COLUMN IF NOT EXISTS persons_involved TEXT,
    ADD COLUMN IF NOT EXISTS actions_taken TEXT
  `);
  // Migrer 'type' vers 'title' si des donnees existent
  await client.query(`
    UPDATE incidents SET title = type WHERE title IS NULL AND type IS NOT NULL
  `);
  // Mettre une date par defaut pour les incidents existants
  await client.query(`
    UPDATE incidents SET incident_date = created_at::date WHERE incident_date IS NULL
  `);
  console.log('incidents: nouvelles colonnes ajoutees OK');

  // 4. Recreer la table receipts avec le bon schema
  console.log('\n--- Fix receipts ---');
  // D abord supprimer la vieille table (probablement vide)
  await client.query(`DROP TABLE IF EXISTS receipts CASCADE`);
  console.log('receipts: ancienne table supprimee');

  await client.query(`
    CREATE TABLE receipts (
      id SERIAL PRIMARY KEY,
      receipt_number VARCHAR(50) UNIQUE NOT NULL,
      cash_register_id INT NOT NULL REFERENCES cash_registers(id),
      module VARCHAR(20) NOT NULL,
      closure_date DATE NOT NULL,
      transactions_count INT DEFAULT 0,
      expected_amount DECIMAL(12,2) NOT NULL,
      actual_amount DECIMAL(12,2) NOT NULL,
      difference DECIMAL(12,2) NOT NULL,
      opening_amount DECIMAL(12,2) DEFAULT 0,
      cashier_id INT NOT NULL REFERENCES users(id),
      cashier_name VARCHAR(100) NOT NULL,
      cashier_role VARCHAR(50) NOT NULL,
      validator_id INT NOT NULL REFERENCES users(id),
      validator_name VARCHAR(100) NOT NULL,
      validation_date TIMESTAMP NOT NULL,
      notes TEXT,
      data_hash VARCHAR(64) NOT NULL,
      is_modified BOOLEAN DEFAULT FALSE,
      modification_date TIMESTAMP,
      modification_details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('receipts: nouvelle table creee OK');

  // 5. Verifier user_layouts table
  console.log('\n--- Verifier user_layouts ---');
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_layouts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      layout_name VARCHAR(100) NOT NULL,
      columns JSONB NOT NULL,
      filters JSONB,
      sort_by VARCHAR(50) DEFAULT 'date',
      sort_order VARCHAR(4) DEFAULT 'DESC',
      rows_per_page INT DEFAULT 50,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('user_layouts OK');

  console.log('\n✅ Migration terminee avec succes !');
  await client.end();
}

run().catch(e => {
  console.error('Erreur migration:', e.message);
  process.exit(1);
});

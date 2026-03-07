/**
 * SEED FILE - Piscine de Ouangolo
 * ================================
 * Ce fichier initialise les données de base dans Supabase.
 * À exécuter une seule fois après chaque déploiement ou reset de la base.
 *
 * UTILISATION :
 *   node seed.js
 *
 * PRÉREQUIS :
 *   - npm install pg bcryptjs dotenv
 *   - Fichier .env avec DATABASE_URL configuré
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : false
});

// ============================================================
// DONNÉES DE BASE
// ============================================================

const companies = [
  {
    name: 'Piscine de Ouangolo',
    code: 'OUANGOLO',
    address: 'Ouangolodougou, Côte d\'Ivoire',
    country: 'Côte d\'Ivoire',
    plan: 'basic',
    is_active: true,
    status: 'actif',
    modules: []
  }
];

const users = [
  // ── Comptes spéciaux (mot de passe fixe) ─────────────────
  { username: 'superadmin',             full_name: 'Super Administrateur',              role: 'superadmin', password: 'Gestix@2026',    is_active: true, company_ref: null },
  { username: 'paleadmin',              full_name: 'Pale Ahmed - Administrateur Général', role: 'admin',    password: 'PaleAdmin@2026', is_active: true, company_ref: 'OUANGOLO' },
  { username: 'palefranckpawele',       full_name: 'Pale Franck Pawele',                role: 'admin',      password: 'Franck@2026',   is_active: true, company_ref: null },

  // ── Comptes .pmdo (mot de passe pmdo@2026) ────────────────
  { username: 'admin.pmdo',             full_name: 'Administrateur',                    role: 'admin',             password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'ahmedpiscine.pmdo',      full_name: 'Ahmed Piscine',                     role: 'admin',             password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'haliman.pmdo',           full_name: 'Haliman',                           role: 'admin',             password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'directeur.pmdo',         full_name: 'Directeur',                         role: 'directeur',         password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'maire.pmdo',             full_name: 'Maire',                             role: 'maire',             password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'gerant.pmdo',            full_name: 'Gérant Principal',                  role: 'gerant',            password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'responsable.pmdo',       full_name: 'Responsable',                       role: 'responsable',       password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'maitrenageur.pmdo',      full_name: 'Maitre-Nageur',                     role: 'maitre_nageur',     password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'receptionniste.pmdo',    full_name: 'Receptionniste Hotel',              role: 'receptionniste',    password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'didier.yao.pmdo',        full_name: 'Yao Kouame Didier',                 role: 'maitre_nageur',     password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'fatoumata.traore.pmdo',  full_name: 'Traore Fatoumata Aminata',          role: 'serveuse',          password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'ibrahim.kone.pmdo',      full_name: 'Kone Ibrahim Souleymane',           role: 'serveur',           password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'sylvie.nguessan.pmdo',   full_name: 'N Guessan Ahou Sylvie',             role: 'receptionniste',    password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'mamadou.diallo.pmdo',    full_name: 'Diallo Mamadou Seydou',             role: 'gestionnaire_events', password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'bertrand.ouattara.pmdo', full_name: 'Ouattara Senan Bertrand',           role: 'gerant',            password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'fernand.kouassi.pmdo',   full_name: 'Kouassi Brou Fernand',              role: 'responsable',       password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'amelie.adjoua.pmdo',     full_name: 'Adjoua Amelie Boni',                role: 'responsable',       password: 'pmdo@2026', is_active: true, company_ref: null },
  { username: 'rosemarie.bamba.pmdo',   full_name: 'Bamba Adjehi Rose-Marie',           role: 'responsable',       password: 'pmdo@2026', is_active: true, company_ref: null },
];

// ============================================================
// FONCTIONS SEED
// ============================================================

async function seedCompanies(client) {
  console.log('\n📦 Insertion des entreprises...');
  const companyMap = {};

  for (const company of companies) {
    const existing = await client.query(
      'SELECT id FROM companies WHERE code = $1', [company.code]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⚠️  Déjà existante : ${company.name}`);
      companyMap[company.code] = existing.rows[0].id;
    } else {
      const result = await client.query(
        `INSERT INTO companies (name, code, address, country, plan, is_active, status, modules, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING id`,
        [company.name, company.code, company.address, company.country,
         company.plan, company.is_active, company.status, JSON.stringify(company.modules)]
      );
      companyMap[company.code] = result.rows[0].id;
      console.log(`  ✅ Créée : ${company.name}`);
    }
  }

  return companyMap;
}

async function seedUsers(client, companyMap) {
  console.log('\n👤 Insertion des utilisateurs...');

  for (const user of users) {
    const existing = await client.query(
      'SELECT id FROM users WHERE username = $1', [user.username]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⚠️  Déjà existant : ${user.username}`);
      continue;
    }

    const password_hash = await bcrypt.hash(user.password, 10);
    const company_id = user.company_ref ? companyMap[user.company_ref] || null : null;

    await client.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [user.username, password_hash, user.full_name, user.role, user.is_active, company_id]
    );

    console.log(`  ✅ Créé : ${user.username} → ${user.password}`);
  }
}

// ============================================================
// EXÉCUTION PRINCIPALE
// ============================================================

async function main() {
  console.log('🚀 Démarrage du seed - Piscine de Ouangolo');
  console.log('==========================================');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const companyMap = await seedCompanies(client);
    await seedUsers(client, companyMap);
    await client.query('COMMIT');

    console.log('\n==========================================');
    console.log('✅ Seed terminé avec succès !');
    console.log('\n📋 Récapitulatif des comptes :');
    console.log('─────────────────────────────────────────');
    console.log('  superadmin          → Gestix@2026');
    console.log('  paleadmin           → PaleAdmin@2026');
    console.log('  palefranckpawele    → Franck@2026');
    console.log('─────────────────────────────────────────');
    console.log('  Tous les .pmdo      → pmdo@2026');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erreur lors du seed :', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

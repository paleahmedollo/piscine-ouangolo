/**
 * Migration : ajout colonne is_test à la table companies
 * + marquage des entreprises de démonstration existantes
 *
 * Usage : node src/scripts/migrate_is_test.js
 */
require('dotenv').config();
const { sequelize } = require('../config/database');

const TEST_COMPANY_NAMES = [
  'Complexe Kone',
  'Dofoundahan',
  'Entreprise Zenab',
  'Kone Ali',
  'Olympe',
  'Ouattara Mohmed',
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK\n');

    // 0. Ajouter la colonne sa_permissions aux users si manquante (fix production)
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS sa_permissions JSONB DEFAULT NULL
    `);
    console.log('✅ Colonne sa_permissions (users) ajoutée (ou déjà présente)');

    // Garantir l'accès total pour superadmin
    await sequelize.query(
      `UPDATE users SET sa_permissions = NULL WHERE username = 'superadmin' AND role = 'super_admin'`
    );
    console.log('✅ Accès total restauré pour superadmin (sa_permissions = NULL)');

    // 1. Ajouter la colonne is_test si elle n'existe pas
    await sequelize.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Colonne is_test ajoutée (ou déjà présente)');

    // 2. Marquer les entreprises de démonstration
    const placeholders = TEST_COMPANY_NAMES.map((_, i) => `$${i + 1}`).join(', ');
    const [, meta] = await sequelize.query(
      `UPDATE companies SET is_test = true WHERE name IN (${placeholders})`,
      { bind: TEST_COMPANY_NAMES }
    );

    const updated = meta?.rowCount ?? '?';
    console.log(`✅ ${updated} entreprise(s) marquée(s) comme comptes test :`);
    TEST_COMPANY_NAMES.forEach(n => console.log(`   - ${n}`));

    // 3. Afficher l'état final
    const [rows] = await sequelize.query(
      `SELECT id, name, is_test FROM companies ORDER BY is_test DESC, name ASC`
    );
    console.log('\n--- État final des entreprises ---');
    rows.forEach(r => {
      const tag = r.is_test ? '[TEST]' : '[PROD]';
      console.log(`  ${tag} #${r.id} ${r.name}`);
    });

    console.log('\n✅ Migration terminée avec succès.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur migration :', err.message);
    process.exit(1);
  }
}

run();

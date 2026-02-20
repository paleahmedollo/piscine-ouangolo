require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

const comptes = [
  { username: 'maitrenageur',    full_name: 'Maître-Nageur',           role: 'maitre_nageur',       password: 'Nageur@2024' },
  { username: 'serveuse',        full_name: 'Serveuse Restaurant',     role: 'serveuse',            password: 'Serveur@2024' },
  { username: 'receptionniste',  full_name: 'Réceptionniste Hôtel',    role: 'receptionniste',      password: 'Hotel@2024' },
  { username: 'events',          full_name: 'Gestionnaire Événements', role: 'gestionnaire_events', password: 'Events@2024' },
  { username: 'maire',           full_name: 'Maire',                   role: 'maire',               password: 'Maire@2024' },
  { username: 'responsable',     full_name: 'Responsable',             role: 'responsable',         password: 'Resp@2024' },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à PostgreSQL\n');

    for (const u of comptes) {
      const hash = await bcrypt.hash(u.password, 10);
      await sequelize.query(
        `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (username) DO UPDATE SET password_hash = $2, is_active = true`,
        { bind: [u.username, hash, u.full_name, u.role] }
      );
      console.log('✅ ' + u.username + ' | ' + u.role + ' | mot de passe : ' + u.password);
    }

    console.log('\n🎉 Tous les comptes sont prêts !');
    process.exit(0);
  } catch(e) {
    console.error('❌ Erreur :', e.message);
    process.exit(1);
  }
}

run();

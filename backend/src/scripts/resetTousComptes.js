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
  { username: 'directeur',       password: 'Admin@2024' },
  { username: 'admin',           password: 'Admin@2024' },
  { username: 'AhmedPiscine',    password: 'Admin@2024' },
  { username: 'ahmedpiscine',    password: 'Admin@2024' },
  { username: 'gerant',          password: 'Admin@2024' },
  { username: 'maitrenageur',    password: 'Admin@2024' },
  { username: 'serveuse',        password: 'Admin@2024' },
  { username: 'receptionniste',  password: 'Admin@2024' },
  { username: 'events',          password: 'Admin@2024' },
  { username: 'maire',           password: 'Admin@2024' },
  { username: 'responsable',     password: 'Admin@2024' },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à PostgreSQL\n');

    for (const c of comptes) {
      const hash = await bcrypt.hash(c.password, 10);
      const [, meta] = await sequelize.query(
        `UPDATE users SET password_hash = $1, is_active = true WHERE username = $2`,
        { bind: [hash, c.username] }
      );
      if (meta.rowCount > 0) {
        console.log('✅ ' + c.username + ' → mot de passe : ' + c.password);
      } else {
        console.log('⚠️  ' + c.username + ' → compte non trouvé en base');
      }
    }

    console.log('\n📋 Vérification finale :');
    const [rows] = await sequelize.query(
      `SELECT username, full_name, role, is_active FROM users ORDER BY role`
    );
    rows.forEach(u => {
      console.log('  • ' + u.username + ' (' + u.role + ') - ' + (u.is_active ? 'Actif' : 'Inactif'));
    });

    process.exit(0);
  } catch(e) {
    console.error('❌ Erreur :', e.message);
    process.exit(1);
  }
}

run();

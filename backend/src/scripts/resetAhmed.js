require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function run() {
  try {
    await sequelize.authenticate();
    const hash = await bcrypt.hash('Admin@2024', 10);

    // Reset les deux variantes du compte
    await sequelize.query(
      `UPDATE users SET password_hash = $1, is_active = true WHERE username = $2`,
      { bind: [hash, 'AhmedPiscine'] }
    );
    await sequelize.query(
      `UPDATE users SET password_hash = $1, is_active = true WHERE username = $2`,
      { bind: [hash, 'ahmedpiscine'] }
    );

    const [rows] = await sequelize.query(
      `SELECT username, full_name, role, is_active FROM users WHERE LOWER(username) = 'ahmedpiscine'`
    );

    console.log('✅ Comptes Ahmed mis à jour :\n');
    rows.forEach(u => {
      console.log('  Username : ' + u.username);
      console.log('  Nom      : ' + u.full_name);
      console.log('  Rôle     : ' + u.role);
      console.log('  Actif    : ' + (u.is_active ? 'Oui' : 'Non'));
      console.log('  Password : Admin@2024');
      console.log('');
    });

    process.exit(0);
  } catch(e) {
    console.error('❌ Erreur :', e.message);
    process.exit(1);
  }
}

run();

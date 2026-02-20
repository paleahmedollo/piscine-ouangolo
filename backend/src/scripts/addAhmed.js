const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createUser() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await client.connect();

  const username = 'ahmedpiscine';
  const password = 'Admin@2024';
  const hash = await bcrypt.hash(password, 10);

  await client.query(
    `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
    [username, hash, 'Ahmed Piscine', 'admin']
  );

  console.log('✅ Compte créé avec succès !');
  console.log('   Username: ' + username);
  console.log('   Mot de passe: ' + password);
  console.log('   Rôle: admin (accès complet)');

  await client.end();
}

createUser().catch(err => console.error('Erreur:', err.message));

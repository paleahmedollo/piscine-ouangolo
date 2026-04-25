/**
 * Reset passwords for existing users
 * Usage: DATABASE_URL="..." node reset_passwords.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false } : false
});

const passwordResets = [
  { username: 'superadmin',  password: 'Gestix@2026' },
  { username: 'paleadmin',   password: 'PaleAdmin@2026' },
  { username: 'admin.pmdo',  password: 'pmdo@2026' },
  { username: 'gerant.pmdo', password: 'pmdo@2026' },
  { username: 'directeur',   password: 'Admin@2024' },
];

async function main() {
  const client = await pool.connect();
  console.log('🔑 Réinitialisation des mots de passe...\n');
  try {
    for (const { username, password } of passwordResets) {
      const hash = await bcrypt.hash(password, 10);
      const result = await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2 RETURNING id, username',
        [hash, username]
      );
      if (result.rows.length > 0) {
        console.log(`  ✅ ${username} → ${password}`);
      } else {
        console.log(`  ⚠️  Non trouvé : ${username}`);
      }
    }
    console.log('\n✅ Terminé !');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });

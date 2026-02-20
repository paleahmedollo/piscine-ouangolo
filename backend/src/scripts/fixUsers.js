const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixUsers() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL\n');

    // Vérifier les utilisateurs existants
    console.log('👥 Utilisateurs actuels:');
    const users = await client.query('SELECT id, username, full_name, role, is_active FROM users');
    users.rows.forEach(u => {
      console.log(`  • ID ${u.id}: ${u.username} (${u.role}) - ${u.is_active ? 'Actif' : 'Inactif'}`);
    });

    // Créer les nouveaux mots de passe hashés
    const passwords = {
      'directeur': 'Admin@2024',
      'admin': 'admin123',
      'gerant': 'gerant123'
    };

    console.log('\n🔄 Mise à jour des mots de passe...');

    for (const [username, password] of Object.entries(passwords)) {
      const hash = await bcrypt.hash(password, 10);
      const result = await client.query(
        'UPDATE users SET password_hash = $1, is_active = true WHERE username = $2 RETURNING username',
        [hash, username]
      );
      if (result.rowCount > 0) {
        console.log(`  ✅ ${username} → mot de passe: ${password}`);
      }
    }

    // Vérifier après mise à jour
    console.log('\n📋 Vérification finale:');
    const updatedUsers = await client.query('SELECT username, is_active FROM users');
    updatedUsers.rows.forEach(u => {
      console.log(`  • ${u.username}: ${u.is_active ? '✅ Actif' : '❌ Inactif'}`);
    });

    console.log('\n🎉 Terminé ! Essayez de vous connecter.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

fixUsers();

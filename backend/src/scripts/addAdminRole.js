require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
require('../models');
const { User } = require('../models');

const addAdminRole = async () => {
  try {
    console.log('Mise a jour de la base de donnees...');

    // Connexion a la base
    await sequelize.authenticate();
    console.log('Connexion base de donnees OK');

    // Modifier l'ENUM pour ajouter 'admin'
    console.log('Ajout du role admin a la table users...');
    await sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'responsable', 'directeur', 'maire') NOT NULL
    `);
    console.log('Role admin ajoute avec succes');

    // Verifier si un admin existe deja
    const [existingAdmin] = await sequelize.query(
      `SELECT * FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (existingAdmin && existingAdmin.length > 0) {
      console.log('');
      console.log('========================================');
      console.log('Un compte admin existe deja!');
      console.log('========================================');
      console.log('   Username: ' + existingAdmin[0].username);
      console.log('========================================');
      process.exit(0);
    }

    // Creer le compte admin via requete SQL directe
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Ahmed@2024Piscine', 10);

    await sequelize.query(`
      INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES ('AhmedPiscine', '${hashedPassword}', 'Ahmed - Administrateur', 'admin', true, NOW(), NOW())
    `);

    console.log('');
    console.log('========================================');
    console.log('Compte administrateur cree avec succes!');
    console.log('========================================');
    console.log('');
    console.log('   Username: AhmedPiscine');
    console.log('   Password: Ahmed@2024Piscine');
    console.log('   Role: Administrateur (acces complet)');
    console.log('');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

addAdminRole();

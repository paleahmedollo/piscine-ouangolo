require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
require('../models');
const { User } = require('../models');

const createAdmin = async () => {
  try {
    console.log('Creation du compte administrateur...');

    // Connexion a la base
    await sequelize.authenticate();
    console.log('Connexion base de donnees OK');

    // Verifier si un admin existe deja
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });

    if (existingAdmin) {
      console.log('');
      console.log('========================================');
      console.log('Un compte admin existe deja!');
      console.log('========================================');
      console.log('');
      console.log('   Username: ' + existingAdmin.username);
      console.log('   Nom: ' + existingAdmin.full_name);
      console.log('');
      console.log('Pour reinitialiser le mot de passe, utilisez:');
      console.log('   node resetAdminPassword.js');
      console.log('');
      console.log('========================================');
      process.exit(0);
    }

    // Creer le compte admin (le mot de passe sera hache par le hook)
    await User.create({
      username: 'AhmedPiscine',
      password_hash: 'Ahmed@2024Piscine',
      full_name: 'Ahmed - Administrateur',
      role: 'admin',
      is_active: true
    });

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

createAdmin();

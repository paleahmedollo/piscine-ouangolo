require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
require('../models');
const { User } = require('../models');

const resetAdmin = async () => {
  try {
    console.log('🔄 Reinitialisation de l\'utilisateur admin...');

    // Connexion à la base
    await sequelize.authenticate();
    console.log('✅ Connexion base de donnees OK');

    // Supprimer l'ancien admin
    const deleted = await User.destroy({ where: { username: 'directeur' } });
    if (deleted) {
      console.log('✅ Ancien utilisateur supprime');
    }

    // Créer le nouvel admin (le mot de passe sera haché par le hook)
    await User.create({
      username: 'directeur',
      password_hash: 'Admin@2024',
      full_name: 'Directeur Principal',
      role: 'directeur',
      is_active: true
    });

    console.log('');
    console.log('========================================');
    console.log('✅ Utilisateur admin recree avec succes!');
    console.log('========================================');
    console.log('');
    console.log('   Username: directeur');
    console.log('   Password: Admin@2024');
    console.log('');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

resetAdmin();

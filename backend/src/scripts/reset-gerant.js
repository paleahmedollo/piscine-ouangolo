/**
 * Script pour creer ou reinitialiser le compte gerant
 * Usage: node src/scripts/reset-gerant.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

const resetGerant = async () => {
  try {
    console.log('Connexion a la base de donnees...');
    await sequelize.authenticate();
    console.log('✅ Connecte');

    // Sync models
    await sequelize.sync();

    // Chercher un compte gerant existant
    let gerant = await User.findOne({ where: { username: 'gerant' } });

    const password = 'gerant123';
    const hashedPassword = await bcrypt.hash(password, 10);

    if (gerant) {
      // Mettre a jour le mot de passe directement sans passer par le hook
      await User.update(
        { password_hash: hashedPassword, role: 'gerant', is_active: true },
        { where: { username: 'gerant' }, individualHooks: false }
      );
      console.log('✅ Compte gerant mis a jour');
    } else {
      // Creer un nouveau compte en inserant directement le hash
      await User.create({
        username: 'gerant',
        password_hash: hashedPassword,
        full_name: 'Gérant Principal',
        role: 'gerant',
        is_active: true
      }, { hooks: false }); // Desactiver les hooks pour eviter le double hashage
      console.log('✅ Nouveau compte gerant cree');
    }

    console.log('');
    console.log('========================================');
    console.log('  COMPTE GERANT');
    console.log('========================================');
    console.log('  Username: gerant');
    console.log('  Password: gerant123');
    console.log('========================================');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

resetGerant();

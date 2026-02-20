require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');

const updateRoomType = async () => {
  try {
    console.log('Mise a jour de la colonne type des chambres...');

    await sequelize.authenticate();
    console.log('Connexion base de donnees OK');

    // Modifier la colonne type de ENUM a VARCHAR
    await sequelize.query(`
      ALTER TABLE rooms
      MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'Simple'
    `);

    // Mettre à jour les valeurs existantes en capitalisant
    await sequelize.query(`UPDATE rooms SET type = 'Simple' WHERE type = 'simple'`);
    await sequelize.query(`UPDATE rooms SET type = 'Double' WHERE type = 'double'`);
    await sequelize.query(`UPDATE rooms SET type = 'Suite' WHERE type = 'suite'`);

    console.log('');
    console.log('========================================');
    console.log('Mise a jour terminee!');
    console.log('========================================');
    console.log('Types de chambres disponibles:');
    console.log('  - Simple');
    console.log('  - Double');
    console.log('  - Suite');
    console.log('  - VIP');
    console.log('  - Familiale');
    console.log('  - (ou tout autre type personnalise)');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

updateRoomType();

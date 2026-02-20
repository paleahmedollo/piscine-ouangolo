require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

// Import all models to ensure they're registered
require('../models');
const { User, Room, MenuItem } = require('../models');

const syncDatabase = async () => {
  try {
    console.log('🔄 Synchronizing database...');

    // Sync all models
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database synchronized');

    // Create default admin user if not exists
    const adminExists = await User.findOne({ where: { username: 'directeur' } });
    if (!adminExists) {
      // Le mot de passe sera haché automatiquement par le hook beforeCreate
      await User.create({
        username: 'directeur',
        password_hash: 'Admin@2024',
        full_name: 'Directeur Principal',
        role: 'directeur',
        is_active: true
      });
      console.log('✅ Default admin user created (username: directeur, password: Admin@2024)');
    }

    // Create default rooms if not exist
    const roomsCount = await Room.count();
    if (roomsCount === 0) {
      await Room.bulkCreate([
        { number: '101', type: 'simple', capacity: 1, price_per_night: 25000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true } },
        { number: '102', type: 'simple', capacity: 1, price_per_night: 25000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true } },
        { number: '103', type: 'double', capacity: 2, price_per_night: 40000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true, minibar: true } },
        { number: '104', type: 'double', capacity: 2, price_per_night: 40000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true, minibar: true } },
        { number: '105', type: 'double', capacity: 2, price_per_night: 40000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true, minibar: true } },
        { number: '201', type: 'suite', capacity: 4, price_per_night: 75000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true, minibar: true, jacuzzi: true } },
        { number: '202', type: 'suite', capacity: 4, price_per_night: 75000, status: 'disponible', amenities: { wifi: true, climatisation: true, tv: true, minibar: true, jacuzzi: true } }
      ]);
      console.log('✅ Default rooms created');
    }

    // Create default menu items if not exist
    const menuCount = await MenuItem.count();
    if (menuCount === 0) {
      await MenuItem.bulkCreate([
        { name: 'Salade Verte', category: 'entree', price: 3500, description: 'Salade fraîche de saison', is_available: true },
        { name: 'Soupe du jour', category: 'entree', price: 2500, description: 'Soupe traditionnelle', is_available: true },
        { name: 'Poulet braisé', category: 'plat', price: 8500, description: 'Poulet braisé avec accompagnement', is_available: true },
        { name: 'Poisson grillé', category: 'plat', price: 9500, description: 'Poisson frais grillé', is_available: true },
        { name: 'Riz sauce arachide', category: 'plat', price: 5500, description: 'Plat traditionnel', is_available: true },
        { name: 'Fruit de saison', category: 'dessert', price: 2000, description: 'Assortiment de fruits frais', is_available: true },
        { name: 'Gâteau maison', category: 'dessert', price: 3000, description: 'Gâteau du chef', is_available: true },
        { name: 'Coca-Cola', category: 'boisson', price: 1000, description: 'Bouteille 33cl', is_available: true },
        { name: 'Fanta', category: 'boisson', price: 1000, description: 'Bouteille 33cl', is_available: true },
        { name: 'Eau minérale', category: 'boisson', price: 500, description: 'Bouteille 50cl', is_available: true },
        { name: 'Bière locale', category: 'boisson', price: 1500, description: 'Bouteille 65cl', is_available: true },
        { name: 'Jus naturel', category: 'boisson', price: 2000, description: 'Jus de fruits frais', is_available: true },
        { name: 'Sandwich', category: 'snack', price: 3500, description: 'Sandwich garni', is_available: true },
        { name: 'Frites', category: 'snack', price: 2500, description: 'Portion de frites', is_available: true }
      ]);
      console.log('✅ Default menu items created');
    }

    console.log('🎉 Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync error:', error);
    process.exit(1);
  }
};

syncDatabase();

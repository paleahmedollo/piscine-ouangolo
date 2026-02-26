/**
 * Script de données de simulation — Gestix / Piscine de Ouangolo
 * Ajoute des données exemples pour tous les modules :
 *   - Prix piscine (price_settings)
 *   - Types lavage auto (vehicle_types)
 *   - Types pressing (pressing_types)
 *   - Produits supérette + maquis + dépôt (products)
 *   - Clients dépôt (depot_clients)
 *   - Plats restaurant (menu_items)
 *   - Chambres hôtel (rooms)
 *
 * Usage : node seed_data.js
 * Usage (forcer remplacement) : node seed_data.js --force
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');

const force = process.argv.includes('--force');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function upsertAll(tableName, rows, uniqueKey, label) {
  let inserted = 0, skipped = 0;
  for (const row of rows) {
    const val = row[uniqueKey];
    const [existing] = await sequelize.query(
      `SELECT id FROM "${tableName}" WHERE "${uniqueKey}" = :val LIMIT 1`,
      { replacements: { val } }
    );
    if (existing.length > 0 && !force) {
      skipped++;
    } else if (existing.length > 0 && force) {
      const sets = Object.keys(row).filter(k => k !== 'id').map(k => `"${k}" = :${k}`).join(', ');
      await sequelize.query(
        `UPDATE "${tableName}" SET ${sets}, updated_at = NOW() WHERE "${uniqueKey}" = :val`,
        { replacements: { ...row, val } }
      );
      inserted++;
    } else {
      const rowWithTs = { ...row };
      const cols = [...Object.keys(rowWithTs), 'created_at', 'updated_at'].map(k => `"${k}"`).join(', ');
      const vals = [...Object.keys(rowWithTs).map(k => `:${k}`), 'NOW()', 'NOW()'].join(', ');
      await sequelize.query(
        `INSERT INTO "${tableName}" (${cols}) VALUES (${vals})`,
        { replacements: rowWithTs }
      );
      inserted++;
    }
  }
  console.log(`  ✅ ${label}: ${inserted} insérés/mis à jour, ${skipped} déjà existants`);
}

// ─────────────────────────────────────────────────────────────
// 1. PISCINE — price_settings
// ─────────────────────────────────────────────────────────────
async function seedPiscine() {
  console.log('\n🏊 Prix Piscine...');
  const settings = [
    { key: 'ticket_adulte',        value: 2000, label: 'Ticket adulte (entrée piscine)' },
    { key: 'ticket_enfant',        value: 1000, label: 'Ticket enfant (entrée piscine)' },
    { key: 'abonnement_mensuel',   value: 25000,  label: 'Abonnement mensuel piscine' },
    { key: 'abonnement_trimestriel', value: 60000, label: 'Abonnement trimestriel piscine' },
    { key: 'abonnement_annuel',    value: 200000, label: 'Abonnement annuel piscine' },
  ];
  for (const s of settings) {
    await sequelize.query(
      `INSERT INTO price_settings (key, value, label, updated_at)
       VALUES (:key, :value, :label, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label, updated_at = NOW()`,
      { replacements: s }
    );
  }
  console.log(`  ✅ ${settings.length} prix piscine configurés`);
}

// ─────────────────────────────────────────────────────────────
// 2. LAVAGE AUTO — vehicle_types
// ─────────────────────────────────────────────────────────────
async function seedLavageAuto() {
  console.log('\n🚗 Types Lavage Auto...');
  const types = [
    { name: 'Moto / Vélo',           price: 500  },
    { name: 'Voiture petite berline', price: 1500 },
    { name: 'Voiture standard',       price: 2000 },
    { name: '4x4 / SUV',              price: 3000 },
    { name: 'Camionnette / Pick-up',  price: 3500 },
    { name: 'Minibus / Camion léger', price: 5000 },
    { name: 'Lavage complet (intérieur + extérieur)', price: 3500 },
    { name: 'Nettoyage siège unique', price: 500  },
  ];
  await upsertAll('vehicle_types', types.map(t => ({ ...t, is_active: true })), 'name', 'Types lavage auto');
}

// ─────────────────────────────────────────────────────────────
// 3. PRESSING — pressing_types
// ─────────────────────────────────────────────────────────────
async function seedPressing() {
  console.log('\n👕 Types Pressing...');
  const types = [
    { name: 'T-Shirt / Maillot',          price: 300  },
    { name: 'Chemise',                     price: 500  },
    { name: 'Pantalon',                    price: 500  },
    { name: 'Jupe',                        price: 500  },
    { name: 'Robe simple',                 price: 1000 },
    { name: 'Robe de soirée',              price: 2000 },
    { name: 'Veste / Blazer',              price: 1500 },
    { name: 'Costume complet (2 pièces)',  price: 2500 },
    { name: 'Habit traditionnel',          price: 2000 },
    { name: 'Boubou grand',                price: 2500 },
    { name: 'Nettoyage à sec — standard', price: 2000 },
    { name: 'Couverture / Drap',           price: 1500 },
    { name: 'Rideau (le mètre)',           price: 1000 },
    { name: 'Repassage seul',              price: 300  },
    { name: 'Lavage + Repassage',          price: 800  },
  ];
  await upsertAll('pressing_types', types.map(t => ({ ...t, is_active: true })), 'name', 'Types pressing');
}

// ─────────────────────────────────────────────────────────────
// 4. SUPÉRETTE — products (service_type='superette')
// ─────────────────────────────────────────────────────────────
async function seedSuperette() {
  console.log('\n🛒 Produits Supérette...');
  const products = [
    // Boissons
    { name: 'Eau minérale 0,5L',     category: 'Boissons',         service_type: 'superette', buy_price: 200,  sell_price: 350,  unit: 'bouteille', current_stock: 48, min_stock: 12 },
    { name: 'Eau minérale 1,5L',     category: 'Boissons',         service_type: 'superette', buy_price: 350,  sell_price: 500,  unit: 'bouteille', current_stock: 36, min_stock: 10 },
    { name: 'Coca-Cola 33cl',        category: 'Boissons',         service_type: 'superette', buy_price: 400,  sell_price: 600,  unit: 'canette',   current_stock: 24, min_stock: 6  },
    { name: 'Fanta Orange 33cl',     category: 'Boissons',         service_type: 'superette', buy_price: 400,  sell_price: 600,  unit: 'canette',   current_stock: 24, min_stock: 6  },
    { name: 'Jus de fruit 1L',       category: 'Boissons',         service_type: 'superette', buy_price: 600,  sell_price: 900,  unit: 'litre',     current_stock: 20, min_stock: 5  },
    { name: 'Lait concentré sucré',  category: 'Épicerie',         service_type: 'superette', buy_price: 450,  sell_price: 650,  unit: 'boite',     current_stock: 30, min_stock: 10 },
    // Épicerie
    { name: 'Riz parfumé (kg)',       category: 'Épicerie',         service_type: 'superette', buy_price: 400,  sell_price: 600,  unit: 'kg',        current_stock: 50, min_stock: 10 },
    { name: 'Huile végétale 1L',     category: 'Épicerie',         service_type: 'superette', buy_price: 1000, sell_price: 1500, unit: 'litre',     current_stock: 20, min_stock: 5  },
    { name: 'Sucre (kg)',            category: 'Épicerie',         service_type: 'superette', buy_price: 450,  sell_price: 650,  unit: 'kg',        current_stock: 25, min_stock: 5  },
    { name: 'Sel (kg)',              category: 'Épicerie',         service_type: 'superette', buy_price: 150,  sell_price: 250,  unit: 'kg',        current_stock: 10, min_stock: 3  },
    { name: 'Pâtes alimentaires',    category: 'Épicerie',         service_type: 'superette', buy_price: 200,  sell_price: 350,  unit: 'paquet',    current_stock: 30, min_stock: 8  },
    { name: 'Tomate concentrée',     category: 'Épicerie',         service_type: 'superette', buy_price: 300,  sell_price: 500,  unit: 'boite',     current_stock: 24, min_stock: 6  },
    { name: 'Sardines en conserve',  category: 'Conserves',        service_type: 'superette', buy_price: 600,  sell_price: 900,  unit: 'boite',     current_stock: 18, min_stock: 6  },
    { name: 'Bœuf en conserve',      category: 'Conserves',        service_type: 'superette', buy_price: 900,  sell_price: 1300, unit: 'boite',     current_stock: 12, min_stock: 4  },
    // Produits ménagers
    { name: 'Savon de ménage',       category: 'Hygiène & Ménage', service_type: 'superette', buy_price: 200,  sell_price: 350,  unit: 'barre',     current_stock: 40, min_stock: 10 },
    { name: 'Lessive (kg)',          category: 'Hygiène & Ménage', service_type: 'superette', buy_price: 700,  sell_price: 1000, unit: 'kg',        current_stock: 15, min_stock: 4  },
    { name: 'Eau de Javel 1L',       category: 'Hygiène & Ménage', service_type: 'superette', buy_price: 500,  sell_price: 750,  unit: 'litre',     current_stock: 12, min_stock: 4  },
    { name: 'Papier hygiénique',     category: 'Hygiène & Ménage', service_type: 'superette', buy_price: 300,  sell_price: 500,  unit: 'rouleau',   current_stock: 30, min_stock: 8  },
    // Snacks
    { name: 'Biscuits (paquet)',     category: 'Snacks',           service_type: 'superette', buy_price: 200,  sell_price: 350,  unit: 'paquet',    current_stock: 20, min_stock: 5  },
    { name: 'Chips (sachet)',        category: 'Snacks',           service_type: 'superette', buy_price: 150,  sell_price: 250,  unit: 'sachet',    current_stock: 24, min_stock: 6  },
  ];
  await upsertAll('products', products, 'name', 'Produits supérette');
}

// ─────────────────────────────────────────────────────────────
// 5. MAQUIS / BAR — products (service_type='maquis')
// ─────────────────────────────────────────────────────────────
async function seedMaquis() {
  console.log('\n🍺 Produits Maquis / Bar...');
  const products = [
    // Boissons
    { name: 'Bière Castel 65cl',       category: 'Bières',   service_type: 'maquis', buy_price: 600,  sell_price: 1000, unit: 'bouteille', current_stock: 48, min_stock: 12 },
    { name: 'Bière Solibra 65cl',      category: 'Bières',   service_type: 'maquis', buy_price: 600,  sell_price: 1000, unit: 'bouteille', current_stock: 48, min_stock: 12 },
    { name: 'Bière Flag 33cl',         category: 'Bières',   service_type: 'maquis', buy_price: 400,  sell_price: 700,  unit: 'bouteille', current_stock: 36, min_stock: 10 },
    { name: 'Bière Heineken 33cl',     category: 'Bières',   service_type: 'maquis', buy_price: 700,  sell_price: 1200, unit: 'bouteille', current_stock: 24, min_stock: 6  },
    { name: 'Eau minérale 0,5L',       category: 'Softs',    service_type: 'maquis', buy_price: 200,  sell_price: 500,  unit: 'bouteille', current_stock: 36, min_stock: 10 },
    { name: 'Coca-Cola 33cl',          category: 'Softs',    service_type: 'maquis', buy_price: 400,  sell_price: 700,  unit: 'bouteille', current_stock: 30, min_stock: 8  },
    { name: 'Fanta Orange 33cl',       category: 'Softs',    service_type: 'maquis', buy_price: 400,  sell_price: 700,  unit: 'bouteille', current_stock: 30, min_stock: 8  },
    { name: 'Sprite 33cl',             category: 'Softs',    service_type: 'maquis', buy_price: 400,  sell_price: 700,  unit: 'bouteille', current_stock: 24, min_stock: 6  },
    { name: 'Jus de bissap maison',    category: 'Softs',    service_type: 'maquis', buy_price: 100,  sell_price: 500,  unit: 'verre',     current_stock: 20, min_stock: 5  },
    { name: 'Gnamakoudji (gingembre)', category: 'Softs',    service_type: 'maquis', buy_price: 100,  sell_price: 500,  unit: 'verre',     current_stock: 20, min_stock: 5  },
    { name: 'Vin rouge (verre)',        category: 'Vins',    service_type: 'maquis', buy_price: 400,  sell_price: 1000, unit: 'verre',     current_stock: 10, min_stock: 3  },
    { name: 'Pastis / Whisky (verre)', category: 'Alcools',  service_type: 'maquis', buy_price: 500,  sell_price: 1500, unit: 'verre',     current_stock: 10, min_stock: 3  },
    // Plats
    { name: 'Attiéké Poisson braisé', category: 'Plats',     service_type: 'maquis', buy_price: 800,  sell_price: 2000, unit: 'portion',   current_stock: 0,  min_stock: 0  },
    { name: 'Riz sauce graine',        category: 'Plats',    service_type: 'maquis', buy_price: 600,  sell_price: 1500, unit: 'portion',   current_stock: 0,  min_stock: 0  },
    { name: 'Alloco (banane frite)',    category: 'Plats',    service_type: 'maquis', buy_price: 200,  sell_price: 500,  unit: 'portion',   current_stock: 0,  min_stock: 0  },
    { name: 'Brochettes de bœuf',      category: 'Grillades', service_type: 'maquis', buy_price: 500, sell_price: 1500, unit: 'portion',   current_stock: 0,  min_stock: 0  },
    { name: 'Poulet braisé demi',      category: 'Grillades', service_type: 'maquis', buy_price: 2000, sell_price: 4000, unit: 'portion',  current_stock: 0,  min_stock: 0  },
    { name: 'Garba (attiéké+thon)',    category: 'Plats',     service_type: 'maquis', buy_price: 400,  sell_price: 1000, unit: 'portion',  current_stock: 0,  min_stock: 0  },
    { name: 'Foutou banane sauce',     category: 'Plats',     service_type: 'maquis', buy_price: 700,  sell_price: 1500, unit: 'portion',  current_stock: 0,  min_stock: 0  },
    { name: 'Omelette simple',         category: 'Plats',     service_type: 'maquis', buy_price: 300,  sell_price: 700,  unit: 'portion',  current_stock: 0,  min_stock: 0  },
  ];
  await upsertAll('products', products, 'name', 'Produits maquis/bar');
}

// ─────────────────────────────────────────────────────────────
// 6. DÉPÔT — products (service_type='depot') + depot_clients
// ─────────────────────────────────────────────────────────────
async function seedDepot() {
  console.log('\n📦 Produits Dépôt (vente en gros)...');
  const products = [
    { name: 'Casier bière Castel 65cl (12 btl)',  category: 'Bières',    service_type: 'depot', buy_price: 6500,  sell_price: 8000,  unit: 'casier',   current_stock: 20, min_stock: 5  },
    { name: 'Casier bière Solibra 65cl (12 btl)', category: 'Bières',    service_type: 'depot', buy_price: 6500,  sell_price: 8000,  unit: 'casier',   current_stock: 20, min_stock: 5  },
    { name: 'Casier Flag 33cl (24 btl)',           category: 'Bières',    service_type: 'depot', buy_price: 7000,  sell_price: 9000,  unit: 'casier',   current_stock: 15, min_stock: 4  },
    { name: 'Casier Coca-Cola 33cl (24 btl)',      category: 'Softs',     service_type: 'depot', buy_price: 7500,  sell_price: 10000, unit: 'casier',   current_stock: 10, min_stock: 3  },
    { name: 'Casier Fanta 33cl (24 btl)',          category: 'Softs',     service_type: 'depot', buy_price: 7500,  sell_price: 10000, unit: 'casier',   current_stock: 10, min_stock: 3  },
    { name: 'Pack eau minérale 0,5L (24 btl)',     category: 'Eau',       service_type: 'depot', buy_price: 3500,  sell_price: 5000,  unit: 'carton',   current_stock: 25, min_stock: 8  },
    { name: 'Pack eau minérale 1,5L (12 btl)',     category: 'Eau',       service_type: 'depot', buy_price: 3000,  sell_price: 4500,  unit: 'carton',   current_stock: 20, min_stock: 6  },
    { name: 'Carton jus de fruit 1L (12 btl)',     category: 'Jus',       service_type: 'depot', buy_price: 5500,  sell_price: 8000,  unit: 'carton',   current_stock: 12, min_stock: 4  },
    { name: 'Sac riz 50kg',                        category: 'Alimentation', service_type: 'depot', buy_price: 18000, sell_price: 22000, unit: 'sac',   current_stock: 10, min_stock: 2  },
    { name: 'Bidon huile végétale 20L',            category: 'Alimentation', service_type: 'depot', buy_price: 18000, sell_price: 23000, unit: 'bidon', current_stock: 8,  min_stock: 2  },
    { name: 'Carton savon de ménage (72 barres)',  category: 'Ménage',    service_type: 'depot', buy_price: 9000,  sell_price: 12000, unit: 'carton',   current_stock: 5,  min_stock: 2  },
  ];
  await upsertAll('products', products, 'name', 'Produits dépôt');

  console.log('\n🤝 Clients Dépôt...');
  const clients = [
    { name: 'Bar Chez Maman Adjoua',  phone: '0701234567', address: 'Quartier Commerce, Ouangolodougou', credit_balance: 0, is_active: true },
    { name: 'Maquis La Détente',      phone: '0770123456', address: 'Centre-ville, Ouangolodougou',      credit_balance: 0, is_active: true },
    { name: 'Restaurant Le Bivouac',  phone: '0585432100', address: 'Route de Korhogo, Ouangolodougou', credit_balance: 0, is_active: true },
    { name: 'Boutique Modou',         phone: '0787654321', address: 'Marché central, Ouangolodougou',   credit_balance: 0, is_active: true },
    { name: 'Epicerie du Carrefour',  phone: '0707654321', address: 'Carrefour principal, Ouangolodougou', credit_balance: 0, is_active: true },
  ];
  await upsertAll('depot_clients', clients, 'name', 'Clients dépôt');
}

// ─────────────────────────────────────────────────────────────
// 7. RESTAURANT — menu_items
// ─────────────────────────────────────────────────────────────
async function seedRestaurant() {
  console.log('\n🍽️  Plats Restaurant...');

  // Vérifier si des plats existent déjà
  const [existing] = await sequelize.query(`SELECT COUNT(*) as cnt FROM menu_items`);
  const count = parseInt(existing[0].cnt);
  if (count > 0 && !force) {
    console.log(`  ℹ️  ${count} plat(s) déjà présents — ignorés (utiliser --force pour réinitialiser)`);
    return;
  }

  const items = [
    // Entrées
    { name: 'Salade verte',           category: 'Entrées',   price: 1000, is_available: true },
    { name: 'Salade tomates-oignons', category: 'Entrées',   price: 1000, is_available: true },
    { name: 'Soupe de légumes',       category: 'Entrées',   price: 1500, is_available: true },
    // Plats principaux
    { name: 'Riz sauté au poulet',    category: 'Plats',     price: 3500, is_available: true },
    { name: 'Riz sauce tomate',       category: 'Plats',     price: 2500, is_available: true },
    { name: 'Riz sauce graine',       category: 'Plats',     price: 3000, is_available: true },
    { name: 'Attiéké poisson braisé', category: 'Plats',     price: 3000, is_available: true },
    { name: 'Attiéké poulet braisé',  category: 'Plats',     price: 3500, is_available: true },
    { name: 'Foutou banane arachide', category: 'Plats',     price: 2500, is_available: true },
    { name: 'Pâtes à la bolognaise',  category: 'Plats',     price: 3000, is_available: true },
    { name: 'Poulet rôti (demi)',      category: 'Grillades', price: 5000, is_available: true },
    { name: 'Brochettes de bœuf',     category: 'Grillades', price: 3000, is_available: true },
    { name: 'Poisson entier grillé',  category: 'Grillades', price: 4000, is_available: true },
    // Desserts
    { name: 'Salade de fruits frais', category: 'Desserts',  price: 1500, is_available: true },
    { name: 'Glace (2 boules)',        category: 'Desserts',  price: 1000, is_available: true },
    { name: 'Cake maison',             category: 'Desserts',  price: 1000, is_available: true },
    // Boissons
    { name: 'Eau minérale 0,5L',      category: 'Boissons',  price: 500,  is_available: true },
    { name: 'Jus de fruits pressés',  category: 'Boissons',  price: 1500, is_available: true },
    { name: 'Coca-Cola 33cl',         category: 'Boissons',  price: 700,  is_available: true },
    { name: 'Café / Thé',             category: 'Boissons',  price: 500,  is_available: true },
  ];

  for (const item of items) {
    const [existing2] = await sequelize.query(
      `SELECT id FROM menu_items WHERE name = :name LIMIT 1`,
      { replacements: { name: item.name } }
    );
    if (existing2.length === 0 || force) {
      if (existing2.length > 0 && force) {
        await sequelize.query(
          `UPDATE menu_items SET category = :category, price = :price, is_available = :is_available WHERE name = :name`,
          { replacements: item }
        );
      } else {
        await sequelize.query(
          `INSERT INTO menu_items (name, category, price, is_available, created_at, updated_at)
           VALUES (:name, :category, :price, :is_available, NOW(), NOW())`,
          { replacements: item }
        );
      }
    }
  }
  console.log(`  ✅ ${items.length} plats restaurant insérés/vérifiés`);
}

// ─────────────────────────────────────────────────────────────
// 8. HÔTEL — rooms
// ─────────────────────────────────────────────────────────────
async function seedHotel() {
  console.log('\n🏨 Chambres Hôtel...');

  const [existing] = await sequelize.query(`SELECT COUNT(*) as cnt FROM rooms`);
  const count = parseInt(existing[0].cnt);
  if (count > 0 && !force) {
    console.log(`  ℹ️  ${count} chambre(s) déjà présentes — ignorées (utiliser --force pour réinitialiser)`);
    return;
  }

  const rooms = [
    { number: '101', type: 'Simple',   capacity: 1, price_per_night: 10000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: false }) },
    { number: '102', type: 'Simple',   capacity: 1, price_per_night: 10000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: false }) },
    { number: '103', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: true  }) },
    { number: '104', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: true  }) },
    { number: '105', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: true  }) },
    { number: '201', type: 'Suite',    capacity: 2, price_per_night: 25000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: true,  minibar: true }) },
    { number: '202', type: 'Suite',    capacity: 3, price_per_night: 30000, status: 'disponible', amenities: JSON.stringify({ wifi: true,  clim: true,  tv: true,  minibar: true, salon: true }) },
  ];

  for (const room of rooms) {
    const [existing2] = await sequelize.query(
      `SELECT id FROM rooms WHERE number = :number LIMIT 1`,
      { replacements: { number: room.number } }
    );
    if (existing2.length === 0) {
      await sequelize.query(
        `INSERT INTO rooms (number, type, capacity, price_per_night, status, amenities, created_at, updated_at)
         VALUES (:number, :type, :capacity, :price_per_night, :status, :amenities, NOW(), NOW())`,
        { replacements: room }
      );
    } else if (force) {
      await sequelize.query(
        `UPDATE rooms SET type = :type, capacity = :capacity, price_per_night = :price_per_night, amenities = :amenities WHERE number = :number`,
        { replacements: room }
      );
    }
  }
  console.log(`  ✅ ${rooms.length} chambres insérées/vérifiées`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Démarrage seed données de simulation...');
  if (force) console.log('⚠️  Mode --force : mise à jour des données existantes\n');
  else console.log('ℹ️  Mode normal : ajout uniquement si absent\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK\n');

    await seedPiscine();
    await seedLavageAuto();
    await seedPressing();
    await seedSuperette();
    await seedMaquis();
    await seedDepot();
    await seedRestaurant();
    await seedHotel();

    console.log('\n🎉 Seed terminé avec succès !');
    console.log('💡 Relancez avec --force pour remplacer les données existantes');
  } catch (err) {
    console.error('\n❌ Erreur seed:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();

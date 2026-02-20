const { Client } = require('pg');
require('dotenv').config();

async function checkDatabase() {
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

    // Liste des tables
    console.log('📋 TABLES CRÉÉES:');
    console.log('─'.repeat(50));
    const tables = await client.query(`
      SELECT tablename,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as colonnes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    for (const row of tables.rows) {
      const countResult = await client.query(`SELECT COUNT(*) FROM "${row.tablename}"`);
      const count = countResult.rows[0].count;
      console.log(`  • ${row.tablename.padEnd(25)} ${count} enregistrement(s)`);
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`Total: ${tables.rows.length} tables\n`);

    // Utilisateurs
    console.log('👥 UTILISATEURS:');
    console.log('─'.repeat(50));
    const users = await client.query('SELECT username, full_name, role, is_active FROM users');
    users.rows.forEach(u => {
      console.log(`  • ${u.username.padEnd(15)} | ${u.full_name.padEnd(20)} | ${u.role} | ${u.is_active ? 'Actif' : 'Inactif'}`);
    });

    // Chambres
    console.log('\n🏨 CHAMBRES:');
    console.log('─'.repeat(50));
    const rooms = await client.query('SELECT number, type, capacity, price_per_night, status FROM rooms ORDER BY number');
    rooms.rows.forEach(r => {
      console.log(`  • Chambre ${r.number} | ${r.type.padEnd(8)} | ${r.capacity} pers. | ${r.price_per_night} FCFA | ${r.status}`);
    });

    // Menu
    console.log('\n🍽️  MENU RESTAURANT:');
    console.log('─'.repeat(50));
    const menu = await client.query('SELECT name, category, price FROM menu_items ORDER BY category, name');
    let currentCat = '';
    menu.rows.forEach(m => {
      if (m.category !== currentCat) {
        currentCat = m.category;
        console.log(`  [${currentCat.toUpperCase()}]`);
      }
      console.log(`    • ${m.name.padEnd(20)} ${m.price} FCFA`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();

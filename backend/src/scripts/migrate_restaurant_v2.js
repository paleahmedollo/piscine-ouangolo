/**
 * Migration Restaurant V2 — Ollentra
 * Ajoute : restaurant_tables, restaurant_orders, restaurant_order_items, restaurant_notifications
 * Met à jour : rôles users (cuisinier, caissier)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');

const client = new Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: false
      }
);

async function migrate() {
  await client.connect();
  console.log('✅ Connecté à la base de données');

  try {
    // ─── 1. Mise à jour de l'ENUM role users ────────────────────────────────
    // NOTE: ALTER TYPE ADD VALUE ne peut pas s'exécuter dans une transaction
    console.log('🔄 Mise à jour de l\'enum role users...');
    const existingEnum = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
      ORDER BY enumsortorder
    `);
    const existing = existingEnum.rows.map(r => r.enumlabel);
    console.log('   Valeurs actuelles:', existing.join(', '));

    if (!existing.includes('cuisinier')) {
      await client.query(`ALTER TYPE enum_users_role ADD VALUE 'cuisinier'`);
      console.log('   ✅ Valeur cuisinier ajoutée');
    } else {
      console.log('   ℹ️  cuisinier déjà présent');
    }
    if (!existing.includes('caissier')) {
      await client.query(`ALTER TYPE enum_users_role ADD VALUE 'caissier'`);
      console.log('   ✅ Valeur caissier ajoutée');
    } else {
      console.log('   ℹ️  caissier déjà présent');
    }
    console.log('✅ Enum role users mis à jour');

    await client.query('BEGIN');
    console.log('✅ Rôles users mis à jour (cuisinier + caissier ajoutés)');

    // ─── 2. Table restaurant_tables ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id          SERIAL PRIMARY KEY,
        company_id  INT REFERENCES companies(id) ON DELETE CASCADE,
        numero      INT NOT NULL,
        capacite    INT NOT NULL DEFAULT 4,
        statut      VARCHAR(15) NOT NULL DEFAULT 'libre'
                    CHECK (statut IN ('libre','occupee','reservee')),
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (company_id, numero)
      );
    `);
    console.log('✅ Table restaurant_tables créée');

    // ─── 3. Table restaurant_orders ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_orders (
        id                SERIAL PRIMARY KEY,
        company_id        INT REFERENCES companies(id) ON DELETE CASCADE,
        table_id          INT REFERENCES restaurant_tables(id),
        serveuse_id       INT REFERENCES users(id),
        cuisinier_id      INT REFERENCES users(id),
        statut            VARCHAR(20) NOT NULL DEFAULT 'nouvelle'
                          CHECK (statut IN ('nouvelle','en_preparation','prete','payee','annulee')),
        temps_preparation INT CHECK (temps_preparation IN (15, 25, 45)),
        total             DECIMAL(10,2) NOT NULL DEFAULT 0,
        mode_paiement     VARCHAR(30),
        notes             TEXT,
        paid_at           TIMESTAMP,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table restaurant_orders créée');

    // ─── 4. Table restaurant_order_items ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_order_items (
        id              SERIAL PRIMARY KEY,
        order_id        INT NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
        menu_item_id    INT REFERENCES menu_items(id),
        nom_plat        VARCHAR(100) NOT NULL,
        quantite        INT NOT NULL DEFAULT 1,
        prix_unitaire   DECIMAL(10,2) NOT NULL,
        sous_total      DECIMAL(10,2) NOT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table restaurant_order_items créée');

    // ─── 5. Table restaurant_notifications ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_notifications (
        id               SERIAL PRIMARY KEY,
        company_id       INT REFERENCES companies(id) ON DELETE CASCADE,
        order_id         INT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
        destinataire_id  INT REFERENCES users(id),
        type             VARCHAR(20) NOT NULL
                         CHECK (type IN ('preparation','prete','annulee')),
        message          TEXT NOT NULL,
        is_read          BOOLEAN DEFAULT FALSE,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table restaurant_notifications créée');

    // ─── 6. Index de performance ────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ro_company ON restaurant_orders(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ro_statut ON restaurant_orders(statut);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ro_table ON restaurant_orders(table_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rn_dest ON restaurant_notifications(destinataire_id, is_read);`);
    console.log('✅ Index créés');

    await client.query('COMMIT');
    console.log('\n🎉 Migration Restaurant V2 terminée avec succès !');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur migration :', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});

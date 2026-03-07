require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const piscineRoutes = require('./routes/piscine.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const hotelRoutes = require('./routes/hotel.routes');
const eventsRoutes = require('./routes/events.routes');
const caisseRoutes = require('./routes/caisse.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usersRoutes = require('./routes/users.routes');
const employeesRoutes = require('./routes/employees.routes');
const expensesRoutes = require('./routes/expenses.routes');
const receiptsRoutes = require('./routes/receipts.routes');
const reportsRoutes = require('./routes/reports.routes');
const companiesRoutes = require('./routes/companies.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const lavageRoutes = require('./routes/lavage.routes');
const tabsRoutes = require('./routes/tabs.routes');
const maquisRoutes = require('./routes/maquis.routes');
const superetteRoutes = require('./routes/superette.routes');
const pressingRoutes = require('./routes/pressing.routes');
const depotRoutes = require('./routes/depot.routes');
const accountingRoutes = require('./routes/accounting.routes');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://ollentra.uat',
  'http://192.168.1.67',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:80',
  'http://localhost',
  process.env.FRONTEND_URL,
  process.env.RENDER_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
      return callback(null, true);
    }
    if (/\.onrender\.com$/.test(origin)) return callback(null, true);
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ─── Migration: ajout items_json à pressing_orders ────────────────────────────
(async () => {
  try {
    const { sequelize: seq } = require('./config/database');
    await seq.query(`ALTER TABLE pressing_orders ADD COLUMN IF NOT EXISTS items_json TEXT NULL`);
    console.log('✅ Migration pressing_orders.items_json OK');
  } catch (e) { console.log('Migration items_json:', e.message); }
})();

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Ouangolo opérationnelle',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/piscine', piscineRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/hotel', hotelRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/caisse', caisseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/lavage', lavageRoutes);
app.use('/api/tabs', tabsRoutes);
app.use('/api/maquis', maquisRoutes);
app.use('/api/superette', superetteRoutes);
app.use('/api/pressing', pressingRoutes);
app.use('/api/depot', depotRoutes);
app.use('/api/accounting', accountingRoutes);

const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');
const frontendIndex = path.join(frontendDist, 'index.html');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (fs.existsSync(frontendIndex)) {
      res.sendFile(frontendIndex);
    } else {
      next();
    }
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPTES PAR DÉFAUT — créés UNIQUEMENT si absents, jamais modifiés ensuite
// ─────────────────────────────────────────────────────────────────────────────

const createDefaultSuperAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  try {
    const existing = await User.findOne({ where: { username: 'superadmin' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('Gestix@2026', 10);
      await User.create({
        username: 'superadmin',
        password_hash: hashedPassword,
        full_name: 'Super Administrateur Ollentra',
        role: 'super_admin',
        is_active: true,
        company_id: null
      }, { hooks: false });
      console.log('✅ Compte superadmin créé');
    } else {
      console.log('✅ Compte superadmin OK');
    }
  } catch (error) {
    console.error('Erreur superadmin:', error);
  }
};

const createDefaultAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  try {
    const existing = await User.findOne({ where: { username: 'admin.pmdo' } })
      || await User.findOne({ where: { username: 'admin_po' } })
      || await User.findOne({ where: { username: 'admin' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('pmdo@2026', 10);
      await User.create({
        username: 'admin.pmdo',
        password_hash: hashedPassword,
        full_name: 'Administrateur',
        role: 'admin',
        is_active: true,
        company_id: 1
      }, { hooks: false });
      console.log('✅ Compte admin.pmdo créé');
    } else {
      console.log('✅ Compte admin OK');
    }
  } catch (error) {
    console.error('Erreur admin:', error);
  }
};

const createPaleAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  try {
    const existing = await User.findOne({ where: { username: 'paleadmin' } });
    if (!existing) {
      const { Company } = require('./models');
      const company = await Company.findOne({ order: [['id', 'ASC']] });
      const hashedPassword = await bcrypt.hash('PaleAdmin@2026', 10);
      await User.create({
        username: 'paleadmin',
        password_hash: hashedPassword,
        full_name: 'Pale Ahmed - Administrateur Général',
        role: 'admin',
        is_active: true,
        company_id: company ? company.id : null
      }, { hooks: false });
      console.log('✅ Compte paleadmin créé');
    } else {
      console.log('✅ Compte paleadmin OK');
    }
  } catch (error) {
    console.error('Erreur paleadmin:', error);
  }
};

const createDefaultGerant = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  try {
    const existing = await User.findOne({ where: { username: 'gerant.pmdo' } })
      || await User.findOne({ where: { username: 'gerant_po' } })
      || await User.findOne({ where: { username: 'gerant' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('pmdo@2026', 10);
      await User.create({
        username: 'gerant.pmdo',
        password_hash: hashedPassword,
        full_name: 'Gérant Principal',
        role: 'gerant',
        is_active: true,
        company_id: 1
      }, { hooks: false });
      console.log('✅ Compte gerant.pmdo créé');
    } else {
      console.log('✅ Compte gérant OK');
    }
  } catch (error) {
    console.error('Erreur gérant:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATIONS
// ─────────────────────────────────────────────────────────────────────────────
const runMigrations = async () => {
  try {
    const migrations = [
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'cdi'`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS end_contract_date DATE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_type VARCHAR(50)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number VARCHAR(100)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_issue_date DATE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_expiry_date DATE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_issued_by VARCHAR(255)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Ivoirienne'`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS room_number VARCHAR(10)`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ferme'`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_operator VARCHAR(20)`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(200)`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT true`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_operator VARCHAR(20)`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(200)`,
      `ALTER TABLE incidents ADD COLUMN IF NOT EXISTS photo_url TEXT`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cni_number VARCHAR(50)`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS origin_city VARCHAR(100)`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS destination_city VARCHAR(100)`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_operator VARCHAR(20)`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(200)`,
      `CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(50) UNIQUE NOT NULL, address TEXT, phone VARCHAR(50), email VARCHAR(255), logo_url TEXT, plan VARCHAR(50) DEFAULT 'basic', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE incidents ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE user_layouts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`,
      `ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS service_type VARCHAR(50)`,
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_service_type') THEN
           ALTER TYPE "enum_products_service_type" ADD VALUE IF NOT EXISTS 'depot';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_menu_items_category') THEN
           ALTER TABLE menu_items ALTER COLUMN category TYPE VARCHAR(100) USING category::text;
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tab_items_service_type') THEN
           ALTER TABLE tab_items ALTER COLUMN service_type TYPE VARCHAR(30) USING service_type::text;
         END IF;
       END $$`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS locality VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Côte d''Ivoire'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(50)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'actif'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_start DATE`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end DATE`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY, ticket_number VARCHAR(20) UNIQUE NOT NULL,
        company_id INTEGER REFERENCES companies(id), user_id INTEGER REFERENCES users(id),
        category VARCHAR(50) NOT NULL DEFAULT 'assistance', title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL, attachment_url TEXT, priority VARCHAR(20) NOT NULL DEFAULT 'moyenne',
        status VARCHAR(30) NOT NULL DEFAULT 'ouvert', assigned_to INTEGER REFERENCES users(id),
        opened_at TIMESTAMPTZ DEFAULT NOW(), resolved_at TIMESTAMPTZ, resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY, invoice_number VARCHAR(30) UNIQUE NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id), amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'XOF', description TEXT, plan VARCHAR(50),
        period_start DATE, period_end DATE, status VARCHAR(20) NOT NULL DEFAULT 'impayee',
        due_date DATE, paid_at TIMESTAMPTZ, payment_method VARCHAR(50),
        payment_reference VARCHAR(200), notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS saas_subscriptions (
        id SERIAL PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id),
        plan VARCHAR(50) NOT NULL DEFAULT 'basic', price DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'XOF', billing_cycle VARCHAR(20) DEFAULT 'mensuel',
        start_date DATE NOT NULL, end_date DATE, next_billing_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'actif', auto_renew BOOLEAN DEFAULT true, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
        company_id INTEGER REFERENCES companies(id), action VARCHAR(100) NOT NULL,
        module VARCHAR(50), entity_type VARCHAR(50), entity_id INTEGER, details JSONB,
        ip_address VARCHAR(45), user_agent TEXT, status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS vehicle_types (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL,
        price DECIMAL(12,0) NOT NULL DEFAULT 0, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS customer_tabs (
        id SERIAL PRIMARY KEY, customer_name VARCHAR(150) NOT NULL,
        customer_info VARCHAR(255), status VARCHAR(20) DEFAULT 'ouvert',
        total_amount DECIMAL(12,0) DEFAULT 0, payment_method VARCHAR(50),
        payment_operator VARCHAR(50), payment_reference VARCHAR(200),
        user_id INTEGER, notes TEXT, closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS car_washes (
        id SERIAL PRIMARY KEY, vehicle_type_id INTEGER, plate_number VARCHAR(30),
        customer_name VARCHAR(150), customer_phone VARCHAR(30),
        amount DECIMAL(12,0) NOT NULL, payment_method VARCHAR(50),
        payment_operator VARCHAR(50), payment_reference VARCHAR(200),
        status VARCHAR(20) DEFAULT 'paye', tab_id INTEGER, user_id INTEGER, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS tab_items (
        id SERIAL PRIMARY KEY, tab_id INTEGER NOT NULL, service_type VARCHAR(30) NOT NULL,
        item_name VARCHAR(200) NOT NULL, quantity DECIMAL(12,2) DEFAULT 1,
        unit_price DECIMAL(12,0) DEFAULT 0, subtotal DECIMAL(12,0) DEFAULT 0,
        reference_id INTEGER, notes VARCHAR(255), created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, contact VARCHAR(200),
        phone VARCHAR(50), address TEXT, service_type VARCHAR(20) DEFAULT 'both',
        is_active BOOLEAN DEFAULT true, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, category VARCHAR(100) NOT NULL,
        service_type VARCHAR(20) NOT NULL, buy_price DECIMAL(12,0) DEFAULT 0,
        sell_price DECIMAL(12,0) NOT NULL DEFAULT 0, unit VARCHAR(50) DEFAULT 'unité',
        current_stock DECIMAL(12,2) DEFAULT 0, min_stock DECIMAL(12,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true, description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL, type VARCHAR(10) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL, unit_price DECIMAL(12,0) DEFAULT 0,
        reason VARCHAR(200), reference_id INTEGER, reference_type VARCHAR(50),
        user_id INTEGER, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY, supplier_id INTEGER, service_type VARCHAR(20) NOT NULL,
        total_amount DECIMAL(12,0) DEFAULT 0, payment_method VARCHAR(50) DEFAULT 'especes',
        notes TEXT, user_id INTEGER, purchase_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY, purchase_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
        quantity DECIMAL(12,2) NOT NULL, unit_price DECIMAL(12,0) DEFAULT 0,
        subtotal DECIMAL(12,0) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS pressing_types (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL,
        price DECIMAL(12,0) NOT NULL DEFAULT 0, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS pressing_orders (
        id SERIAL PRIMARY KEY, pressing_type_id INTEGER, customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(30), quantity INTEGER DEFAULT 1, amount DECIMAL(12,0) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'especes', payment_operator VARCHAR(50),
        payment_reference VARCHAR(200), tab_id INTEGER, user_id INTEGER,
        status VARCHAR(20) DEFAULT 'paye', notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS depot_clients (
        id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(50),
        address TEXT, credit_balance DECIMAL(12,0) DEFAULT 0, notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS depot_sales (
        id SERIAL PRIMARY KEY, depot_client_id INTEGER NOT NULL,
        total_amount DECIMAL(12,0) DEFAULT 0, payment_method VARCHAR(50) DEFAULT 'especes',
        payment_operator VARCHAR(50), payment_reference VARCHAR(200),
        tab_id INTEGER, user_id INTEGER, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS depot_sale_items (
        id SERIAL PRIMARY KEY, depot_sale_id INTEGER NOT NULL,
        product_id INTEGER, product_name VARCHAR(200), quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,0) DEFAULT 0, subtotal DECIMAL(12,0) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS cash_shortages (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, date DATE NOT NULL,
        expected_amount DECIMAL(12,0) DEFAULT 0, actual_amount DECIMAL(12,0) DEFAULT 0,
        shortage_amount DECIMAL(12,0) DEFAULT 0, status VARCHAR(20) DEFAULT 'en_attente',
        deducted_from_payroll_id INTEGER, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]'`,
      // Encaissement multi-modules + type commande restaurant
      `ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'table'`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS module VARCHAR(30)`,
      `ALTER TABLE depot_sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paye'`,
      `ALTER TABLE depot_sales ADD COLUMN IF NOT EXISTS client_name VARCHAR(100)`,
      `ALTER TABLE depot_sales ADD COLUMN IF NOT EXISTS items_json JSONB`
    ];
    for (const sql of migrations) {
      await sequelize.query(sql);
    }
    console.log('✅ Migrations appliquées (pressing, dépôt, manquants, modules entreprises)');
  } catch (error) {
    console.error('Erreur migration:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DONNÉES PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────
const seedDefaultData = async () => {
  try {
    const insertIfMissing = async (table, nameCol, rows) => {
      for (const row of rows) {
        const cols = Object.keys(row).join(', ');
        const vals = Object.keys(row).map(k => `'${String(row[k]).replace(/'/g, "''")}'`).join(', ');
        await sequelize.query(
          `INSERT INTO ${table} (${cols}, created_at, updated_at)
           SELECT ${vals}, NOW(), NOW()
           WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${nameCol} = '${String(row[nameCol]).replace(/'/g, "''")}') `
        );
      }
    };

    const psPrices = [
      { key: 'ticket_adulte', value: 2000, label: 'Ticket adulte' },
      { key: 'ticket_enfant', value: 1000, label: 'Ticket enfant' },
      { key: 'abonnement_mensuel', value: 25000, label: 'Abonnement mensuel' },
      { key: 'abonnement_trimestriel', value: 60000, label: 'Abonnement trimestriel' },
      { key: 'abonnement_annuel', value: 200000, label: 'Abonnement annuel' },
    ];
    for (const p of psPrices) {
      await sequelize.query(
        `INSERT INTO price_settings (key, value, label, updated_at) VALUES (:key,:value,:label,NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, label=EXCLUDED.label, updated_at=NOW()`,
        { replacements: p }
      );
    }

    await insertIfMissing('vehicle_types', 'name', [
      { name: 'Moto / Vélo', price: 500, is_active: true },
      { name: 'Voiture petite berline', price: 1500, is_active: true },
      { name: 'Voiture standard', price: 2000, is_active: true },
      { name: '4x4 / SUV', price: 3000, is_active: true },
      { name: 'Camionnette / Pick-up', price: 3500, is_active: true },
      { name: 'Minibus / Camion léger', price: 5000, is_active: true },
      { name: 'Lavage complet (intérieur + extérieur)', price: 3500, is_active: true },
      { name: 'Nettoyage siège unique', price: 500, is_active: true },
    ]);

    await insertIfMissing('pressing_types', 'name', [
      { name: 'T-Shirt / Maillot', price: 300, is_active: true },
      { name: 'Chemise', price: 500, is_active: true },
      { name: 'Pantalon', price: 500, is_active: true },
      { name: 'Jupe', price: 500, is_active: true },
      { name: 'Robe simple', price: 1000, is_active: true },
      { name: 'Robe de soirée', price: 2000, is_active: true },
      { name: 'Veste / Blazer', price: 1500, is_active: true },
      { name: 'Costume complet (2 pièces)', price: 2500, is_active: true },
      { name: 'Habit traditionnel', price: 2000, is_active: true },
      { name: 'Boubou grand', price: 2500, is_active: true },
      { name: 'Nettoyage à sec — standard', price: 2000, is_active: true },
      { name: 'Couverture / Drap', price: 1500, is_active: true },
      { name: 'Rideau (le mètre)', price: 1000, is_active: true },
      { name: 'Repassage seul', price: 300, is_active: true },
      { name: 'Lavage + Repassage', price: 800, is_active: true },
    ]);

    await insertIfMissing('products', 'name', [
      { name: 'Eau minérale 0,5L', category: 'Boissons', service_type: 'superette', buy_price: 200, sell_price: 350, unit: 'bouteille', current_stock: 48, min_stock: 12, is_active: true },
      { name: 'Eau minérale 1,5L', category: 'Boissons', service_type: 'superette', buy_price: 350, sell_price: 500, unit: 'bouteille', current_stock: 36, min_stock: 10, is_active: true },
      { name: 'Coca-Cola 33cl', category: 'Boissons', service_type: 'superette', buy_price: 400, sell_price: 600, unit: 'canette', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Fanta Orange 33cl', category: 'Boissons', service_type: 'superette', buy_price: 400, sell_price: 600, unit: 'canette', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Jus de fruit 1L', category: 'Boissons', service_type: 'superette', buy_price: 600, sell_price: 900, unit: 'litre', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Lait concentré sucré', category: 'Épicerie', service_type: 'superette', buy_price: 450, sell_price: 650, unit: 'boite', current_stock: 30, min_stock: 10, is_active: true },
      { name: 'Riz parfumé (kg)', category: 'Épicerie', service_type: 'superette', buy_price: 400, sell_price: 600, unit: 'kg', current_stock: 50, min_stock: 10, is_active: true },
      { name: 'Huile végétale 1L', category: 'Épicerie', service_type: 'superette', buy_price: 1000, sell_price: 1500, unit: 'litre', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Sucre (kg)', category: 'Épicerie', service_type: 'superette', buy_price: 450, sell_price: 650, unit: 'kg', current_stock: 25, min_stock: 5, is_active: true },
      { name: 'Sel (kg)', category: 'Épicerie', service_type: 'superette', buy_price: 150, sell_price: 250, unit: 'kg', current_stock: 10, min_stock: 3, is_active: true },
      { name: 'Pâtes alimentaires', category: 'Épicerie', service_type: 'superette', buy_price: 200, sell_price: 350, unit: 'paquet', current_stock: 30, min_stock: 8, is_active: true },
      { name: 'Tomate concentrée', category: 'Épicerie', service_type: 'superette', buy_price: 300, sell_price: 500, unit: 'boite', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Sardines en conserve', category: 'Conserves', service_type: 'superette', buy_price: 600, sell_price: 900, unit: 'boite', current_stock: 18, min_stock: 6, is_active: true },
      { name: 'Boeuf en conserve', category: 'Conserves', service_type: 'superette', buy_price: 900, sell_price: 1300, unit: 'boite', current_stock: 12, min_stock: 4, is_active: true },
      { name: 'Savon de ménage', category: 'Hygiene et Menage', service_type: 'superette', buy_price: 200, sell_price: 350, unit: 'barre', current_stock: 40, min_stock: 10, is_active: true },
      { name: 'Lessive (kg)', category: 'Hygiene et Menage', service_type: 'superette', buy_price: 700, sell_price: 1000, unit: 'kg', current_stock: 15, min_stock: 4, is_active: true },
      { name: 'Eau de Javel 1L', category: 'Hygiene et Menage', service_type: 'superette', buy_price: 500, sell_price: 750, unit: 'litre', current_stock: 12, min_stock: 4, is_active: true },
      { name: 'Papier hygiénique', category: 'Hygiene et Menage', service_type: 'superette', buy_price: 300, sell_price: 500, unit: 'rouleau', current_stock: 30, min_stock: 8, is_active: true },
      { name: 'Biscuits (paquet)', category: 'Snacks', service_type: 'superette', buy_price: 200, sell_price: 350, unit: 'paquet', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Chips (sachet)', category: 'Snacks', service_type: 'superette', buy_price: 150, sell_price: 250, unit: 'sachet', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Bière Castel 65cl', category: 'Bieres', service_type: 'maquis', buy_price: 600, sell_price: 1000, unit: 'bouteille', current_stock: 48, min_stock: 12, is_active: true },
      { name: 'Bière Solibra 65cl', category: 'Bieres', service_type: 'maquis', buy_price: 600, sell_price: 1000, unit: 'bouteille', current_stock: 48, min_stock: 12, is_active: true },
      { name: 'Bière Flag 33cl', category: 'Bieres', service_type: 'maquis', buy_price: 400, sell_price: 700, unit: 'bouteille', current_stock: 36, min_stock: 10, is_active: true },
      { name: 'Bière Heineken 33cl', category: 'Bieres', service_type: 'maquis', buy_price: 700, sell_price: 1200, unit: 'bouteille', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Eau piscine 0,5L', category: 'Softs', service_type: 'maquis', buy_price: 200, sell_price: 500, unit: 'bouteille', current_stock: 36, min_stock: 10, is_active: true },
      { name: 'Coca-Cola bar 33cl', category: 'Softs', service_type: 'maquis', buy_price: 400, sell_price: 700, unit: 'bouteille', current_stock: 30, min_stock: 8, is_active: true },
      { name: 'Fanta bar 33cl', category: 'Softs', service_type: 'maquis', buy_price: 400, sell_price: 700, unit: 'bouteille', current_stock: 30, min_stock: 8, is_active: true },
      { name: 'Sprite 33cl', category: 'Softs', service_type: 'maquis', buy_price: 400, sell_price: 700, unit: 'bouteille', current_stock: 24, min_stock: 6, is_active: true },
      { name: 'Jus de bissap maison', category: 'Softs', service_type: 'maquis', buy_price: 100, sell_price: 500, unit: 'verre', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Gnamakoudji gingembre', category: 'Softs', service_type: 'maquis', buy_price: 100, sell_price: 500, unit: 'verre', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Vin rouge (verre)', category: 'Vins', service_type: 'maquis', buy_price: 400, sell_price: 1000, unit: 'verre', current_stock: 10, min_stock: 3, is_active: true },
      { name: 'Pastis Whisky (verre)', category: 'Alcools', service_type: 'maquis', buy_price: 500, sell_price: 1500, unit: 'verre', current_stock: 10, min_stock: 3, is_active: true },
      { name: 'Attiéké Poisson braisé', category: 'Plats', service_type: 'maquis', buy_price: 800, sell_price: 2000, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Riz sauce graine', category: 'Plats', service_type: 'maquis', buy_price: 600, sell_price: 1500, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Alloco banane frite', category: 'Plats', service_type: 'maquis', buy_price: 200, sell_price: 500, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Brochettes de boeuf', category: 'Grillades', service_type: 'maquis', buy_price: 500, sell_price: 1500, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Poulet braisé demi', category: 'Grillades', service_type: 'maquis', buy_price: 2000, sell_price: 4000, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Garba attiéké thon', category: 'Plats', service_type: 'maquis', buy_price: 400, sell_price: 1000, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Foutou banane sauce', category: 'Plats', service_type: 'maquis', buy_price: 700, sell_price: 1500, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Omelette simple', category: 'Plats', service_type: 'maquis', buy_price: 300, sell_price: 700, unit: 'portion', current_stock: 0, min_stock: 0, is_active: true },
      { name: 'Casier bière Castel 65cl 12 btl', category: 'Bieres', service_type: 'depot', buy_price: 6500, sell_price: 8000, unit: 'casier', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Casier bière Solibra 65cl 12 btl', category: 'Bieres', service_type: 'depot', buy_price: 6500, sell_price: 8000, unit: 'casier', current_stock: 20, min_stock: 5, is_active: true },
      { name: 'Casier Flag 33cl 24 btl', category: 'Bieres', service_type: 'depot', buy_price: 7000, sell_price: 9000, unit: 'casier', current_stock: 15, min_stock: 4, is_active: true },
      { name: 'Casier Coca-Cola 33cl 24 btl', category: 'Softs', service_type: 'depot', buy_price: 7500, sell_price: 10000, unit: 'casier', current_stock: 10, min_stock: 3, is_active: true },
      { name: 'Casier Fanta 33cl 24 btl', category: 'Softs', service_type: 'depot', buy_price: 7500, sell_price: 10000, unit: 'casier', current_stock: 10, min_stock: 3, is_active: true },
      { name: 'Pack eau 0,5L 24 btl', category: 'Eau', service_type: 'depot', buy_price: 3500, sell_price: 5000, unit: 'carton', current_stock: 25, min_stock: 8, is_active: true },
      { name: 'Pack eau 1,5L 12 btl', category: 'Eau', service_type: 'depot', buy_price: 3000, sell_price: 4500, unit: 'carton', current_stock: 20, min_stock: 6, is_active: true },
      { name: 'Carton jus de fruit 1L 12 btl', category: 'Jus', service_type: 'depot', buy_price: 5500, sell_price: 8000, unit: 'carton', current_stock: 12, min_stock: 4, is_active: true },
      { name: 'Sac riz 50kg', category: 'Alimentation', service_type: 'depot', buy_price: 18000, sell_price: 22000, unit: 'sac', current_stock: 10, min_stock: 2, is_active: true },
      { name: 'Bidon huile végétale 20L', category: 'Alimentation', service_type: 'depot', buy_price: 18000, sell_price: 23000, unit: 'bidon', current_stock: 8, min_stock: 2, is_active: true },
      { name: 'Carton savon 72 barres', category: 'Menage', service_type: 'depot', buy_price: 9000, sell_price: 12000, unit: 'carton', current_stock: 5, min_stock: 2, is_active: true },
    ]);

    await insertIfMissing('depot_clients', 'name', [
      { name: 'Bar Chez Maman Adjoua', phone: '0701234567', address: 'Quartier Commerce, Ouangolodougou', credit_balance: 0, is_active: true },
      { name: 'Maquis La Détente', phone: '0770123456', address: 'Centre-ville, Ouangolodougou', credit_balance: 0, is_active: true },
      { name: 'Restaurant Le Bivouac', phone: '0585432100', address: 'Route de Korhogo, Ouangolodougou', credit_balance: 0, is_active: true },
      { name: 'Boutique Modou', phone: '0787654321', address: 'Marché central, Ouangolodougou', credit_balance: 0, is_active: true },
      { name: 'Epicerie du Carrefour', phone: '0707654321', address: 'Carrefour principal, Ouangolodougou', credit_balance: 0, is_active: true },
    ]);

    await insertIfMissing('menu_items', 'name', [
      { name: 'Salade verte', category: 'Entrées', price: 1000, is_available: true },
      { name: 'Salade tomates-oignons', category: 'Entrées', price: 1000, is_available: true },
      { name: 'Soupe de légumes', category: 'Entrées', price: 1500, is_available: true },
      { name: 'Riz sauté au poulet', category: 'Plats', price: 3500, is_available: true },
      { name: 'Riz sauce tomate', category: 'Plats', price: 2500, is_available: true },
      { name: 'Riz sauce graine restaurant', category: 'Plats', price: 3000, is_available: true },
      { name: 'Attiéké poisson braisé', category: 'Plats', price: 3000, is_available: true },
      { name: 'Attiéké poulet braisé', category: 'Plats', price: 3500, is_available: true },
      { name: 'Foutou banane arachide', category: 'Plats', price: 2500, is_available: true },
      { name: 'Pâtes à la bolognaise', category: 'Plats', price: 3000, is_available: true },
      { name: 'Poulet rôti demi', category: 'Grillades', price: 5000, is_available: true },
      { name: 'Brochettes boeuf restaurant', category: 'Grillades', price: 3000, is_available: true },
      { name: 'Poisson entier grillé', category: 'Grillades', price: 4000, is_available: true },
      { name: 'Salade de fruits frais', category: 'Desserts', price: 1500, is_available: true },
      { name: 'Glace 2 boules', category: 'Desserts', price: 1000, is_available: true },
      { name: 'Eau restaurant 0,5L', category: 'Boissons', price: 500, is_available: true },
      { name: 'Jus de fruits pressés', category: 'Boissons', price: 1500, is_available: true },
      { name: 'Coca-Cola restaurant 33cl', category: 'Boissons', price: 700, is_available: true },
      { name: 'Café ou Thé', category: 'Boissons', price: 500, is_available: true },
    ]);

    const hotelRooms = [
      { number: '101', type: 'Simple', capacity: 1, price_per_night: 10000, status: 'disponible' },
      { number: '102', type: 'Simple', capacity: 1, price_per_night: 10000, status: 'disponible' },
      { number: '103', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible' },
      { number: '104', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible' },
      { number: '105', type: 'Standard', capacity: 2, price_per_night: 15000, status: 'disponible' },
      { number: '201', type: 'Suite', capacity: 2, price_per_night: 25000, status: 'disponible' },
      { number: '202', type: 'Suite', capacity: 3, price_per_night: 30000, status: 'disponible' },
    ];
    for (const room of hotelRooms) {
      await sequelize.query(
        `INSERT INTO rooms (number, type, capacity, price_per_night, status, created_at, updated_at)
         SELECT :number, :type, :capacity, :price_per_night, :status, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE number = :number)`,
        { replacements: room }
      );
    }

    console.log('✅ Données par défaut vérifiées/insérées (prix, types, produits, restaurant, hôtel)');
  } catch (err) {
    console.error('⚠️  Erreur seedDefaultData:', err.message);
  }
};

const createDefaultCompany = async () => {
  const { Company } = require('./models');
  try {
    const count = await Company.count();
    if (count === 0) {
      await Company.create({
        name: 'Piscine de Ouangolo',
        code: 'OUANGOLO',
        address: 'Ouangolodougou, Côte d\'Ivoire',
        plan: 'basic',
        is_active: true
      });
      console.log('✅ Entreprise par défaut créée');
    } else {
      console.log(`✅ ${count} entreprise(s) existante(s) — OK`);
    }
  } catch (error) {
    console.error('Erreur entreprise par défaut:', error.message);
  }
};

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized (tables créées si manquantes)');
    await runMigrations();
    await createDefaultCompany();
    await createDefaultSuperAdmin();
    await createDefaultAdmin();
    await createDefaultGerant();
    await createPaleAdmin();
    await seedDefaultData();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

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
// Nouveaux modules
const lavageRoutes = require('./routes/lavage.routes');
const tabsRoutes = require('./routes/tabs.routes');
const maquisRoutes = require('./routes/maquis.routes');
const superetteRoutes = require('./routes/superette.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares — CORS : accepte gestix.uat, IP locale, localhost et Render
const allowedOrigins = [
  'http://gestix.uat',
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

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Anti-cache pour toutes les routes API
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Ouangolo opérationnelle',
    timestamp: new Date().toISOString()
  });
});

// API Routes
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
// Nouveaux modules
app.use('/api/lavage', lavageRoutes);
app.use('/api/tabs', tabsRoutes);
app.use('/api/maquis', maquisRoutes);
app.use('/api/superette', superetteRoutes);

// Servir le frontend React si le dossier dist existe (mode local)
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Create (or repair) superadmin account at every startup
const createDefaultSuperAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  const SUPERADMIN_PASSWORD = 'Gestix@2024';
  try {
    const existing = await User.findOne({ where: { username: 'superadmin' } });
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    if (!existing) {
      // Création initiale — hooks: false évite le double-hashage
      await User.create({
        username: 'superadmin',
        password_hash: hashedPassword,
        full_name: 'Super Administrateur Gestix',
        role: 'super_admin',
        is_active: true,
        company_id: null
      }, { hooks: false });
      console.log('✅ Compte superadmin créé (password: Gestix@2024)');
    } else {
      // Vérifier si le mot de passe fonctionne RÉELLEMENT (détecte le double-hashage)
      const passwordWorks = await bcrypt.compare(SUPERADMIN_PASSWORD, existing.password_hash);
      if (!passwordWorks || !existing.is_active || existing.role !== 'super_admin') {
        // Hash invalide (double-hashé ou corrompu) → forcer la correction
        await User.update(
          { password_hash: hashedPassword, is_active: true, role: 'super_admin' },
          { where: { username: 'superadmin' }, hooks: false }
        );
        console.log('🔧 Compte superadmin réparé (hash corrigé définitivement)');
      } else {
        console.log('✅ Compte superadmin OK');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création/réparation du superadmin:', error);
  }
};

// Create default admin account if not exists
const createDefaultAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');

  try {
    // Chercher par le nouveau nom (admin_po) ou l'ancien (admin) pour la rétrocompatibilité
    const existingAdmin = await User.findOne({ where: { username: 'admin_po' } })
      || await User.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin_po',
        password_hash: hashedPassword,
        full_name: 'Administrateur',
        role: 'admin',
        is_active: true,
        company_id: 1
      }, { hooks: false });
      console.log('✅ Compte admin par défaut créé (username: admin_po, password: admin123)');
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte admin:', error);
  }
};

// Create paleadmin (Pale Ahmed) account — accès total à tous les menus
const createPaleAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  const PALEADMIN_PASSWORD = 'pheno@2308';
  try {
    const existing = await User.findOne({ where: { username: 'paleadmin' } });
    const hashedPassword = await bcrypt.hash(PALEADMIN_PASSWORD, 10);
    if (!existing) {
      // Récupérer le premier company_id disponible
      const { Company } = require('./models');
      const company = await Company.findOne({ order: [['id', 'ASC']] });
      await User.create({
        username: 'paleadmin',
        password_hash: hashedPassword,
        full_name: 'Pale Ahmed - Administrateur Général',
        role: 'admin',
        is_active: true,
        company_id: company ? company.id : null
      }, { hooks: false });
      console.log('✅ Compte paleadmin créé (password: pheno@2308)');
    } else {
      // Vérifier si le mot de passe fonctionne RÉELLEMENT (détecte le double-hashage)
      const passwordWorks = await bcrypt.compare(PALEADMIN_PASSWORD, existing.password_hash);
      if (!passwordWorks || !existing.is_active) {
        await User.update(
          { password_hash: hashedPassword, is_active: true },
          { where: { username: 'paleadmin' }, hooks: false }
        );
        console.log('🔧 Compte paleadmin réparé (hash corrigé définitivement)');
      } else {
        console.log('✅ Compte paleadmin OK');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte paleadmin:', error);
  }
};

// Create default gerant account if not exists
const createDefaultGerant = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');

  try {
    const existingGerant = await User.findOne({ where: { username: 'gerant_po' } })
      || await User.findOne({ where: { username: 'gerant' } });
    if (!existingGerant) {
      const hashedPassword = await bcrypt.hash('gerant123', 10);
      await User.create({
        username: 'gerant_po',
        password_hash: hashedPassword,
        full_name: 'Gérant Principal',
        role: 'gerant',
        is_active: true,
        company_id: 1
      }, { hooks: false });
      console.log('✅ Compte gérant par défaut créé (username: gerant_po, password: gerant123)');
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte gérant:', error);
  }
};

// Run database migrations (safe - IF NOT EXISTS)
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
      // Nouvelles colonnes Company (superadmin)
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS locality VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Côte d''Ivoire'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(50)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'actif'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_start DATE`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end DATE`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT`,
      // Nouvelles tables superadmin
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        user_id INTEGER REFERENCES users(id),
        category VARCHAR(50) NOT NULL DEFAULT 'assistance',
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        attachment_url TEXT,
        priority VARCHAR(20) NOT NULL DEFAULT 'moyenne',
        status VARCHAR(30) NOT NULL DEFAULT 'ouvert',
        assigned_to INTEGER REFERENCES users(id),
        opened_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(30) UNIQUE NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'XOF',
        description TEXT,
        plan VARCHAR(50),
        period_start DATE,
        period_end DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'impayee',
        due_date DATE,
        paid_at TIMESTAMPTZ,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS saas_subscriptions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        plan VARCHAR(50) NOT NULL DEFAULT 'basic',
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'XOF',
        billing_cycle VARCHAR(20) DEFAULT 'mensuel',
        start_date DATE NOT NULL,
        end_date DATE,
        next_billing_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'actif',
        auto_renew BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        company_id INTEGER REFERENCES companies(id),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // ── Lavage Auto (PostgreSQL) ──────────────────────────────
      `CREATE TABLE IF NOT EXISTS vehicle_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(12,0) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_tabs (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        customer_info VARCHAR(255),
        status VARCHAR(20) DEFAULT 'ouvert',
        total_amount DECIMAL(12,0) DEFAULT 0,
        payment_method VARCHAR(50),
        payment_operator VARCHAR(50),
        payment_reference VARCHAR(200),
        user_id INTEGER,
        notes TEXT,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS car_washes (
        id SERIAL PRIMARY KEY,
        vehicle_type_id INTEGER,
        plate_number VARCHAR(30),
        customer_name VARCHAR(150),
        customer_phone VARCHAR(30),
        amount DECIMAL(12,0) NOT NULL,
        payment_method VARCHAR(50),
        payment_operator VARCHAR(50),
        payment_reference VARCHAR(200),
        status VARCHAR(20) DEFAULT 'paye',
        tab_id INTEGER,
        user_id INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS tab_items (
        id SERIAL PRIMARY KEY,
        tab_id INTEGER NOT NULL,
        service_type VARCHAR(30) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        quantity DECIMAL(12,2) DEFAULT 1,
        unit_price DECIMAL(12,0) DEFAULT 0,
        subtotal DECIMAL(12,0) DEFAULT 0,
        reference_id INTEGER,
        notes VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // ── Produits maquis / supérette ───────────────────────────
      `CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact VARCHAR(200),
        phone VARCHAR(50),
        address TEXT,
        service_type VARCHAR(20) DEFAULT 'both',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        service_type VARCHAR(20) NOT NULL,
        buy_price DECIMAL(12,0) DEFAULT 0,
        sell_price DECIMAL(12,0) NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'unité',
        current_stock DECIMAL(12,2) DEFAULT 0,
        min_stock DECIMAL(12,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        type VARCHAR(10) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,0) DEFAULT 0,
        reason VARCHAR(200),
        reference_id INTEGER,
        reference_type VARCHAR(50),
        user_id INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER,
        service_type VARCHAR(20) NOT NULL,
        total_amount DECIMAL(12,0) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'especes',
        notes TEXT,
        user_id INTEGER,
        purchase_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,0) DEFAULT 0,
        subtotal DECIMAL(12,0) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ];
    for (const sql of migrations) {
      await sequelize.query(sql);
    }
    // Insert default vehicle types if table is empty
    const [vtRows] = await sequelize.query('SELECT COUNT(*) as cnt FROM vehicle_types');
    if (parseInt(vtRows[0].cnt) === 0) {
      await sequelize.query(`INSERT INTO vehicle_types (name, price) VALUES
        ('Moto', 500), ('Tricycle', 750), ('Voiture', 1000), ('Camion', 2000), ('Bus', 2500)`);
      console.log('✅ Types de véhicules par défaut créés');
    }
    console.log('✅ Migrations appliquées (employees, sales, lavage, tabs, produits, stock, fournisseurs)');
  } catch (error) {
    console.error('Erreur migration:', error.message);
  }
};

// Create default company (id=1) if no company exists
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
      console.log('✅ Entreprise par défaut créée (Piscine de Ouangolo, id=1)');
    } else {
      console.log(`✅ ${count} entreprise(s) existante(s) — OK`);
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise par défaut:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync models — crée les tables manquantes sans toucher aux données existantes
    // force: false = jamais de DROP, alter: false = jamais de modification de colonnes
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized (tables créées si manquantes)');

    // Run migrations (ajoute colonnes et tables manquantes)
    await runMigrations();

    // Create default company first (les comptes admin en dépendent)
    await createDefaultCompany();

    // Create default accounts
    await createDefaultSuperAdmin();
    await createDefaultAdmin();
    await createDefaultGerant();
    await createPaleAdmin();

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

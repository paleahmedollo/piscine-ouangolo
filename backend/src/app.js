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
// Nouveaux modules
const lavageRoutes = require('./routes/lavage.routes');
const tabsRoutes = require('./routes/tabs.routes');
const maquisRoutes = require('./routes/maquis.routes');
const superetteRoutes = require('./routes/superette.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Create default admin account if not exists
const createDefaultAdmin = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');

  try {
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'Administrateur',
        role: 'admin',
        is_active: true
      }, { hooks: false });
      console.log('✅ Compte admin par défaut créé (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte admin:', error);
  }
};

// Create default gerant account if not exists
const createDefaultGerant = async () => {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');

  try {
    const existingGerant = await User.findOne({ where: { username: 'gerant' } });
    if (!existingGerant) {
      // Hasher le mot de passe manuellement et desactiver les hooks pour eviter le double hashage
      const hashedPassword = await bcrypt.hash('gerant123', 10);
      await User.create({
        username: 'gerant',
        password_hash: hashedPassword,
        full_name: 'Gérant Principal',
        role: 'gerant',
        is_active: true
      }, { hooks: false });
      console.log('✅ Compte gérant par défaut créé (username: gerant, password: gerant123)');
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
      // ── Lavage Auto ──────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS vehicle_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(12,0) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS car_washes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_type_id INT NOT NULL,
        plate_number VARCHAR(30),
        customer_name VARCHAR(150),
        customer_phone VARCHAR(30),
        amount DECIMAL(12,0) NOT NULL,
        payment_method VARCHAR(50),
        payment_operator VARCHAR(50),
        payment_reference VARCHAR(200),
        status ENUM('paye','en_attente','tab') DEFAULT 'paye',
        tab_id INT,
        user_id INT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // ── Onglets clients (cross-service) ──────────────────────
      `CREATE TABLE IF NOT EXISTS customer_tabs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        customer_info VARCHAR(255),
        status ENUM('ouvert','ferme') DEFAULT 'ouvert',
        total_amount DECIMAL(12,0) DEFAULT 0,
        payment_method VARCHAR(50),
        payment_operator VARCHAR(50),
        payment_reference VARCHAR(200),
        user_id INT,
        notes TEXT,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tab_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tab_id INT NOT NULL,
        service_type ENUM('lavage','maquis','superette','restaurant') NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        quantity DECIMAL(12,2) DEFAULT 1,
        unit_price DECIMAL(12,0) DEFAULT 0,
        subtotal DECIMAL(12,0) DEFAULT 0,
        reference_id INT,
        notes VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      // ── Produits (maquis + superette) ─────────────────────────
      `CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        service_type ENUM('maquis','superette') NOT NULL,
        buy_price DECIMAL(12,0) DEFAULT 0,
        sell_price DECIMAL(12,0) NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'unité',
        current_stock DECIMAL(12,2) DEFAULT 0,
        min_stock DECIMAL(12,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        type ENUM('IN','OUT') NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,0) DEFAULT 0,
        reason VARCHAR(200),
        reference_id INT,
        reference_type VARCHAR(50),
        user_id INT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      // ── Fournisseurs ──────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact VARCHAR(200),
        phone VARCHAR(50),
        address TEXT,
        service_type ENUM('maquis','superette','both') DEFAULT 'both',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT,
        service_type ENUM('maquis','superette') NOT NULL,
        total_amount DECIMAL(12,0) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'especes',
        notes TEXT,
        user_id INT,
        purchase_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,0) DEFAULT 0,
        subtotal DECIMAL(12,0) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Tables are managed via setupDb.js script - no auto sync in production
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');
    } else {
      console.log('✅ Production mode - skipping sync');
    }

    // Run migrations
    await runMigrations();

    // Create default accounts
    await createDefaultAdmin();
    await createDefaultGerant();

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

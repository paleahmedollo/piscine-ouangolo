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

// Servir le frontend React (production)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA catch-all: toutes les routes non-API renvoient index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// 404 handler (pour les routes /api non trouvees)
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
    // TEMPORARY RESET - force reset admin password
    const hashedPassword = await bcrypt.hash('Admin2024', 10);
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await User.create({
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'Administrateur',
        role: 'admin',
        is_active: true
      }, { hooks: false });
      console.log('✅ Compte admin créé (username: admin, password: Admin2024)');
    } else {
      await User.update({ password_hash: hashedPassword }, { where: { username: 'admin' }, hooks: false });
      console.log('✅ Mot de passe admin réinitialisé (Admin2024)');
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
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT`
    ];
    for (const sql of migrations) {
      await sequelize.query(sql);
    }
    console.log('✅ Migrations employees appliquées');
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

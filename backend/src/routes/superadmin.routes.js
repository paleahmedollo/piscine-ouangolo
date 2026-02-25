const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middlewares/auth.middleware');
const {
  // Dashboard
  getDashboardStats,
  // Users
  getAllUsers, createUser, updateUser, resetUserPassword, deleteUser,
  // Subscriptions
  getSubscriptions, createSubscription, updateSubscription,
  // Billing
  getInvoices, createInvoice, updateInvoice, getInvoiceStats,
  // Support Tickets
  getTickets, createTicket, updateTicket, getTicketStats,
  // Reports
  getReports,
  // Settings
  getSettings, updateSettings,
  // Logs
  getSystemLogs, getAuditLogs
} = require('../controllers/superadmin.controller');

// Toutes les routes superadmin nécessitent auth + rôle super_admin
router.use(authenticateToken);
router.use(requireSuperAdmin);

// ─── 1. Tableau de bord ────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ─── 3. Utilisateurs ───────────────────────────────────
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

// ─── 4. Abonnements ────────────────────────────────────
router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/:id', updateSubscription);

// ─── 5. Facturation ────────────────────────────────────
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.get('/invoices-stats', getInvoiceStats);

// ─── 6. Assistance (Billets) ───────────────────────────
router.get('/tickets', getTickets);
router.post('/tickets', createTicket);
router.put('/tickets/:id', updateTicket);
router.get('/tickets-stats', getTicketStats);

// ─── 7. Rapports ───────────────────────────────────────
router.get('/reports', getReports);

// ─── 8. Paramètres ─────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ─── 9. Journaux système ───────────────────────────────
router.get('/logs', getSystemLogs);
router.get('/audit', getAuditLogs);

module.exports = router;

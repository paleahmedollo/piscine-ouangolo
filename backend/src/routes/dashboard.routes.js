const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { canAccessModule, isDirecteur } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);

// Dashboard accessible selon le rôle
router.get('/', dashboardController.getDashboard);

// Rapports (directeur et maire)
router.get('/reports', canAccessModule('dashboard'), dashboardController.getReports);

// Audit logs (directeur uniquement)
router.get('/audit', isDirecteur, dashboardController.getAuditLogs);

module.exports = router;

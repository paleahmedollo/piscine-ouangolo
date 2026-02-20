const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

// Rapports accessibles a tous les utilisateurs authentifies
// Le filtrage par role/module/user est fait dans le controller
router.get('/transactions', reportsController.getTransactionsReport);
router.get('/summary', reportsController.getSummaryReport);
router.get('/users', reportsController.getReportUsers);

// Layouts personnalises - accessibles a tous les utilisateurs authentifies
router.get('/layouts', reportsController.getUserLayouts);
router.post('/layouts', reportsController.createLayout);
router.put('/layouts/:id', reportsController.updateLayout);
router.delete('/layouts/:id', reportsController.deleteLayout);

module.exports = router;

const express = require('express');
const router = express.Router();
const caisseController = require('../controllers/caisse.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule, isDirecteur } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);
router.use(canAccessModule('caisse'));

// Routes pour tous les utilisateurs autorisés
router.post('/close', checkPermission('caisse', 'cloture_propre'), caisseController.closeCashRegister);
router.get('/expected', checkPermission('caisse', 'cloture_propre'), caisseController.getExpectedAmount);
router.get('/employees/:module', checkPermission('caisse', 'validation'), caisseController.getEmployeesByModule);
router.get('/', checkPermission('caisse', 'lecture'), caisseController.getCashRegisters);
router.get('/stats', checkPermission('caisse', 'lecture'), caisseController.getCaisseStats);

// Routes directeur uniquement
router.get('/pending', isDirecteur, caisseController.getPendingCashRegisters);
router.get('/:id', checkPermission('caisse', 'lecture'), caisseController.getCashRegisterById);
router.put('/:id/validate', checkPermission('caisse', 'validation'), caisseController.validateCashRegister);

module.exports = router;

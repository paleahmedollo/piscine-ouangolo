const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receipts.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule } = require('../middlewares/rbac.middleware');

router.use(authenticateToken);
router.use(canAccessModule('caisse'));

// Lister les reçus
router.get('/', checkPermission('caisse', 'lecture'), receiptsController.getReceipts);

// Récupérer un reçu par ID
router.get('/:id', checkPermission('caisse', 'lecture'), receiptsController.getReceiptById);

// Récupérer un reçu par clôture de caisse
router.get('/by-cash-register/:cashRegisterId', checkPermission('caisse', 'lecture'), receiptsController.getReceiptByCashRegister);

// Données formatées pour impression
router.get('/:id/print', checkPermission('caisse', 'lecture'), receiptsController.getReceiptForPrint);

module.exports = router;

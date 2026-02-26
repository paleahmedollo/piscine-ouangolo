const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getClients, createClient, updateClient,
  getProducts, createProduct, updateProduct, receiveStock,
  createSale, getSales,
  payCredit,
  getDepotStats
} = require('../controllers/depot.controller');

router.use(authenticateToken);

// Clients
router.get('/clients', getClients);
router.post('/clients', createClient);
router.put('/clients/:id', updateClient);

// Produits
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.post('/stock/receive', receiveStock);

// Ventes
router.post('/sales', createSale);
router.get('/sales', getSales);

// Crédit
router.post('/pay-credit', payCredit);

// Stats
router.get('/stats', getDepotStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getClients, createClient, updateClient,
  getProducts, createProduct, updateProduct, receiveStock,
  createSale, getSales,
  payCredit,
  getDepotStats,
  getSuppliers, createSupplier, updateSupplier,
  getOrders, createOrder, receiveOrder, payOrder, cancelOrder,
  getPendingSales, payDepotSale
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

// Fournisseurs
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);

// Commandes fournisseurs
router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.post('/orders/:id/receive', receiveOrder);
router.post('/orders/:id/pay', payOrder);
router.post('/orders/:id/cancel', cancelOrder);

// Tickets en attente (Encaissement caisse)
router.get('/sales/pending', getPendingSales);
router.put('/sales/:id/pay', payDepotSale);

module.exports = router;

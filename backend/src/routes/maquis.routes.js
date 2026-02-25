const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getProducts, createProduct, updateProduct, deleteProduct,
  createOrder, getStock, getStockMovements, addStock, getPurchases,
  getSuppliers, createSupplier, updateSupplier,
  getMaquisStats
} = require('../controllers/maquis.controller');

router.use(authenticateToken);

// Stats
router.get('/stats', getMaquisStats);

// Produits
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Ventes
router.post('/orders', createOrder);

// Stock
router.get('/stock', getStock);
router.get('/stock/movements', getStockMovements);
router.post('/stock/add', addStock);

// Approvisionnements
router.get('/purchases', getPurchases);

// Fournisseurs
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getProducts, createProduct, updateProduct, deleteProduct,
  createSale, getStock, getStockMovements, adjustStock,
  addStock, getPurchases,
  getSuppliers, createSupplier, updateSupplier,
  getSuperetteStats
} = require('../controllers/superette.controller');

router.use(authenticateToken);

// Stats
router.get('/stats', getSuperetteStats);

// Produits
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Ventes (caisse)
router.post('/sales', createSale);

// Stock
router.get('/stock', getStock);
router.get('/stock/movements', getStockMovements);
router.post('/stock/add', addStock);
router.post('/stock/adjust', adjustStock);

// Approvisionnements
router.get('/purchases', getPurchases);

// Fournisseurs
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);

module.exports = router;

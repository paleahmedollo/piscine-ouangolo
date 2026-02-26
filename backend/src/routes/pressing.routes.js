const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getPressingTypes, getAllPressingTypes,
  createPressingType, updatePressingType, deletePressingType,
  createOrder, getOrders, getPressingStats
} = require('../controllers/pressing.controller');

router.use(authenticateToken);

// Types de pressing
router.get('/types', getPressingTypes);
router.get('/types/all', getAllPressingTypes);
router.post('/types', createPressingType);
router.put('/types/:id', updatePressingType);
router.delete('/types/:id', deletePressingType);

// Commandes
router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/stats', getPressingStats);

module.exports = router;

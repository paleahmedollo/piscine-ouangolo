const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType,
  createCarWash, getCarWashes, getLavageStats
} = require('../controllers/lavage.controller');

router.use(authenticateToken);

// Types de véhicules
router.get('/vehicle-types', getVehicleTypes);
router.post('/vehicle-types', createVehicleType);
router.put('/vehicle-types/:id', updateVehicleType);
router.delete('/vehicle-types/:id', deleteVehicleType);

// Lavages
router.post('/washes', createCarWash);
router.get('/washes', getCarWashes);
router.get('/stats', getLavageStats);

module.exports = router;

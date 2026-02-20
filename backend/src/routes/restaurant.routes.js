const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule, isDirecteur } = require('../middlewares/rbac.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);
router.use(canAccessModule('restaurant'));

// Menu (lecture pour tous, modification pour directeur)
router.get('/menu', restaurantController.getMenu);
router.post('/menu', isDirecteur, restaurantController.createMenuItem);
router.put('/menu/:id', isDirecteur, restaurantController.updateMenuItem);
router.delete('/menu/:id', isDirecteur, restaurantController.deleteMenuItem);
router.put('/menu/:id/availability', checkPermission('restaurant', 'ventes'), restaurantController.toggleAvailability);

// Ventes
router.post('/sales', checkPermission('restaurant', 'ventes'), restaurantController.createSale);
router.get('/sales', checkPermission('restaurant', 'lecture'), restaurantController.getSales);
router.get('/sales/stats', checkPermission('restaurant', 'lecture'), restaurantController.getSaleStats);
router.get('/sales/:id', checkPermission('restaurant', 'lecture'), restaurantController.getSaleById);

module.exports = router;

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');
const tablesCtrl = require('../controllers/restaurantTables.controller');
const ordersCtrl = require('../controllers/restaurantOrders.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { checkPermission, canAccessModule, isDirecteur, isGerant } = require('../middlewares/rbac.middleware');

// Authentification obligatoire
router.use(authenticateToken);
router.use(canAccessModule('restaurant'));

// ── Menu ──────────────────────────────────────────────────────────────────────
router.get('/menu', restaurantController.getMenu);
router.post('/menu', isDirecteur, restaurantController.createMenuItem);
router.put('/menu/:id', isDirecteur, restaurantController.updateMenuItem);
router.delete('/menu/:id', isDirecteur, restaurantController.deleteMenuItem);
router.put('/menu/:id/availability', checkPermission('restaurant', 'ventes'), restaurantController.toggleAvailability);

// ── Ventes (ancien système, conservé) ────────────────────────────────────────
router.post('/sales', checkPermission('restaurant', 'ventes'), restaurantController.createSale);
router.get('/sales/open', checkPermission('restaurant', 'lecture'), restaurantController.getOpenSales);
router.put('/sales/:id/close', checkPermission('restaurant', 'ventes'), restaurantController.closeSale);
router.get('/sales', checkPermission('restaurant', 'lecture'), restaurantController.getSales);
router.get('/sales/stats', checkPermission('restaurant', 'lecture'), restaurantController.getSaleStats);
router.get('/sales/:id', checkPermission('restaurant', 'lecture'), restaurantController.getSaleById);

// Facturation chambre hôtel
router.get('/bills/room/:roomNumber', checkPermission('restaurant', 'lecture'), restaurantController.getRoomBill);
router.put('/bills/room/:roomNumber/close', checkPermission('restaurant', 'ventes'), restaurantController.closeRoomSales);

// ── Tables ────────────────────────────────────────────────────────────────────
router.get('/tables', tablesCtrl.getTables);
router.post('/tables', isGerant, tablesCtrl.createTable);
router.put('/tables/:id', isGerant, tablesCtrl.updateTable);
router.put('/tables/:id/status', checkPermission('restaurant', 'gestion_tables'), tablesCtrl.updateTableStatus);
router.delete('/tables/:id', isGerant, tablesCtrl.deleteTable);

// ── Commandes V2 ──────────────────────────────────────────────────────────────
// Stats caisse en premier (avant :id pour éviter le conflit de route)
router.get('/orders/stats/caisse', checkPermission('restaurant', 'lecture'), ordersCtrl.getCaisseStats);
router.get('/orders/active', checkPermission('restaurant', 'lecture'), ordersCtrl.getActiveOrders);
router.get('/orders', checkPermission('restaurant', 'lecture'), ordersCtrl.getOrders);
router.get('/orders/:id', checkPermission('restaurant', 'lecture'), ordersCtrl.getOrderById);
router.post('/orders', checkPermission('restaurant', 'ventes'), ordersCtrl.createOrder);

// ── Workflow cuisine ───────────────────────────────────────────────────────────
router.put('/orders/:id/acknowledge', checkPermission('cuisine', 'gestion_commandes'), ordersCtrl.acknowledgeOrder);
router.put('/orders/:id/ready', checkPermission('cuisine', 'gestion_commandes'), ordersCtrl.markReady);

// ── Paiement caissière ────────────────────────────────────────────────────────
router.put('/orders/:id/pay', checkPermission('restaurant', 'ventes'), ordersCtrl.payOrder);

// ── Notifications (polling toutes les 5s) ─────────────────────────────────────
router.get('/notifications', ordersCtrl.getNotifications);
router.put('/notifications/read', ordersCtrl.markNotificationsRead);

module.exports = router;
